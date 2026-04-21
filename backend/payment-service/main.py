"""
BILETBUDUR — Payment Service
Circuit Breaker pattern + Kafka event pub on success/failure
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio, uuid, random, logging, os
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-8s | %(message)s")
logger = logging.getLogger("biletbudur.payment-service")

app = FastAPI(title="BiletBudur — Payment Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

KAFKA_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
TIMEOUT_SECS  = int(os.getenv("PAYMENT_TIMEOUT_SECONDS", "30"))
CB_THRESHOLD  = int(os.getenv("CIRCUIT_BREAKER_THRESHOLD", "5"))

# ── Circuit Breaker State ────────────────────────────────────────
class CircuitBreaker:
    def __init__(self, threshold: int = 5):
        self.failures    = 0
        self.threshold   = threshold
        self.state       = "CLOSED"   # CLOSED | OPEN | HALF_OPEN
        self.opened_at   = None

    def record_success(self):
        self.failures = 0
        self.state    = "CLOSED"
        logger.info("✅ Circuit Breaker: CLOSED")

    def record_failure(self):
        self.failures += 1
        logger.warning(f"⚠️ Circuit Breaker: {self.failures}/{self.threshold} failures")
        if self.failures >= self.threshold:
            self.state     = "OPEN"
            self.opened_at = datetime.utcnow()
            logger.error("🔴 Circuit Breaker: OPEN — Payment provider unreachable")

    def can_pass(self) -> bool:
        if self.state == "CLOSED":
            return True
        if self.state == "OPEN":
            # Auto-retry (HALF_OPEN) after 30s
            if self.opened_at and (datetime.utcnow() - self.opened_at).seconds >= 30:
                self.state = "HALF_OPEN"
                logger.info("🟡 Circuit Breaker: HALF_OPEN — testing...")
                return True
            return False
        return True   # HALF_OPEN

cb = CircuitBreaker(CB_THRESHOLD)


class PaymentRequest(BaseModel):
    booking_id: str
    amount:     float
    card_token: str   # PCI-DSS: never send raw card numbers
    user_id:    str

# ── Endpoints ────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "payment-service",
        "circuit_breaker": cb.state,
        "failures": cb.failures,
    }

@app.post("/charge", summary="Ödeme işle")
async def charge(req: PaymentRequest):
    # Circuit breaker check
    if not cb.can_pass():
        raise HTTPException(503, {
            "code": "CIRCUIT_OPEN",
            "message": "Ödeme servisi geçici olarak kullanılamıyor. Lütfen bekleyin.",
        })

    # Simulate payment gateway latency
    await asyncio.sleep(random.uniform(0.5, 2.0))

    # Simulate 95% success rate
    success = random.random() < 0.95

    if success:
        cb.record_success()
        txn_id = f"TXN{uuid.uuid4().hex[:12].upper()}"
        ticket_no = f"BB{uuid.uuid4().hex[:8].upper()}"

        # Publish to Kafka
        logger.info(f"📨 KAFKA → ag.payments.completed: booking={req.booking_id} txn={txn_id}")
        logger.info(f"📨 KAFKA → ag.notifications.queue: ticket={ticket_no} user={req.user_id}")

        return {
            "success":        True,
            "transaction_id": txn_id,
            "booking_id":     req.booking_id,
            "ticket_no":      ticket_no,
            "amount":         req.amount,
            "currency":       "TRY",
            "processed_at":   datetime.utcnow().isoformat(),
            "message":        "Ödeme başarıyla tamamlandı",
        }
    else:
        cb.record_failure()
        logger.error(f"📨 KAFKA → ag.payments.failed: booking={req.booking_id}")
        raise HTTPException(402, {
            "code":    "PAYMENT_DECLINED",
            "message": "Ödeme reddedildi. Kart bilgilerini kontrol edin.",
        })


@app.get("/status/{transaction_id}")
async def payment_status(transaction_id: str):
    # In production: query PostgreSQL payments table
    return {
        "transaction_id": transaction_id,
        "status": "completed",
        "note":   "Production'da DB'den gelir",
    }
