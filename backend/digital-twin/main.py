"""
ANTIGRAVITY — Digital Twin Bus Tracking Service
Simulates real-time GPS coordinates for active bus trips
and streams them via WebSocket.
"""

import asyncio
import json
import logging
import math
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import asyncpg
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
)
logger = logging.getLogger("antigravity.digital-twin")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://aguser:agpass_dev@postgres:5432/antigravity")

# City coordinates reference
CITY_COORDS: dict[str, tuple[float, float]] = {
    "İstanbul":     (41.0082, 28.9784),
    "Ankara":       (39.9208, 32.8541),
    "İzmir":        (38.4237, 27.1428),
    "Antalya":      (36.8841, 30.7056),
    "Bursa":        (40.1826, 29.0665),
    "Bodrum":       (37.0344, 27.4306),
    "Trabzon":      (41.0015, 39.7178),
    "Konya":        (37.8667, 32.4833),
    "Gaziantep":    (37.0594, 37.3825),
    "Mersin":       (36.8000, 34.6333),
    "Marmaris":     (36.8558, 28.2753),
    "Fethiye":      (36.6561, 29.1239),
    "Muğla":        (37.2153, 28.3636),
    "Samsun":       (41.2867, 36.3300),
    "Erzurum":      (39.9000, 41.2700),
    "Diyarbakır":   (37.9144, 40.2306),
    "Kayseri":      (38.7312, 35.4787),
    "Denizli":      (37.7839, 29.0972),
    "Nevşehir":     (38.6939, 34.6856),
    "Şanlıurfa":    (37.1583, 38.7919),
}

# ── Active trip state { trip_id: {lat, lon, progress, ...} }
_trip_states: dict[str, dict[str, Any]] = {}
_subscribers: dict[str, list[WebSocket]] = {}  # trip_id → list of sockets

app = FastAPI(
    title="Antigravity Digital Twin",
    version="1.0.0",
    docs_url="/api/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db_pool: asyncpg.Pool | None = None


async def get_pool():
    global db_pool
    if db_pool is None:
        db_pool = await asyncpg.create_pool(
            DATABASE_URL.replace("postgresql+asyncpg", "postgresql"),
            min_size=2, max_size=5
        )
    return db_pool


def interpolate_coords(
    from_lat: float, from_lon: float,
    to_lat: float, to_lon: float,
    progress: float  # 0.0 → 1.0
) -> tuple[float, float]:
    """Linear interpolation + slight noise for realistic movement."""
    lat = from_lat + (to_lat - from_lat) * progress
    lon = from_lon + (to_lon - from_lon) * progress
    # Add small random noise (±0.002°) to simulate road curves
    import random
    lat += random.uniform(-0.002, 0.002)
    lon += random.uniform(-0.002, 0.002)
    return round(lat, 6), round(lon, 6)


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


async def load_active_trips():
    """Load currently active (departed) trips from DB."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, from_city, to_city, departure_time, arrival_time, duration_min
               FROM trips
               WHERE departure_time <= NOW()
                 AND arrival_time   >= NOW()
                 AND is_active = TRUE
               LIMIT 20"""
        )
    for r in rows:
        trip_id = str(r["id"])
        if trip_id in _trip_states:
            continue  # already tracking

        from_city = r["from_city"]
        to_city   = r["to_city"]
        from_coords = CITY_COORDS.get(from_city, (39.9, 32.8))
        to_coords   = CITY_COORDS.get(to_city,   (39.9, 32.8))

        total_sec = r["duration_min"] * 60
        elapsed   = (datetime.now(timezone.utc) - r["departure_time"]).total_seconds()
        progress  = max(0.0, min(1.0, elapsed / max(total_sec, 1)))

        lat, lon = interpolate_coords(*from_coords, *to_coords, progress)
        _trip_states[trip_id] = {
            "trip_id":    trip_id,
            "from_city":  from_city,
            "to_city":    to_city,
            "from_coords": from_coords,
            "to_coords":   to_coords,
            "total_sec":   total_sec,
            "elapsed_sec": elapsed,
            "progress":    progress,
            "lat":         lat,
            "lon":         lon,
            "speed_kmh":   haversine_km(*from_coords, *to_coords) / (r["duration_min"] / 60),
            "departure_time": r["departure_time"].isoformat(),
            "arrival_time":   r["arrival_time"].isoformat(),
        }

    logger.info(f"🚌 Tracking {len(_trip_states)} active trips")


async def simulation_loop():
    """Update all trip positions every 5 seconds."""
    while True:
        await asyncio.sleep(5)
        await load_active_trips()

        for trip_id, state in list(_trip_states.items()):
            state["elapsed_sec"] += 5
            state["progress"] = min(1.0, state["elapsed_sec"] / state["total_sec"])

            lat, lon = interpolate_coords(
                *state["from_coords"],
                *state["to_coords"],
                state["progress"]
            )
            state["lat"] = lat
            state["lon"] = lon

            # Build broadcast payload
            payload = {
                "trip_id":  trip_id,
                "lat":      lat,
                "lon":      lon,
                "progress": round(state["progress"] * 100, 1),
                "from_city": state["from_city"],
                "to_city":   state["to_city"],
                "speed_kmh": round(state["speed_kmh"]),
                "eta":       state["arrival_time"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            # Broadcast to all WebSocket subscribers
            dead = []
            for ws in _subscribers.get(trip_id, []):
                try:
                    await ws.send_json(payload)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                _subscribers[trip_id].remove(ws)

            # Remove completed trips
            if state["progress"] >= 1.0:
                logger.info(f"✅ Trip {trip_id} arrived at {state['to_city']}")
                del _trip_states[trip_id]


# ── WebSocket Endpoint ─────────────────────────────────────────────
@app.websocket("/ws/track/{trip_id}")
async def track_bus(websocket: WebSocket, trip_id: str):
    await websocket.accept()
    logger.info(f"🔌 New subscriber for trip {trip_id}")

    if trip_id not in _subscribers:
        _subscribers[trip_id] = []
    _subscribers[trip_id].append(websocket)

    # Send current state immediately
    if trip_id in _trip_states:
        await websocket.send_json(_trip_states[trip_id])
    else:
        await websocket.send_json({
            "error": "trip_not_active",
            "message": "Bu sefer henüz hareket etmedi veya tamamlandı."
        })

    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        if trip_id in _subscribers and websocket in _subscribers[trip_id]:
            _subscribers[trip_id].remove(websocket)
        logger.info(f"🔌 Subscriber disconnected from trip {trip_id}")


# ── REST Endpoints ─────────────────────────────────────────────────
@app.get("/api/v1/twin/active")
async def active_trips():
    return {
        "active": [
            {k: v for k, v in s.items() if k != "from_coords" and k != "to_coords"}
            for s in _trip_states.values()
        ],
        "count": len(_trip_states),
    }


@app.get("/api/v1/twin/{trip_id}")
async def trip_location(trip_id: str):
    state = _trip_states.get(trip_id)
    if not state:
        return {"error": "not_active"}
    return {k: v for k, v in state.items() if k not in ("from_coords", "to_coords")}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "digital-twin",
        "active_trips": len(_trip_states),
        "subscribers": sum(len(v) for v in _subscribers.values()),
    }


@app.on_event("startup")
async def startup():
    await load_active_trips()
    asyncio.create_task(simulation_loop())
    logger.info("🛰️ Digital Twin started — simulation running")
