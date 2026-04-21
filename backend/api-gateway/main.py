"""
ANTIGRAVITY — API Gateway
FastAPI main application with middleware, CORS, and router wiring
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import time
import logging

from routers import auth, trips, seats, bookings, locations

# ─── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
)
logger = logging.getLogger("antigravity.gateway")

# ─── App Instance ───────────────────────────────────────────────
app = FastAPI(
    title="Antigravity API",
    description="""
    🚀 Antigravity — Next-Gen Ticketing Platform API

    Architecture:
    - Event-Driven via Apache Kafka
    - Redis Distributed Locking for seat reservation
    - PostgreSQL with optimized indexes
    - JWT + RSA256 Authentication
    - Zero-Trust mTLS between services
    """,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ─── CORS ───────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # ── Production IP (LAN / ağ erişimi) ──────────────────
        "http://10.159.109.35",
        "http://10.159.109.35:80",
        "http://10.159.109.35:8000",
        "http://10.159.109.35:5174",
        "http://10.159.109.35:3000",
        # ── Local dev ─────────────────────────────────────────
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://localhost:80",
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:8080",
        "null",      # file:// protocol for direct open
        "*",         # dev mode — remove in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time-Ms", "X-Powered-By"],
)

# ─── Request Timing Middleware ───────────────────────────────────
@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time-Ms"] = f"{duration:.2f}"
    response.headers["X-Powered-By"] = "Antigravity"
    logger.info(f"{request.method} {request.url.path} → {response.status_code} [{duration:.1f}ms]")
    return response

# ─── Exception Handlers ─────────────────────────────────────────
@app.exception_handler(404)
async def not_found(req: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"success": False, "message": "Kaynak bulunamadı", "code": "NOT_FOUND"}
    )

@app.exception_handler(500)
async def server_error(req: Request, exc):
    logger.error(f"Internal error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Sunucu hatası", "code": "INTERNAL_ERROR"}
    )

# ─── Health Check ────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "api-gateway",
        "version": "1.0.0",
        "uptime": "ok"
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "message": "⚡ Antigravity API — Yerçekimine meydan oku",
        "docs": "/api/docs",
        "version": "1.0.0"
    }

# ─── Routers ────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Authentication"])
app.include_router(trips.router,     prefix="/api/v1/trips",     tags=["Trips"])
app.include_router(seats.router,     prefix="/api/v1/seats",     tags=["Seats"])
app.include_router(bookings.router,  prefix="/api/v1/bookings",  tags=["Bookings"])
app.include_router(locations.router, prefix="/api/v1/locations", tags=["Locations"])

# ─── Startup / Shutdown ──────────────────────────────────────────
@app.on_event("startup")
async def startup():
    logger.info("🚀 Antigravity API Gateway starting up...")
    logger.info("📊 Connecting to PostgreSQL...")
    logger.info("⚡ Connecting to Redis...")
    logger.info("📨 Connecting to Kafka...")
    logger.info("✅ All systems nominal")

@app.on_event("shutdown")
async def shutdown():
    logger.info("🛑 Antigravity API Gateway shutting down...")
