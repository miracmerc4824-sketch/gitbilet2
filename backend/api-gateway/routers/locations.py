"""
ANTIGRAVITY — Locations Router
Türkiye 81 il + ilçe API endpoints
"""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import asyncpg
import os

router = APIRouter()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://aguser:agpass_dev@postgres:5432/antigravity")

_pool: asyncpg.Pool | None = None


async def pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            DATABASE_URL.replace("postgresql+asyncpg", "postgresql"),
            min_size=2, max_size=10
        )
    return _pool


@router.get("/iller", summary="81 İl Listesi")
async def get_iller():
    """Türkiye'nin tüm 81 ilini döndürür."""
    db = await pool()
    async with db.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, il_kodu, il_adi, lat, lon, population
               FROM locations
               WHERE ilce_adi IS NULL
               ORDER BY CAST(il_kodu AS INTEGER)"""
        )
    return [
        {
            "id":         str(r["id"]),
            "il_kodu":    r["il_kodu"],
            "il_adi":     r["il_adi"],
            "lat":        float(r["lat"] or 0),
            "lon":        float(r["lon"] or 0),
            "population": r["population"],
        }
        for r in rows
    ]


@router.get("/ilceler", summary="İlçe Listesi")
async def get_ilceler(
    il_adi: str | None = Query(None, description="İl adı (örn: İstanbul)"),
    il_kodu: str | None = Query(None, description="İl kodu (örn: 34)"),
):
    """Bir ile ait tüm ilçeleri döndürür."""
    if not il_adi and not il_kodu:
        return JSONResponse(status_code=400, content={"error": "il_adi veya il_kodu gerekli"})

    db = await pool()
    async with db.acquire() as conn:
        if il_kodu:
            rows = await conn.fetch(
                """SELECT id, il_kodu, il_adi, ilce_adi, full_name, lat, lon
                   FROM locations
                   WHERE il_kodu = $1 AND ilce_adi IS NOT NULL
                   ORDER BY ilce_adi""",
                il_kodu
            )
        else:
            rows = await conn.fetch(
                """SELECT id, il_kodu, il_adi, ilce_adi, full_name, lat, lon
                   FROM locations
                   WHERE il_adi ILIKE $1 AND ilce_adi IS NOT NULL
                   ORDER BY ilce_adi""",
                f"%{il_adi}%"
            )
    return [
        {
            "id":       str(r["id"]),
            "il_kodu":  r["il_kodu"],
            "il_adi":   r["il_adi"],
            "ilce_adi": r["ilce_adi"],
            "full_name":r["full_name"],
            "lat":      float(r["lat"] or 0),
            "lon":      float(r["lon"] or 0),
        }
        for r in rows
    ]


@router.get("/search", summary="Fuzzy Lokasyon Arama")
async def search_locations(
    q: str = Query(..., min_length=2, description="Arama metni"),
    limit: int = Query(10, ge=1, le=50),
):
    """İl veya ilçe adına göre fuzzy arama yapar (pg_trgm)."""
    db = await pool()
    async with db.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, il_kodu, il_adi, ilce_adi, full_name, lat, lon,
                      similarity(full_name, $1) AS sim
               FROM locations
               WHERE full_name % $1 OR full_name ILIKE $2
               ORDER BY sim DESC, il_adi, ilce_adi NULLS FIRST
               LIMIT $3""",
            q, f"%{q}%", limit
        )
    return [
        {
            "id":        str(r["id"]),
            "full_name": r["full_name"],
            "il_adi":    r["il_adi"],
            "ilce_adi":  r["ilce_adi"],
            "lat":       float(r["lat"] or 0),
            "lon":       float(r["lon"] or 0),
            "score":     round(float(r["sim"]), 3),
        }
        for r in rows
    ]
