"""
ANTIGRAVITY — Dynamic Pricing Engine
Kafka consumer: listens to 'ticket.searched' events and
adjusts trip prices by ±5-10% based on demand.
"""

import asyncio
import json
import logging
import os
import random
from datetime import datetime, timezone
from typing import Any

import asyncpg
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from fastapi import FastAPI
from fastapi.responses import JSONResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
)
logger = logging.getLogger("antigravity.pricing")

# ── Config ────────────────────────────────────────────────────────
DATABASE_URL         = os.getenv("DATABASE_URL", "postgresql://aguser:agpass_dev@postgres:5432/antigravity")
KAFKA_SERVERS        = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
SEARCH_TOPIC         = "ticket.searched"
PRICE_UPDATED_TOPIC  = "price.updated"
CONSUMER_GROUP       = "pricing-engine-group"

# demand window: if a trip is searched this many times in the window → increase
DEMAND_THRESHOLD     = int(os.getenv("DEMAND_THRESHOLD", "5"))
PRICE_INCREASE_MIN   = float(os.getenv("PRICE_INCREASE_MIN", "5"))    # %
PRICE_INCREASE_MAX   = float(os.getenv("PRICE_INCREASE_MAX", "10"))   # %
PRICE_DECREASE_PCT   = float(os.getenv("PRICE_DECREASE_PCT", "3"))    # %

# In-memory search counter { trip_id: count }
_search_counts: dict[str, int] = {}

# ── FastAPI app (health only) ──────────────────────────────────────
app = FastAPI(
    title="Antigravity Pricing Engine",
    version="1.0.0",
    docs_url="/api/docs",
)

db_pool: asyncpg.Pool | None = None
producer: AIOKafkaProducer | None = None


# ── DB helpers ─────────────────────────────────────────────────────
async def get_pool() -> asyncpg.Pool:
    global db_pool
    if db_pool is None:
        db_pool = await asyncpg.create_pool(
            DATABASE_URL.replace("postgresql+asyncpg", "postgresql"),
            min_size=2, max_size=10
        )
    return db_pool


async def apply_price_change(trip_id: str, delta_pct: float) -> dict[str, Any] | None:
    """Call the PL/pgSQL update_trip_price function and return result."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        try:
            new_price = await conn.fetchval(
                "SELECT update_trip_price($1::uuid, $2)",
                trip_id, delta_pct
            )
            if new_price is None:
                return None
            row = await conn.fetchrow(
                "SELECT id, from_city, to_city, base_price, current_price FROM trips WHERE id = $1",
                trip_id
            )
            return dict(row) if row else None
        except Exception as exc:
            logger.error(f"DB price update failed for {trip_id}: {exc}")
            return None


async def get_low_demand_trips() -> list[str]:
    """Return trip IDs where search_count hasn't increased recently."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id FROM trips
               WHERE is_active = TRUE
                 AND departure_time > NOW()
                 AND (current_price IS NULL OR current_price > base_price * 0.9)
               ORDER BY RANDOM() LIMIT 5"""
        )
        return [str(r["id"]) for r in rows]


# ── Kafka Consumer ─────────────────────────────────────────────────
async def run_consumer():
    global producer
    consumer = AIOKafkaConsumer(
        SEARCH_TOPIC,
        bootstrap_servers=KAFKA_SERVERS,
        group_id=CONSUMER_GROUP,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        auto_offset_reset="latest",
    )
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )

    await consumer.start()
    await producer.start()
    logger.info("✅ Pricing Engine Kafka consumer started")

    # Background: periodic low-demand price reduction
    asyncio.create_task(periodic_price_decay())

    try:
        async for msg in consumer:
            event = msg.value
            trip_id = event.get("trip_id")
            if not trip_id:
                continue

            # Increment search counter
            _search_counts[trip_id] = _search_counts.get(trip_id, 0) + 1
            count = _search_counts[trip_id]
            logger.info(f"📊 Trip {trip_id} search count: {count}")

            # Apply price increase when threshold hit
            if count >= DEMAND_THRESHOLD and count % DEMAND_THRESHOLD == 0:
                delta = round(random.uniform(PRICE_INCREASE_MIN, PRICE_INCREASE_MAX), 2)
                result = await apply_price_change(trip_id, delta)
                if result:
                    logger.info(
                        f"💰 Price UP  {result['from_city']}→{result['to_city']} "
                        f"+{delta}% → {result['current_price']} TRY"
                    )
                    await producer.send_and_wait(
                        PRICE_UPDATED_TOPIC,
                        {
                            "trip_id": trip_id,
                            "direction": "up",
                            "delta_pct": delta,
                            "new_price": float(result["current_price"]),
                            "from_city": result["from_city"],
                            "to_city": result["to_city"],
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }
                    )
    finally:
        await consumer.stop()
        await producer.stop()


async def periodic_price_decay():
    """Every 60s, randomly lower prices for low-demand trips."""
    while True:
        await asyncio.sleep(60)
        try:
            trips = await get_low_demand_trips()
            for trip_id in trips:
                delta = -round(random.uniform(1, PRICE_DECREASE_PCT), 2)
                result = await apply_price_change(trip_id, delta)
                if result:
                    logger.info(
                        f"📉 Price DOWN {result['from_city']}→{result['to_city']} "
                        f"{delta}% → {result['current_price']} TRY"
                    )
        except Exception as exc:
            logger.error(f"Price decay error: {exc}")


# ── Startup ────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    asyncio.create_task(run_consumer())
    logger.info("🚀 Pricing Engine started")


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "pricing-engine",
        "tracked_trips": len(_search_counts),
        "demand_threshold": DEMAND_THRESHOLD,
    }


@app.get("/stats")
async def stats():
    top = sorted(_search_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    return {"top_searched_trips": [{"trip_id": k, "searches": v} for k, v in top]}
