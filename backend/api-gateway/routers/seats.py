"""
BILETBUDUR — Seats Router
Returns seat map for a trip, with Redis lock status overlay
"""

from fastapi import APIRouter, Path, HTTPException
import random, asyncio

router = APIRouter()

def _gen_seats(trip_id: str, total: int = 44):
    random.seed(trip_id)           # deterministic per trip_id
    occupied_count = random.randint(5, int(total * 0.65))
    occupied = set(random.sample(range(1, total + 1), occupied_count))

    seats = []
    for n in range(1, total + 1):
        occ = n in occupied
        seats.append({
            "number": n,
            "status": "occupied" if occ else "available",
            "gender": random.choice(["male", "female"]) if occ else None,
            "locked": False,      # would be True if Redis lock exists
        })
    return seats


@router.get("/{trip_id}", summary="Sefer koltuk haritası")
async def get_seats(trip_id: str = Path(..., description="Sefer ID")):
    seats = _gen_seats(trip_id)
    available = sum(1 for s in seats if s["status"] == "available")

    return {
        "success":   True,
        "trip_id":   trip_id,
        "totalSeats":     len(seats),
        "availableSeats": available,
        "occupiedSeats":  len(seats) - available,
        "data":      seats,
    }


@router.post("/{trip_id}/lock", summary="Koltuk kilitle (Redis distributed lock)")
async def lock_seat(trip_id: str, seat_number: int, user_id: str):
    """
    Production'da:
      redis.SET ag:seat_lock:{trip_id}:{seat_no}  {user_id}  NX EX 300
    """
    await asyncio.sleep(0.1)   # simulate Redis round-trip

    # Mock: 90% success rate
    if random.random() < 0.9:
        return {
            "success":  True,
            "locked":   True,
            "key":      f"ag:seat_lock:{trip_id}:{seat_number}",
            "ttl":      300,
            "message":  "Koltuk 5 dakika rezerve edildi",
        }
    raise HTTPException(409, "Koltuk başka bir kullanıcı tarafından kilitlenmiş")


@router.delete("/{trip_id}/lock/{seat_number}", summary="Koltuk kilidini kaldır")
async def unlock_seat(trip_id: str, seat_number: int, user_id: str):
    await asyncio.sleep(0.05)
    return {"success": True, "message": "Kilit kaldırıldı"}
