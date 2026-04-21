"""
ANTIGRAVITY — Booking Service
Redis Distributed Locking + Kafka Event Producer
Race Condition Protection for simultaneous seat booking
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

# In production: use aioredis
# import aioredis
# from confluent_kafka import Producer

logger = logging.getLogger("antigravity.booking")

# ─────────────────────────────────────────────────────────────────
# DISTRIBUTED SEAT LOCKING (Redis)
# Pattern: SET seat_lock:{trip_id}:{seat_no} {user_id} NX EX {ttl}
# NX = Only set if NOT exists (atomic)
# EX = Expire in {ttl} seconds (auto-cleanup)
# ─────────────────────────────────────────────────────────────────

SEAT_LOCK_TTL = 300  # 5 minutes hold time

class SeatLockManager:
    """
    Distributed seat lock using Redis atomic SET NX EX.
    Prevents race conditions when multiple users attempt
    to book the same seat simultaneously.
    """

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self._in_memory_locks: dict = {}   # fallback for development

    def _lock_key(self, trip_id: str, seat_no: int) -> str:
        return f"ag:seat_lock:{trip_id}:{seat_no}"

    async def acquire_lock(
        self,
        trip_id: str,
        seat_no: int,
        user_id: str,
        ttl: int = SEAT_LOCK_TTL
    ) -> bool:
        """
        Atomically acquires a seat lock.
        Returns True if lock acquired, False if seat already locked.
        """
        key = self._lock_key(trip_id, seat_no)

        if self.redis:
            # Production: Redis atomic SET NX EX
            result = await self.redis.set(key, user_id, nx=True, ex=ttl)
            return result is not None
        else:
            # Development fallback: in-memory with expiry
            if key in self._in_memory_locks:
                lock_data = self._in_memory_locks[key]
                if lock_data["expires_at"] > datetime.utcnow():
                    # Lock still active
                    if lock_data["user_id"] != user_id:
                        logger.warning(f"🔒 Seat {seat_no} lock denied for {user_id} (held by {lock_data['user_id']})")
                        return False
                # Lock expired, allow re-acquisition
            self._in_memory_locks[key] = {
                "user_id": user_id,
                "expires_at": datetime.utcnow() + timedelta(seconds=ttl),
            }
            logger.info(f"🔓 Seat lock acquired: trip={trip_id} seat={seat_no} user={user_id}")
            return True

    async def release_lock(self, trip_id: str, seat_no: int, user_id: str) -> bool:
        """
        Releases a lock only if held by the requesting user.
        Uses Lua script in production for atomicity.
        """
        key = self._lock_key(trip_id, seat_no)

        if self.redis:
            # Lua script for atomic check-and-delete
            lua_script = """
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
            """
            result = await self.redis.eval(lua_script, 1, key, user_id)
            return result == 1
        else:
            lock_data = self._in_memory_locks.get(key)
            if lock_data and lock_data["user_id"] == user_id:
                del self._in_memory_locks[key]
                logger.info(f"🔓 Seat lock released: trip={trip_id} seat={seat_no}")
                return True
            return False

    async def extend_lock(
        self,
        trip_id: str,
        seat_no: int,
        user_id: str,
        extra_ttl: int = 120
    ) -> bool:
        """Extends lock TTL if still held by user (e.g., when payment takes longer)"""
        key = self._lock_key(trip_id, seat_no)

        if self.redis:
            current_owner = await self.redis.get(key)
            if current_owner == user_id:
                await self.redis.expire(key, extra_ttl)
                return True
            return False
        else:
            lock_data = self._in_memory_locks.get(key)
            if lock_data and lock_data["user_id"] == user_id:
                lock_data["expires_at"] = datetime.utcnow() + timedelta(seconds=extra_ttl)
                return True
            return False

    async def get_lock_owner(self, trip_id: str, seat_no: int) -> Optional[str]:
        key = self._lock_key(trip_id, seat_no)
        if self.redis:
            return await self.redis.get(key)
        lock_data = self._in_memory_locks.get(key)
        if lock_data and lock_data["expires_at"] > datetime.utcnow():
            return lock_data["user_id"]
        return None

    async def acquire_multiple_seats(
        self,
        trip_id: str,
        seat_numbers: list[int],
        user_id: str,
        ttl: int = SEAT_LOCK_TTL
    ) -> dict:
        """
        Atomically locks multiple seats.
        If any seat fails, rolls back all acquired locks.
        """
        acquired = []
        result = {"success": True, "locked": [], "failed": []}

        for seat_no in seat_numbers:
            success = await self.acquire_lock(trip_id, seat_no, user_id, ttl)
            if success:
                acquired.append(seat_no)
                result["locked"].append(seat_no)
            else:
                result["failed"].append(seat_no)
                result["success"] = False

        if not result["success"]:
            # Rollback acquired locks
            logger.warning(f"⚠️ Rollback: releasing {len(acquired)} locks due to partial failure")
            for seat_no in acquired:
                await self.release_lock(trip_id, seat_no, user_id)
            result["locked"] = []

        return result


# ─────────────────────────────────────────────────────────────────
# KAFKA EVENT PRODUCER
# Event Sourcing: Every significant action → Kafka topic
# ─────────────────────────────────────────────────────────────────

KAFKA_TOPICS = {
    "SEAT_LOCKED":       "ag.seats.locked",
    "SEAT_RELEASED":     "ag.seats.released",
    "BOOKING_CREATED":   "ag.bookings.created",
    "PAYMENT_INITIATED": "ag.payments.initiated",
    "PAYMENT_COMPLETED": "ag.payments.completed",
    "PAYMENT_FAILED":    "ag.payments.failed",
    "TICKET_ISSUED":     "ag.tickets.issued",
    "NOTIFICATION_SEND": "ag.notifications.queue",
}

class KafkaEventProducer:
    """
    Kafka producer wrapper for event sourcing.
    All business events are published as JSON messages.
    Partition key = trip_id ensures ordering per trip.
    """

    def __init__(self, producer=None, bootstrap_servers="kafka:9092"):
        self.producer = producer  # confluent_kafka.Producer
        self.bootstrap_servers = bootstrap_servers
        self._pending_events = []  # fallback queue for development

    async def publish(
        self,
        event_type: str,
        payload: dict,
        partition_key: Optional[str] = None
    ) -> str:
        """
        Publishes an event to the appropriate Kafka topic.
        Returns event_id for tracking.
        """
        event_id = str(uuid.uuid4())
        topic = KAFKA_TOPICS.get(event_type, "ag.misc")

        envelope = {
            "event_id": event_id,
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "source": "booking-service",
            "version": "1.0",
            "payload": payload,
        }

        if self.producer:
            # Production: Confluent Kafka
            self.producer.produce(
                topic=topic,
                key=partition_key or event_id,
                value=json.dumps(envelope),
                on_delivery=self._delivery_callback,
            )
            self.producer.poll(0)  # Non-blocking
        else:
            # Development: log and store in memory
            logger.info(f"📨 [KAFKA→{topic}] {event_type}: {json.dumps(payload, default=str)}")
            self._pending_events.append(envelope)

        return event_id

    def _delivery_callback(self, err, msg):
        if err:
            logger.error(f"❌ Kafka delivery failed: {err}")
        else:
            logger.debug(f"✅ Kafka: {msg.topic()} [{msg.partition()}] @{msg.offset()}")

    async def publish_seat_locked(self, trip_id: str, seat_no: int, user_id: str) -> str:
        return await self.publish(
            "SEAT_LOCKED",
            {"trip_id": trip_id, "seat_no": seat_no, "user_id": user_id},
            partition_key=trip_id,
        )

    async def publish_booking_created(self, booking: dict) -> str:
        return await self.publish(
            "BOOKING_CREATED",
            booking,
            partition_key=booking.get("trip_id"),
        )

    async def publish_payment_completed(self, booking_id: str, amount: float, user_id: str) -> str:
        return await self.publish(
            "PAYMENT_COMPLETED",
            {"booking_id": booking_id, "amount": amount, "user_id": user_id},
            partition_key=booking_id,
        )

    async def publish_ticket_issued(self, ticket: dict) -> str:
        return await self.publish(
            "TICKET_ISSUED",
            ticket,
            partition_key=ticket.get("booking_id"),
        )

    async def flush(self):
        """Ensure all messages are delivered (call on shutdown)."""
        if self.producer:
            self.producer.flush(timeout=10)


# ─────────────────────────────────────────────────────────────────
# BOOKING ORCHESTRATOR
# Coordinates: Lock → Create Booking → Publish Events
# ─────────────────────────────────────────────────────────────────

class BookingOrchestrator:
    def __init__(
        self,
        seat_lock: SeatLockManager,
        kafka: KafkaEventProducer,
        db=None  # SQLAlchemy AsyncSession
    ):
        self.seat_lock = seat_lock
        self.kafka = kafka
        self.db = db

    async def create_booking(
        self,
        trip_id: str,
        seat_numbers: list[int],
        user_id: str,
        passenger_info: list[dict]
    ) -> dict:
        """
        Full booking flow:
        1. Acquire distributed locks on all seats
        2. Create booking record in PostgreSQL
        3. Publish BOOKING_CREATED event to Kafka
        4. Return booking details
        """

        # Step 1: Lock all seats atomically
        lock_result = await self.seat_lock.acquire_multiple_seats(
            trip_id, seat_numbers, user_id
        )

        if not lock_result["success"]:
            busy_seats = lock_result["failed"]
            return {
                "success": False,
                "message": f"Koltuk(lar) müsait değil: {busy_seats}",
                "code": "SEAT_UNAVAILABLE",
                "busy_seats": busy_seats,
            }

        # Step 2: Create booking (in production: INSERT INTO bookings)
        booking_id = f"BK{uuid.uuid4().hex[:12].upper()}"
        booking = {
            "booking_id": booking_id,
            "trip_id": trip_id,
            "user_id": user_id,
            "seat_numbers": seat_numbers,
            "passenger_info": passenger_info,
            "status": "PENDING_PAYMENT",
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
        }

        # Step 3: Publish to Kafka
        event_id = await self.kafka.publish_booking_created(booking)

        logger.info(f"✅ Booking created: {booking_id} | Event: {event_id}")

        return {
            "success": True,
            "booking_id": booking_id,
            "message": "Rezervasyon oluşturuldu",
            "data": booking,
            "kafka_event_id": event_id,
        }

    async def confirm_booking(self, booking_id: str, payment_data: dict) -> dict:
        """Confirms booking after payment success."""
        ticket_no = f"AG{uuid.uuid4().hex[:8].upper()}"

        ticket = {
            "ticket_no": ticket_no,
            "booking_id": booking_id,
            "payment_data": payment_data,
            "issued_at": datetime.utcnow().isoformat(),
        }

        event_id = await self.kafka.publish_ticket_issued(ticket)

        return {
            "success": True,
            "ticket_no": ticket_no,
            "booking_id": booking_id,
            "kafka_event_id": event_id,
        }


# ─── Singleton instances (wired in app startup) ─────────────────
seat_lock_manager = SeatLockManager()
kafka_producer = KafkaEventProducer()
booking_orchestrator = BookingOrchestrator(seat_lock_manager, kafka_producer)
