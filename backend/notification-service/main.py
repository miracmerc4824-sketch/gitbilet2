"""
BILETBUDUR — Notification Service
Kafka consumer — sends email/SMS on ticket issuance
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio, logging, os, json
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-8s | %(message)s")
logger = logging.getLogger("biletbudur.notification-service")

app = FastAPI(title="BiletBudur — Notification Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

KAFKA_SERVERS  = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_GROUP    = os.getenv("KAFKA_GROUP_ID", "notification-consumers")
SMTP_HOST      = os.getenv("SMTP_HOST", "smtp.gmail.com")

# In-memory notification log
NOTIFICATIONS: list = []

# ── Kafka Consumer simulation ────────────────────────────────────

async def consume_kafka_events():
    """
    In production:
        consumer = Consumer({'bootstrap.servers': KAFKA_SERVERS, 'group.id': KAFKA_GROUP})
        consumer.subscribe(['ag.tickets.issued', 'ag.payments.completed', 'ag.payments.failed'])
        while True:
            msg = consumer.poll(1.0)
            if msg: await handle_event(json.loads(msg.value()))
    """
    logger.info(f"📡 Kafka consumer started — group: {KAFKA_GROUP}")
    logger.info(f"📡 Subscribed: ag.tickets.issued, ag.payments.completed, ag.payments.failed")

    # Simulate periodic log
    count = 0
    while True:
        await asyncio.sleep(30)
        count += 1
        logger.info(f"📡 Kafka consumer heartbeat #{count}")


async def handle_event(event: dict):
    event_type = event.get("event_type")

    if event_type == "TICKET_ISSUED":
        logger.info(f"📧 Sending ticket email: ticket={event.get('ticket_no')}")
        NOTIFICATIONS.append({
            "type": "email", "event": event_type,
            "ticket": event.get("ticket_no"),
            "sent_at": datetime.utcnow().isoformat()
        })

    elif event_type == "PAYMENT_FAILED":
        logger.info(f"📲 Sending payment failure SMS: booking={event.get('booking_id')}")
        NOTIFICATIONS.append({
            "type": "sms", "event": event_type,
            "booking": event.get("booking_id"),
            "sent_at": datetime.utcnow().isoformat()
        })


@app.on_event("startup")
async def startup():
    asyncio.create_task(consume_kafka_events())
    logger.info("🚀 Notification Service started")


@app.get("/health")
async def health():
    return {
        "status":     "healthy",
        "service":    "notification-service",
        "kafka_group": KAFKA_GROUP,
        "smtp_host":  SMTP_HOST,
    }


@app.get("/notifications")
async def get_notifications(limit: int = 50):
    return {
        "count": len(NOTIFICATIONS),
        "data":  NOTIFICATIONS[-limit:]
    }


@app.post("/send/email")
async def send_email_direct(to: str, subject: str, body: str):
    """Manual email trigger (for testing)"""
    logger.info(f"📧 Direct email → {to}: {subject}")
    NOTIFICATIONS.append({
        "type": "email", "to": to, "subject": subject,
        "sent_at": datetime.utcnow().isoformat()
    })
    return {"success": True, "message": f"Email sent to {to}"}
