-- ============================================================
-- ANTIGRAVITY — Örnek Sefer Verisi Seeder
-- 50+ rota, 7 gün, dinamik koltuk oluşturma
-- ============================================================

DO $$
DECLARE
    metro_id        UUID;
    pamukkale_id    UUID;
    kamil_id        UUID;
    ulusoy_id       UUID;
    varan_id        UUID;
    obilet_id       UUID;
    sus_id          UUID;
    has_id          UUID;
    lks_id          UUID;
    trip_id         UUID;
BEGIN

SELECT id INTO metro_id     FROM companies WHERE name = 'Metro Turizm'     LIMIT 1;
SELECT id INTO pamukkale_id FROM companies WHERE name = 'Pamukkale Turizm' LIMIT 1;
SELECT id INTO kamil_id     FROM companies WHERE name = 'Kamil Koç'        LIMIT 1;
SELECT id INTO ulusoy_id    FROM companies WHERE name = 'Ulusoy'           LIMIT 1;
SELECT id INTO varan_id     FROM companies WHERE name = 'Varan Turizm'     LIMIT 1;
SELECT id INTO obilet_id    FROM companies WHERE name = 'OBilet Express'   LIMIT 1;
SELECT id INTO sus_id       FROM companies WHERE name = 'Süha Turizm'      LIMIT 1;
SELECT id INTO has_id       FROM companies WHERE name = 'Has Turizm'       LIMIT 1;
SELECT id INTO lks_id       FROM companies WHERE name = 'Lüks Karadeniz'   LIMIT 1;

-- ─── İstanbul → Ankara (çok sıklık)
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(metro_id,     'İstanbul','Ankara', NOW()+INTERVAL '2 hours',  NOW()+INTERVAL '8 hours',  360, 390.00, 'VIP',      ARRAY['wifi','klima','usb','yemek']),
(ulusoy_id,    'İstanbul','Ankara', NOW()+INTERVAL '4 hours',  NOW()+INTERVAL '10 hours', 360, 350.00, 'Comfort',  ARRAY['wifi','klima','usb']),
(kamil_id,     'İstanbul','Ankara', NOW()+INTERVAL '6 hours',  NOW()+INTERVAL '12 hours', 360, 320.00, 'Standart', ARRAY['klima']),
(varan_id,     'İstanbul','Ankara', NOW()+INTERVAL '8 hours',  NOW()+INTERVAL '14 hours', 360, 340.00, 'Comfort',  ARRAY['wifi','klima']),
(metro_id,     'İstanbul','Ankara', NOW()+INTERVAL '1 day 2 hours', NOW()+INTERVAL '1 day 8 hours', 360, 395.00, 'VIP', ARRAY['wifi','klima','usb','yemek']),
(pamukkale_id, 'İstanbul','Ankara', NOW()+INTERVAL '1 day 6 hours', NOW()+INTERVAL '1 day 12 hours',360, 310.00,'Standart',ARRAY['klima']),
(obilet_id,    'İstanbul','Ankara', NOW()+INTERVAL '2 days',   NOW()+INTERVAL '2 days 6 hours', 360, 300.00, 'Standart', ARRAY['klima']),
(metro_id,     'İstanbul','Ankara', NOW()+INTERVAL '3 days',   NOW()+INTERVAL '3 days 6 hours', 360, 420.00, 'VIP',    ARRAY['wifi','klima','usb','yemek']);

-- ─── İstanbul → İzmir
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(pamukkale_id, 'İstanbul','İzmir', NOW()+INTERVAL '3 hours',  NOW()+INTERVAL '9 hours',  360, 280.00, 'Comfort',  ARRAY['wifi','klima']),
(metro_id,     'İstanbul','İzmir', NOW()+INTERVAL '5 hours',  NOW()+INTERVAL '11 hours', 360, 310.00, 'VIP',      ARRAY['wifi','klima','usb','yemek']),
(kamil_id,     'İstanbul','İzmir', NOW()+INTERVAL '7 hours',  NOW()+INTERVAL '13 hours', 360, 260.00, 'Standart', ARRAY['klima']),
(ulusoy_id,    'İstanbul','İzmir', NOW()+INTERVAL '1 day 4 hours', NOW()+INTERVAL '1 day 10 hours', 360, 295.00, 'Comfort', ARRAY['wifi','klima']);

-- ─── İstanbul → Antalya
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(metro_id,     'İstanbul','Antalya', NOW()+INTERVAL '1 hour',   NOW()+INTERVAL '10 hours', 540, 420.00, 'VIP',     ARRAY['wifi','klima','usb','yemek']),
(pamukkale_id, 'İstanbul','Antalya', NOW()+INTERVAL '8 hours',  NOW()+INTERVAL '17 hours', 540, 360.00, 'Comfort', ARRAY['wifi','klima']),
(kamil_id,     'İstanbul','Antalya', NOW()+INTERVAL '2 days 3 hours', NOW()+INTERVAL '2 days 12 hours', 540, 330.00, 'Standart', ARRAY['klima']),
(ulusoy_id,    'İstanbul','Antalya', NOW()+INTERVAL '3 days',   NOW()+INTERVAL '3 days 9 hours', 540, 395.00, 'Comfort', ARRAY['wifi','klima','usb']);

