-- ============================================================
-- ANTIGRAVITY — PostgreSQL Schema v2
-- Extended: Locations (TR 81 il), AI, Pricing, Digital Twin
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- fuzzy search

-- ─── Locations (81 İl + İlçeler) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    il_kodu     VARCHAR(3) NOT NULL,            -- '34', '06' etc.
    il_adi      VARCHAR(100) NOT NULL,
    ilce_adi    VARCHAR(100),                   -- NULL = il kaydı
    full_name   VARCHAR(200) GENERATED ALWAYS AS (
                    CASE WHEN ilce_adi IS NOT NULL
                    THEN il_adi || ' / ' || ilce_adi
                    ELSE il_adi END
                ) STORED,
    lat         DECIMAL(9,6),
    lon         DECIMAL(9,6),
    population  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_il ON locations(il_kodu);
CREATE INDEX idx_locations_il_adi ON locations(il_adi);
CREATE INDEX idx_locations_ilce ON locations(ilce_adi) WHERE ilce_adi IS NOT NULL;
CREATE INDEX idx_locations_fullname_trgm ON locations USING gin(full_name gin_trgm_ops);
CREATE INDEX idx_locations_il_adi_trgm  ON locations USING gin(il_adi  gin_trgm_ops);

-- ─── Users ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    avatar_url      TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ─── User Preferences (Safety-Match & AI) ────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    interests       TEXT[] DEFAULT '{}',        -- ['Yazılım', 'Sanat', 'Spor']
    travel_style    VARCHAR(50) DEFAULT 'solo', -- solo | couple | family | group
    seat_preference VARCHAR(20) DEFAULT 'window', -- window | aisle | no_preference
    gender_pref     VARCHAR(10),               -- male | female | null
    preferred_companies UUID[] DEFAULT '{}',
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Companies ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    logo_url    TEXT,
    rating      NUMERIC(3,2) DEFAULT 4.0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO companies (name, rating) VALUES
    ('Metro Turizm',    4.8),
    ('Pamukkale Turizm',4.6),
    ('Kamil Koç',       4.7),
    ('Ulusoy',          4.9),
    ('Varan Turizm',    4.5),
    ('OBilet Express',  4.4),
    ('Süha Turizm',     4.3),
    ('Has Turizm',      4.2),
    ('Niğde Garaj',     4.1),
    ('Lüks Karadeniz',  4.6)
ON CONFLICT DO NOTHING;

-- ─── Trips ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id),
    from_location_id UUID REFERENCES locations(id),  -- NEW: FK
    to_location_id   UUID REFERENCES locations(id),  -- NEW: FK
    from_city       VARCHAR(100) NOT NULL,            -- legacy compat
    to_city         VARCHAR(100) NOT NULL,            -- legacy compat
    departure_time  TIMESTAMPTZ NOT NULL,
    arrival_time    TIMESTAMPTZ NOT NULL,
    duration_min    INTEGER NOT NULL,
    total_seats     INTEGER NOT NULL DEFAULT 40,
    bus_type        VARCHAR(50) DEFAULT 'Standart',  -- Standart | Comfort | VIP
    amenities       TEXT[] DEFAULT '{}',             -- ['wifi','klima','usb']
    base_price      NUMERIC(10,2) NOT NULL,
    current_price   NUMERIC(10,2),                   -- Dynamic pricing override
    search_count    INTEGER DEFAULT 0,               -- Kafka search event counter
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Computed current_price default
ALTER TABLE trips
    ALTER COLUMN current_price SET DEFAULT NULL;

-- Critical indexes
CREATE INDEX idx_trips_route_date  ON trips(from_city, to_city, departure_time);
CREATE INDEX idx_trips_departure   ON trips(departure_time);
CREATE INDEX idx_trips_price       ON trips(base_price);
CREATE INDEX idx_trips_location    ON trips(from_location_id, to_location_id);
CREATE INDEX idx_trips_from_trgm   ON trips USING gin(from_city gin_trgm_ops);
CREATE INDEX idx_trips_to_trgm     ON trips USING gin(to_city   gin_trgm_ops);

-- ─── Trip Price History (Dynamic Pricing Log) ────────────────────
CREATE TABLE IF NOT EXISTS trip_price_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id     UUID REFERENCES trips(id) ON DELETE CASCADE,
    old_price   NUMERIC(10,2) NOT NULL,
    new_price   NUMERIC(10,2) NOT NULL,
    reason      VARCHAR(100) DEFAULT 'demand',  -- demand | low_demand | promo
    delta_pct   NUMERIC(5,2),                   -- e.g. +7.5 or -5.0
    changed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_trip ON trip_price_history(trip_id, changed_at DESC);

-- ─── Seats ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seats (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id         UUID REFERENCES trips(id) ON DELETE CASCADE,
    seat_number     INTEGER NOT NULL,
    status          VARCHAR(20) DEFAULT 'available',  -- available | locked | sold
    gender_pref     VARCHAR(10),                       -- male | female | null
    locked_by       UUID REFERENCES users(id),
    locked_until    TIMESTAMPTZ,
    booking_id      UUID,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_id, seat_number)
);

