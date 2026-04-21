"""
BILETBUDUR — Bookings Router
Create, confirm, cancel bookings; events published to Kafka
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List
import uuid, asyncio, random, logging

logger = logging.getLogger("biletbudur.bookings")
router  = APIRouter()
security = HTTPBearer()

# ── Models ───────────────────────────────────────────────────────

class PassengerInfo(BaseModel):
    name:   str
    tc:     str
    phone:  str
    gender: str = "unknown"

class CreateBookingRequest(BaseModel):
    trip_id:        str
    seat_numbers:   List[int]
    passengers:     List[PassengerInfo]

class ConfirmBookingRequest(BaseModel):
    booking_id: str
    payment_id: str


# ── In-memory store (replace with PostgreSQL) ────────────────────
BOOKINGS: dict = {}


# ── Helpers ──────────────────────────────────────────────────────

def _mock_publish_kafka(topic: str, payload: dict) -> str:
    """Simulate Kafka publish — in production: confluent_kafka.Producer"""
    event_id = str(uuid.uuid4())
    logger.info(f"📨 KAFKA → {topic}: {payload.get('event_type','?')} [{event_id[:8]}]")
    return event_id

def _mock_redis_lock(trip_id: str, seats: List[int], user_id: str):
    """Simulate Redis SET NX EX — in production: aioredis"""
    # Always succeeds in mock; real impl uses atomic SET NX
    return {"success": True, "locked": seats, "failed": []}


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/", status_code=201, summary="Rezervasyon oluştur")
async def create_booking(
    req: CreateBookingRequest,
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Flow:
    1. Redis distributed lock (SET NX EX 300) tüm koltuklar için
    2. PostgreSQL'e booking kaydı oluştur
    3. Kafka'ya BOOKING_CREATED eventi yayınla
    """
    if len(req.seat_numbers) != len(req.passengers):
        raise HTTPException(400, "Koltuk sayısı yolcu sayısıyla eşleşmiyor")

    # Step 1 — Redis lock (mock)
    lock_result = _mock_redis_lock(req.trip_id, req.seat_numbers, "user_from_jwt")
    if not lock_result["success"]:
        raise HTTPException(409, {
            "message": "Bazı koltuklar müsait değil",
            "busy_seats": lock_result["failed"],
            "code": "SEAT_UNAVAILABLE",
        })

    await asyncio.sleep(0.2)   # simulate DB write

    # Step 2 — Create booking record
    booking_id = f"BK{uuid.uuid4().hex[:12].upper()}"
    now        = datetime.utcnow()
    booking    = {
        "booking_id":     booking_id,
        "trip_id":        req.trip_id,
        "seat_numbers":   req.seat_numbers,
        "passengers":     [p.model_dump() for p in req.passengers],
        "status":         "PENDING_PAYMENT",
        "created_at":     now.isoformat(),
        "expires_at":     (now + timedelta(minutes=5)).isoformat(),
    }
    BOOKINGS[booking_id] = booking

    # Step 3 — Publish to Kafka
    event_id = _mock_publish_kafka("ag.bookings.created", {
        "event_type": "BOOKING_CREATED",
        "booking_id": booking_id,
        "trip_id":    req.trip_id,
        "seats":      req.seat_numbers,
    })

    logger.info(f"✅ Booking created: {booking_id} | event: {event_id[:8]}")

    return {
        "success":      True,
        "booking_id":   booking_id,
        "message":      "Rezervasyon oluşturuldu. 5 dakika içinde ödeme yapın.",
        "data":         booking,
        "kafka_event":  event_id,
    }


@router.post("/confirm", summary="Ödeme sonrası rezervasyonu onayla")
async def confirm_booking(req: ConfirmBookingRequest):
    booking = BOOKINGS.get(req.booking_id)
    if not booking:
        raise HTTPException(404, "Rezervasyon bulunamadı")

    if booking["status"] == "CONFIRMED":
        return {"success": True, "message": "Zaten onaylandı", "booking": booking}

    # Check expiry
    if datetime.utcnow() > datetime.fromisoformat(booking["expires_at"]):
        booking["status"] = "EXPIRED"
        raise HTTPException(410, "Rezervasyon süresi doldu")

    # Confirm
    booking["status"]       = "CONFIRMED"
    booking["confirmed_at"] = datetime.utcnow().isoformat()
    ticket_no = f"BB{uuid.uuid4().hex[:8].upper()}"
    booking["ticket_no"] = ticket_no

    event_id = _mock_publish_kafka("ag.tickets.issued", {
        "event_type": "TICKET_ISSUED",
        "booking_id": req.booking_id,
        "payment_id": req.payment_id,
        "ticket_no":  ticket_no,
    })

    return {
        "success":    True,
        "ticket_no":  ticket_no,
        "booking_id": req.booking_id,
        "message":    "Rezervasyon onaylandı, bilet oluşturuldu",
        "kafka_event": event_id,
    }


@router.get("/{booking_id}", summary="Rezervasyon detayı")
async def get_booking(booking_id: str):
    booking = BOOKINGS.get(booking_id)
    if not booking:
        raise HTTPException(404, "Rezervasyon bulunamadı")
    return {"success": True, "data": booking}


@router.delete("/{booking_id}", summary="Rezervasyon iptal")
async def cancel_booking(booking_id: str):
    booking = BOOKINGS.get(booking_id)
    if not booking:
        raise HTTPException(404, "Rezervasyon bulunamadı")

    booking["status"]       = "CANCELLED"
    booking["cancelled_at"] = datetime.utcnow().isoformat()

    _mock_publish_kafka("ag.bookings.cancelled", {
        "event_type": "BOOKING_CANCELLED",
        "booking_id": booking_id,
    })

    return {"success": True, "message": "Rezervasyon iptal edildi"}