-- ─── İstanbul → Bodrum
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(pamukkale_id, 'İstanbul','Bodrum', NOW()+INTERVAL '2 hours',  NOW()+INTERVAL '13 hours', 660, 480.00, 'Comfort', ARRAY['wifi','klima','usb']),
(metro_id,     'İstanbul','Bodrum', NOW()+INTERVAL '6 hours',  NOW()+INTERVAL '17 hours', 660, 520.00, 'VIP',     ARRAY['wifi','klima','usb','yemek']),
(sus_id,       'İstanbul','Bodrum', NOW()+INTERVAL '1 day 1 hour', NOW()+INTERVAL '1 day 12 hours', 660, 440.00, 'Comfort', ARRAY['wifi','klima']);

-- ─── İstanbul → Trabzon
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(lks_id,    'İstanbul','Trabzon', NOW()+INTERVAL '5 hours',  NOW()+INTERVAL '17 hours', 720, 450.00, 'Comfort', ARRAY['wifi','klima']),
(metro_id,  'İstanbul','Trabzon', NOW()+INTERVAL '1 day 2 hours', NOW()+INTERVAL '1 day 14 hours', 720, 490.00, 'VIP', ARRAY['wifi','klima','usb','yemek']),
(has_id,    'İstanbul','Trabzon', NOW()+INTERVAL '2 days 5 hours', NOW()+INTERVAL '2 days 17 hours', 720, 420.00, 'Standart', ARRAY['klima']);

-- ─── Ankara → İzmir
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(kamil_id,     'Ankara','İzmir', NOW()+INTERVAL '3 hours',  NOW()+INTERVAL '11 hours', 480, 280.00, 'Comfort', ARRAY['wifi','klima']),
(pamukkale_id, 'Ankara','İzmir', NOW()+INTERVAL '7 hours',  NOW()+INTERVAL '15 hours', 480, 250.00, 'Standart',ARRAY['klima']),
(metro_id,     'Ankara','İzmir', NOW()+INTERVAL '2 days',   NOW()+INTERVAL '2 days 8 hours', 480, 310.00, 'VIP', ARRAY['wifi','klima','usb','yemek']);

-- ─── Ankara → Antalya
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(metro_id,     'Ankara','Antalya', NOW()+INTERVAL '4 hours',  NOW()+INTERVAL '12 hours', 480, 220.00, 'VIP',     ARRAY['wifi','klima','usb','yemek']),
(pamukkale_id, 'Ankara','Antalya', NOW()+INTERVAL '8 hours',  NOW()+INTERVAL '16 hours', 480, 190.00, 'Standart',ARRAY['klima']),
(ulusoy_id,    'Ankara','Antalya', NOW()+INTERVAL '1 day 3 hours', NOW()+INTERVAL '1 day 11 hours', 480, 210.00, 'Comfort', ARRAY['wifi','klima']);

-- ─── İzmir → Bodrum
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(pamukkale_id, 'İzmir','Bodrum', NOW()+INTERVAL '2 hours',  NOW()+INTERVAL '6 hours',  240, 180.00, 'Comfort', ARRAY['wifi','klima']),
(metro_id,     'İzmir','Bodrum', NOW()+INTERVAL '5 hours',  NOW()+INTERVAL '9 hours',  240, 210.00, 'VIP',     ARRAY['wifi','klima','usb']),
(sus_id,       'İzmir','Bodrum', NOW()+INTERVAL '1 day',    NOW()+INTERVAL '1 day 4 hours', 240, 165.00, 'Standart', ARRAY['klima']);

-- ─── İzmir → Marmaris
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(pamukkale_id, 'İzmir','Marmaris', NOW()+INTERVAL '3 hours',  NOW()+INTERVAL '7 hours 30 min', 270, 195.00, 'Comfort', ARRAY['wifi','klima']),
(sus_id,       'İzmir','Marmaris', NOW()+INTERVAL '6 hours',  NOW()+INTERVAL '10 hours 30 min',270, 175.00, 'Standart',ARRAY['klima']);

-- ─── İzmir → Fethiye
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(pamukkale_id, 'İzmir','Fethiye', NOW()+INTERVAL '4 hours',  NOW()+INTERVAL '10 hours', 360, 220.00, 'Comfort', ARRAY['wifi','klima']),
(metro_id,     'İzmir','Fethiye', NOW()+INTERVAL '2 days 3 hours', NOW()+INTERVAL '2 days 9 hours', 360, 250.00, 'VIP', ARRAY['wifi','klima','usb']);

-- ─── Ankara → Trabzon
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(lks_id,   'Ankara','Trabzon', NOW()+INTERVAL '6 hours',  NOW()+INTERVAL '14 hours', 480, 280.00, 'Comfort', ARRAY['wifi','klima']),
(metro_id, 'Ankara','Trabzon', NOW()+INTERVAL '1 day 8 hours', NOW()+INTERVAL '1 day 16 hours', 480, 310.00, 'VIP', ARRAY['wifi','klima','usb','yemek']);