CREATE INDEX idx_seats_trip_status ON seats(trip_id, status);
CREATE INDEX idx_seats_lock_expiry ON seats(locked_until) WHERE status = 'locked';

-- ─── Bookings ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id),
    trip_id         UUID REFERENCES trips(id),
    seat_numbers    INTEGER[] NOT NULL,
    passenger_data  JSONB NOT NULL DEFAULT '[]',
    status          VARCHAR(30) DEFAULT 'pending',
        -- pending | confirmed | cancelled | expired
    total_price     NUMERIC(10,2) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    confirmed_at    TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_user   ON bookings(user_id);
CREATE INDEX idx_bookings_trip   ON bookings(trip_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_expiry ON bookings(expires_at) WHERE status = 'pending';

-- ─── Payments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID REFERENCES bookings(id),
    user_id         UUID REFERENCES users(id),
    amount          NUMERIC(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'TRY',
    method          VARCHAR(30) DEFAULT 'card',  -- card | wallet | installment
    status          VARCHAR(20) DEFAULT 'pending',
    provider_ref    VARCHAR(255),
    card_last4      VARCHAR(4),
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status  ON payments(status);

-- ─── Tickets ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_no       VARCHAR(20) UNIQUE NOT NULL,
    booking_id      UUID REFERENCES bookings(id),
    user_id         UUID REFERENCES users(id),
    trip_id         UUID REFERENCES trips(id),
    seat_number     INTEGER NOT NULL,
    passenger_name  VARCHAR(255) NOT NULL,
    passenger_tc    VARCHAR(11),
    qr_code         TEXT,
    barcode         VARCHAR(50),
    status          VARCHAR(20) DEFAULT 'valid',  -- valid | used | cancelled
    issued_at       TIMESTAMPTZ DEFAULT NOW(),
    used_at         TIMESTAMPTZ
);

CREATE INDEX idx_tickets_booking ON tickets(booking_id);
CREATE INDEX idx_tickets_no      ON tickets(ticket_no);
CREATE UNIQUE INDEX idx_tickets_unique_seat ON tickets(trip_id, seat_number)
    WHERE status = 'valid';

-- ─── Digital Wallet Cards (Biyometrik Bilet) ─────────────────────
CREATE TABLE IF NOT EXISTS digital_wallet_cards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id       UUID UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
    booking_id      UUID REFERENCES bookings(id),
    card_gradient   VARCHAR(200) DEFAULT 'linear-gradient(135deg,#667eea,#764ba2)',
    qr_data         TEXT,                       -- JSON encoded ticket info
    hologram_seed   VARCHAR(100),               -- random seed for holo animation
    issued_at       TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);

-- ─── AI Conversation History ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  VARCHAR(100) NOT NULL,
    user_id     UUID REFERENCES users(id),
    role        VARCHAR(20) NOT NULL,  -- user | assistant
    content     TEXT NOT NULL,
    trip_ids    UUID[] DEFAULT '{}',   -- trips recommended in this message
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conv_session ON ai_conversations(session_id, created_at);

-- ─── Kafka Event Log (Audit Trail) ───────────────────────────────
CREATE TABLE IF NOT EXISTS event_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id    VARCHAR(100) UNIQUE NOT NULL,
    event_type  VARCHAR(100) NOT NULL,
    source      VARCHAR(100),
    payload     JSONB,
    processed   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_type    ON event_log(event_type);
CREATE INDEX idx_events_created ON event_log(created_at);

-- ─── Dynamic Pricing Function ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_trip_price(
    p_trip_id UUID,
    p_delta   NUMERIC  -- positive = increase, negative = decrease
)
RETURNS NUMERIC AS $$
DECLARE
    v_base      NUMERIC;
    v_current   NUMERIC;
    v_new_price NUMERIC;
    v_min_price NUMERIC;
    v_max_price NUMERIC;
BEGIN
    SELECT base_price, COALESCE(current_price, base_price)
    INTO v_base, v_current
    FROM trips WHERE id = p_trip_id FOR UPDATE;

    v_min_price := v_base * 0.80;  -- Max %20 indirim
    v_max_price := v_base * 1.50;  -- Max %50 artış

    v_new_price := v_current * (1 + p_delta / 100.0);
    v_new_price := GREATEST(v_min_price, LEAST(v_max_price, v_new_price));
    v_new_price := ROUND(v_new_price, 2);

    UPDATE trips SET current_price = v_new_price
    WHERE id = p_trip_id;

    INSERT INTO trip_price_history (trip_id, old_price, new_price, delta_pct,
        reason)
    VALUES (p_trip_id, v_current, v_new_price, p_delta,
        CASE WHEN p_delta > 0 THEN 'demand' ELSE 'low_demand' END);

    RETURN v_new_price;
END;
$$ LANGUAGE plpgsql;

-- ─── Auto-expire seat locks ───────────────────────────────────────
CREATE OR REPLACE FUNCTION release_expired_seat_locks()
RETURNS void AS $$
BEGIN
    UPDATE seats
    SET status = 'available', locked_by = NULL, locked_until = NULL
    WHERE status = 'locked' AND locked_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- ─── Updated_at auto-update trigger ──────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_seats_updated_at
    BEFORE UPDATE ON seats
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
