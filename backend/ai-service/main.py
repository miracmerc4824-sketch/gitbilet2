"""
ANTIGRAVITY — AI Travel Concierge Service
Uses Ollama (Llama 3 CUDA) to parse natural language travel queries
and recommend matching trips from the database.
"""

import json
import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import asyncpg
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
)
logger = logging.getLogger("antigravity.ai")

# ── Config ─────────────────────────────────────────────────────────
DATABASE_URL  = os.getenv("DATABASE_URL", "postgresql://aguser:agpass_dev@postgres:5432/antigravity")
OLLAMA_URL    = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL  = os.getenv("OLLAMA_MODEL", "llama3")

# ── FastAPI ────────────────────────────────────────────────────────
app = FastAPI(
    title="Antigravity AI Service",
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


async def get_pool() -> asyncpg.Pool:
    global db_pool
    if db_pool is None:
        db_pool = await asyncpg.create_pool(
            DATABASE_URL.replace("postgresql+asyncpg", "postgresql"),
            min_size=2, max_size=10
        )
    return db_pool


# ── Pydantic Models ────────────────────────────────────────────────
class ConciergeRequest(BaseModel):
    message: str
    session_id: str = ""
    user_id: str | None = None


class SafetyMatchRequest(BaseModel):
    user_id: str
    trip_id: str


class ConciergeResponse(BaseModel):
    reply: str
    trips: list[dict]
    session_id: str


# ── System Prompt ──────────────────────────────────────────────────
SYSTEM_PROMPT = """Sen Antigravity'nin AI seyahat asistanısın. Türkçe konuşan kullanıcılara
Türkiye otobüs seyahati konusunda yardımcı oluyorsun.

Kullanıcı doğal dilde seyahat isteği paylaştığında:
1. Kalkış şehrini çıkar (from_city)
2. Varış şehrini çıkar (to_city)  
3. Tarihi çıkar ("yarın", "hafta sonu", "Cuma" gibi ifadeleri bugünün tarihine göre yorumla)
4. Bütçeyi çıkar (varsa)
5. Tercih ettiği özellikleri çıkar (wifi, klima, vip vb.)

SADECE JSON formatında yanıt ver:
{
  "from_city": "şehir adı veya null",
  "to_city": "şehir adı veya null", 
  "date_offset_days": 0 (bugün=0, yarın=1, hafta sonu=gün sayısı),
  "max_price": null veya sayı,
  "bus_type": null veya "Standart"/"Comfort"/"VIP",
  "reply": "kullanıcıya Türkçe nazik mesaj (max 2 cümle)"
}

Şehir adlarını tam Türkçe karakter ile yaz: İstanbul, İzmir, Antalya vb."""


# ── Ollama Call ────────────────────────────────────────────────────
async def ask_ollama(user_message: str) -> dict[str, Any]:
    """Send message to Ollama and parse structured JSON response."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ],
        "stream": False,
        "format": "json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
            response.raise_for_status()
            data = response.json()
            content = data["message"]["content"]
            return json.loads(content)
    except httpx.ConnectError:
        logger.warning("Ollama bağlantı hatası — fallback'e geçiliyor")
        return _fallback_parse(user_message)
    except (json.JSONDecodeError, KeyError) as exc:
        logger.error(f"Ollama yanıt parse hatası: {exc}")
        return _fallback_parse(user_message)


def _fallback_parse(message: str) -> dict[str, Any]:
    """Rule-based fallback when Ollama is unavailable."""
    cities = [
        "İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Bodrum",
        "Trabzon", "Konya", "Gaziantep", "Mersin", "Marmaris", "Fethiye",
        "Muğla", "Samsun", "Erzurum", "Diyarbakır", "Kayseri",
    ]
    msg_lower = message.lower()

    from_city = None
    to_city   = None
    detected  = [c for c in cities if c.lower() in msg_lower]
    if len(detected) >= 2:
        from_city, to_city = detected[0], detected[1]
    elif len(detected) == 1:
        to_city = detected[0]

    # Date heuristics
    offset = 0
    if "yarın" in msg_lower:          offset = 1
    elif "hafta sonu" in msg_lower:    offset = (5 - datetime.now().weekday()) % 7 or 7
    elif "cuma" in msg_lower:          offset = (4 - datetime.now().weekday()) % 7 or 7
    elif "pazartesi" in msg_lower:     offset = (0 - datetime.now().weekday()) % 7 or 7

    # Budget
    prices = re.findall(r"\d{2,4}", message)
    max_price = float(prices[-1]) if prices else None

    reply = (
        f"{'✅ ' + to_city + ' için' if to_city else 'Size'} uygun seferleri listeliyorum!"
        if to_city else
        "Hangi şehre gitmek istediğinizi belirtir misiniz?"
    )

    return {
        "from_city":        from_city,
        "to_city":          to_city,
        "date_offset_days": offset,
        "max_price":        max_price,
        "bus_type":         "VIP" if "vip" in msg_lower or "lüks" in msg_lower
                            else "Comfort" if "konfor" in msg_lower else None,
        "reply":            reply,
    }


# ── Trip DB Search ─────────────────────────────────────────────────
async def search_trips(parsed: dict[str, Any]) -> list[dict]:
    pool  = await get_pool()
    from_city  = parsed.get("from_city")
    to_city    = parsed.get("to_city")
    offset     = parsed.get("date_offset_days", 0) or 0
    max_price  = parsed.get("max_price")
    bus_type   = parsed.get("bus_type")

    target_date = datetime.now(timezone.utc) + timedelta(days=int(offset))
    date_start  = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    date_end    = date_start + timedelta(days=2)   # ±1 day window

    conditions  = ["t.is_active = TRUE", "t.departure_time BETWEEN $1 AND $2"]
    params: list[Any] = [date_start, date_end]
    p = 3

    if to_city:
        conditions.append(f"t.to_city ILIKE ${p}")
        params.append(f"%{to_city}%")
        p += 1

    if from_city:
        conditions.append(f"t.from_city ILIKE ${p}")
        params.append(f"%{from_city}%")
        p += 1

    if max_price:
        conditions.append(f"COALESCE(t.current_price, t.base_price) <= ${p}")
        params.append(float(max_price))
        p += 1

    if bus_type:
        conditions.append(f"t.bus_type = ${p}")
        params.append(bus_type)
        p += 1

    query = f"""
        SELECT t.id, t.from_city, t.to_city,
               t.departure_time, t.arrival_time, t.duration_min,
               COALESCE(t.current_price, t.base_price) AS price,
               t.bus_type, t.amenities, t.total_seats,
               c.name AS company_name, c.rating,
               COUNT(s.id) FILTER (WHERE s.status='available') AS available_seats
        FROM trips t
        JOIN companies c ON t.company_id = c.id
        LEFT JOIN seats s ON s.trip_id = t.id
        WHERE {' AND '.join(conditions)}
        GROUP BY t.id, c.name, c.rating
        ORDER BY t.departure_time
        LIMIT 6
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    results = []
    for r in rows:
        results.append({
            "id":              str(r["id"]),
            "from_city":       r["from_city"],
            "to_city":         r["to_city"],
            "departure_time":  r["departure_time"].isoformat(),
            "arrival_time":    r["arrival_time"].isoformat(),
            "duration_min":    r["duration_min"],
            "price":           float(r["price"]),
            "bus_type":        r["bus_type"],
            "amenities":       list(r["amenities"] or []),
            "company_name":    r["company_name"],
            "rating":          float(r["rating"]),
            "available_seats": r["available_seats"],
        })
    return results


# ── Safety-Match ───────────────────────────────────────────────────
async def compute_safety_match(user_id: str, trip_id: str) -> list[dict]:
    """Suggest compatible seat neighbors based on shared interests."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        user_prefs = await conn.fetchrow(
            "SELECT interests, travel_style FROM user_preferences WHERE user_id = $1",
            uuid.UUID(user_id)
        )
        if not user_prefs:
            return []

        user_interests = set(user_prefs["interests"] or [])

        # Find other booked passengers on this trip with matching interests
        rows = await conn.fetch(
            """
            SELECT u.id, u.full_name, u.avatar_url,
                   up.interests, up.travel_style, s.seat_number
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            LEFT JOIN user_preferences up ON up.user_id = u.id
            JOIN LATERAL unnest(b.seat_numbers) AS s(seat_number) ON TRUE
            WHERE b.trip_id = $1
              AND b.status IN ('confirmed','pending')
              AND u.id != $2
            LIMIT 20
            """,
            uuid.UUID(trip_id), uuid.UUID(user_id)
        )

        matches = []
        for r in rows:
            other_interests = set(r["interests"] or [])
            common = user_interests & other_interests
            score = len(common) / max(len(user_interests | other_interests), 1)
            if score > 0.2:
                matches.append({
                    "seat_number":  r["seat_number"],
                    "name_initials": r["full_name"][:2].upper(),
                    "interests":    list(other_interests),
                    "common":       list(common),
                    "match_score":  round(score * 100),
                    "travel_style": r["travel_style"],
                })

        matches.sort(key=lambda x: x["match_score"], reverse=True)
        return matches[:5]


# ── Endpoints ──────────────────────────────────────────────────────
@app.post("/api/v1/ai/concierge", response_model=ConciergeResponse)
async def concierge(req: ConciergeRequest):
    parsed = await ask_ollama(req.message)
    trips  = await search_trips(parsed)

    session_id = req.session_id or str(uuid.uuid4())

    # Log conversation
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO ai_conversations (session_id, user_id, role, content, trip_ids)
                   VALUES ($1, $2, 'user', $3, $4)""",
                session_id,
                uuid.UUID(req.user_id) if req.user_id else None,
                req.message,
                [uuid.UUID(t["id"]) for t in trips],
            )
            await conn.execute(
                """INSERT INTO ai_conversations (session_id, user_id, role, content)
                   VALUES ($1, $2, 'assistant', $3)""",
                session_id,
                uuid.UUID(req.user_id) if req.user_id else None,
                parsed.get("reply", ""),
            )
    except Exception as exc:
        logger.warning(f"Conversation log failed: {exc}")

    return ConciergeResponse(
        reply=parsed.get("reply", "Size uygun seferleri buldum!"),
        trips=trips,
        session_id=session_id,
    )


@app.post("/api/v1/ai/safety-match")
async def safety_match(req: SafetyMatchRequest):
    matches = await compute_safety_match(req.user_id, req.trip_id)
    return {"matches": matches, "total": len(matches)}


@app.get("/health")
async def health():
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as c:
            r = await c.get(f"{OLLAMA_URL}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass
    return {
        "status": "healthy" if ollama_ok else "degraded",
        "service": "ai-service",
        "ollama": "up" if ollama_ok else "down (fallback active)",
        "model": OLLAMA_MODEL,
    }