-- ─── Ankara → Diyarbakır
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(metro_id, 'Ankara','Diyarbakır', NOW()+INTERVAL '5 hours', NOW()+INTERVAL '16 hours', 660, 350.00, 'Comfort', ARRAY['wifi','klima']),
(has_id,   'Ankara','Diyarbakır', NOW()+INTERVAL '2 days 1 hour', NOW()+INTERVAL '2 days 12 hours', 660, 310.00, 'Standart', ARRAY['klima']);

-- ─── Ankara → Konya
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(metro_id,  'Ankara','Konya', NOW()+INTERVAL '1 hour',  NOW()+INTERVAL '3 hours 30 min',  150, 120.00, 'Comfort',  ARRAY['wifi','klima']),
(kamil_id,  'Ankara','Konya', NOW()+INTERVAL '3 hours', NOW()+INTERVAL '5 hours 30 min',  150, 100.00, 'Standart', ARRAY['klima']),
(ulusoy_id, 'Ankara','Konya', NOW()+INTERVAL '1 day',   NOW()+INTERVAL '1 day 2 hours 30 min', 150, 110.00, 'Comfort', ARRAY['wifi','klima']);

-- ─── İstanbul → Bursa
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(metro_id,  'İstanbul','Bursa', NOW()+INTERVAL '1 hour',  NOW()+INTERVAL '4 hours', 180, 150.00, 'VIP',      ARRAY['wifi','klima','usb']),
(kamil_id,  'İstanbul','Bursa', NOW()+INTERVAL '2 hours', NOW()+INTERVAL '5 hours', 180, 120.00, 'Standart', ARRAY['klima']),
(pamukkale_id,'İstanbul','Bursa',NOW()+INTERVAL '4 hours',NOW()+INTERVAL '7 hours', 180, 130.00, 'Comfort',  ARRAY['wifi','klima']);

-- ─── Konya → Antalya
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(metro_id,     'Konya','Antalya', NOW()+INTERVAL '2 hours', NOW()+INTERVAL '7 hours', 300, 180.00, 'Comfort', ARRAY['wifi','klima']),
(pamukkale_id, 'Konya','Antalya', NOW()+INTERVAL '5 hours', NOW()+INTERVAL '10 hours',300, 155.00, 'Standart',ARRAY['klima']);

-- ─── Samsun → Trabzon
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(lks_id, 'Samsun','Trabzon', NOW()+INTERVAL '1 hour',  NOW()+INTERVAL '4 hours 30 min', 210, 95.00, 'Comfort',  ARRAY['wifi','klima']),
(has_id, 'Samsun','Trabzon', NOW()+INTERVAL '3 hours', NOW()+INTERVAL '6 hours 30 min', 210, 80.00, 'Standart', ARRAY['klima']);

-- ─── Erzurum → Trabzon
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(lks_id, 'Erzurum','Trabzon', NOW()+INTERVAL '2 hours', NOW()+INTERVAL '7 hours', 300, 130.00, 'Comfort', ARRAY['wifi','klima']);

-- ─── İstanbul → Gaziantep
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(metro_id, 'İstanbul','Gaziantep', NOW()+INTERVAL '3 hours', NOW()+INTERVAL '16 hours', 780, 520.00, 'VIP',     ARRAY['wifi','klima','usb','yemek']),
(has_id,   'İstanbul','Gaziantep', NOW()+INTERVAL '2 days 2 hours', NOW()+INTERVAL '2 days 15 hours', 780, 450.00, 'Comfort', ARRAY['wifi','klima']);

-- ─── İstanbul → Muğla
INSERT INTO trips (company_id, from_city, to_city, departure_time, arrival_time, duration_min, base_price, bus_type, amenities)
VALUES
(pamukkale_id,'İstanbul','Muğla', NOW()+INTERVAL '4 hours', NOW()+INTERVAL '14 hours', 600, 410.00, 'Comfort', ARRAY['wifi','klima','usb']),
(sus_id,      'İstanbul','Muğla', NOW()+INTERVAL '1 day 5 hours', NOW()+INTERVAL '1 day 15 hours', 600, 380.00, 'Standart', ARRAY['klima']);

-- ─── Şimdi herkese koltuk üret (40 koltuk per sefer) ─────────────
INSERT INTO seats (trip_id, seat_number, gender_pref)
SELECT t.id, gs.n,
    CASE
        WHEN gs.n % 4 = 1 THEN 'female'
        WHEN gs.n % 4 = 2 THEN 'female'
        ELSE NULL
    END
FROM trips t
CROSS JOIN generate_series(1, 40) gs(n)
ON CONFLICT (trip_id, seat_number) DO NOTHING;

-- Bazı koltukları dolu yap (gerçekçilik için)
UPDATE seats
SET status = 'sold'
WHERE id IN (
    SELECT s.id FROM seats s
    JOIN trips t ON s.trip_id = t.id
    WHERE s.seat_number <= 15
      AND t.from_city IN ('İstanbul','Ankara')
    ORDER BY RANDOM()
    LIMIT 200
);

RAISE NOTICE 'Sefer ve koltuk seed''i tamamlandı ✅';

END $$;
