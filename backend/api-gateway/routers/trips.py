"""
BILETBUDUR — Trips Router
FastAPI endpoints for trip search
"""

from fastapi import APIRouter, Query, HTTPException, Depends
from datetime import datetime, timedelta
import random, uuid

router = APIRouter()

# ── Turkish cities ──────────────────────────────────────────────
CITIES = [
    "Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya",
    "Artvin","Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur",
    "Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce",
    "Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun",
    "Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir",
    "Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis",
    "Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya",
    "Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu",
    "Osmaniye","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Şanlıurfa",
    "Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova",
    "Yozgat","Zonguldak","Batman","Bartın","Ardahan","Bayburt","Aksaray",
    "Kırıkkale","Osmaniye","Düzce"
]

COMPANIES = [
    {"id":"metro",     "name":"Metro Turizm",   "logo":"🚌","rating":4.8},
    {"id":"pamukkale", "name":"Pamukkale Tur.", "logo":"🏔","rating":4.6},
    {"id":"kamil",     "name":"Kamil Koç",       "logo":"⚡","rating":4.7},
    {"id":"ulusoy",    "name":"Ulusoy",          "logo":"🌟","rating":4.9},
    {"id":"varan",     "name":"Varan Turizm",    "logo":"🚀","rating":4.5},
    {"id":"su",        "name":"Su Turizm",       "logo":"💧","rating":4.3},
]

BUS_TYPES = ["Standart","Business","VIP","Çift Katlı"]

FEATURES = ["🌐 WiFi","🔌 USB Şarj","☕ İkram","📺 Kişisel Ekran",
            "💺 Yatar Koltuk","❄️ Klima","🎵 Müzik","🍪 Atıştırmalık"]

def _rnd(a, b): return random.randint(a, b)
def _pad(n): return str(n).zfill(2)
def _time(h, m): return f"{_pad(h)}:{_pad(m)}"

def _gen_trips(from_city: str, to_city: str, date: str, count: int = 12):
    trips = []
    for i in range(count):
        company   = random.choice(COMPANIES)
        bus_type  = random.choice(BUS_TYPES)
        total     = 20 if bus_type == "VIP" else 44
        sold      = _rnd(0, total - 1)
        dep_h, dep_m = _rnd(5, 22), random.choice([0,10,15,20,30,40,45])
        dur_min   = _rnd(90, 720)
        arr_total = dep_h * 60 + dep_m + dur_min
        arr_h     = (arr_total // 60) % 24
        arr_m     = arr_total % 60
        price     = _rnd(120, 600)
        feats     = random.sample(FEATURES, _rnd(2, 6))

        trips.append({
            "id":             str(uuid.uuid4()),
            "from":           from_city,
            "to":             to_city,
            "date":           date,
            "departureTime":  _time(dep_h, dep_m),
            "arrivalTime":    _time(arr_h, arr_m),
            "arrivalNextDay": arr_total >= 1440,
            "durationMinutes":dur_min,
            "durationText":   f"{dur_min//60}s {dur_min%60}d" if dur_min%60 else f"{dur_min//60} saat",
            "company":        company,
            "busType":        bus_type,
            "totalSeats":     total,
            "availableSeats": total - sold,
            "price":          price,
            "originalPrice":  round(price * (1 + _rnd(0, 35) / 100)) if _rnd(0, 1) else None,
            "features":       feats,
            "comfort":        _rnd(60, 100),
        })

    return sorted(trips, key=lambda t: t["departureTime"])


@router.get("/cities", summary="Tüm şehirlerin listesi")
async def get_cities():
    return {"success": True, "data": CITIES, "count": len(CITIES)}


@router.get("/search", summary="Sefer ara")
async def search_trips(
    from_city: str = Query(..., alias="from", description="Kalkış şehri"),
    to_city:   str = Query(..., alias="to",   description="Varış şehri"),
    date:      str = Query(...,               description="Tarih (YYYY-MM-DD)"),
    passengers:int = Query(1, ge=1, le=6,    description="Yolcu sayısı"),
):
    if from_city not in CITIES:
        raise HTTPException(400, f"Bilinmeyen şehir: {from_city}")
    if to_city not in CITIES:
        raise HTTPException(400, f"Bilinmeyen şehir: {to_city}")
    if from_city == to_city:
        raise HTTPException(400, "Kalkış ve varış aynı şehir olamaz")

    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Geçersiz tarih formatı. YYYY-MM-DD kullanın")

    trips = _gen_trips(from_city, to_city, date)
    # Filter trips that have enough available seats
    trips = [t for t in trips if t["availableSeats"] >= passengers]

    if not trips:
        return {"success": True, "data": [], "count": 0,
                "message": "Bu güzergah için sefer bulunamadı"}

    min_price = min(t["price"] for t in trips)
    total_seats = sum(t["availableSeats"] for t in trips)
    companies = list({t["company"]["id"] for t in trips})

    return {
        "success":    True,
        "data":       trips,
        "count":      len(trips),
        "meta": {
            "from":          from_city,
            "to":            to_city,
            "date":          date,
            "passengers":    passengers,
            "minPrice":      min_price,
            "totalSeats":    total_seats,
            "companyCount":  len(companies),
        }
    }


@router.get("/{trip_id}", summary="Tek sefer detayı")
async def get_trip(trip_id: str):
    # In production: query PostgreSQL
    return {
        "success": True,
        "data": {
            "id":   trip_id,
            "note": "Production'da PostgreSQL'den gelir",
        }
    }
