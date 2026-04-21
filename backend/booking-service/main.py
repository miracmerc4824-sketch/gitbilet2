"""
BILETBUDUR — Booking Service
Standalone FastAPI service: Redis locking + Kafka producer
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio, uuid, logging, os
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-8s | %(message)s")
logger = logging.getLogger("biletbudur.booking-service")

app = FastAPI(title="BiletBudur — Booking Service", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/1")
KAFKA_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

# In-memory fallback (replaced by Redis in production)
_LOCKS: dict = {}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "booking-service"}

@app.post("/lock")
async def acquire_lock(trip_id: str, seat_no: int, user_id: str, ttl: int = 300):
    """
    Redis: SET ag:seat_lock:{trip_id}:{seat_no} {user_id} NX EX {ttl}
    """
    key = f"ag:seat_lock:{trip_id}:{seat_no}"
    now = datetime.utcnow()

    if key in _LOCKS:
        lock = _LOCKS[key]
        if lock["expires_at"] > now and lock["user_id"] != user_id:
            logger.warning(f"🔒 Lock DENIED: {key} held by {lock['user_id']}")
            raise HTTPException(409, {
                "code": "SEAT_LOCKED",
                "message": f"Koltuk {seat_no} başka kullanıcı tarafından kilitlenmiş",
                "retry_after": (lock["expires_at"] - now).seconds,
            })

    _LOCKS[key] = {"user_id": user_id, "expires_at": now + timedelta(seconds=ttl)}
    logger.info(f"🔓 Lock ACQUIRED: {key} → {user_id} (TTL={ttl}s)")

    # Publish to Kafka (mock)
    logger.info(f"📨 KAFKA → ag.seats.locked: trip={trip_id} seat={seat_no} user={user_id}")

    return {"success": True, "key": key, "ttl": ttl, "message": "Koltuk rezerve edildi"}

@app.delete("/lock")
async def release_lock(trip_id: str, seat_no: int, user_id: str):
    key = f"ag:seat_lock:{trip_id}:{seat_no}"
    lock = _LOCKS.get(key)
    if not lock or lock["user_id"] != user_id:
        raise HTTPException(403, "Bu kilidi sadece sahibi kaldırabilir")
    del _LOCKS[key]
    logger.info(f"🔓 Lock RELEASED: {key}")
    return {"success": True, "message": "Kilit kaldırıldı"}

@app.get("/locks")
async def list_locks():
    now = datetime.utcnow()
    active = {k: v for k, v in _LOCKS.items() if v["expires_at"] > now}
    return {"active_locks": len(active), "locks": [
        {"key": k, "user_id": v["user_id"],
         "expires_in": int((v["expires_at"] - now).total_seconds())}
        for k, v in active.items()
    ]}
