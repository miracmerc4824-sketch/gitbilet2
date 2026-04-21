/**
 * ANTIGRAVITY — Mock API Layer v2
 * Enhanced city data: 81 il with regions, plate numbers, popular flags
 */

/* ─── 81 İL — ENHANCED ─────────────────────────────────────────── */
const CITIES_FULL = [
  // Marmara Bölgesi
  { name: "İstanbul",      plate: 34, region: "Marmara",    icon: "🌉", popular: true,  keywords: ["ist","istanbul"] },
  { name: "Bursa",         plate: 16, region: "Marmara",    icon: "🏔", popular: true,  keywords: ["brs","bursa"] },
  { name: "Kocaeli",       plate: 41, region: "Marmara",    icon: "⚓", popular: true,  keywords: ["izmit","kocaeli"] },
  { name: "Sakarya",       plate: 54, region: "Marmara",    icon: "🌊", popular: false, keywords: ["adapazarı","sakarya"] },
  { name: "Tekirdağ",      plate: 59, region: "Marmara",    icon: "🍇", popular: false, keywords: ["tekirdağ"] },
  { name: "Edirne",        plate: 22, region: "Marmara",    icon: "🕌", popular: false, keywords: ["edirne"] },
  { name: "Kırklareli",    plate: 39, region: "Marmara",    icon: "🌿", popular: false, keywords: ["kırklareli"] },
  { name: "Çanakkale",     plate: 17, region: "Marmara",    icon: "⚓", popular: true,  keywords: ["çanakkale","gelibolu"] },
  { name: "Balıkesir",     plate:  10, region: "Marmara",   icon: "🫒", popular: false, keywords: ["balıkesir"] },
  { name: "Bilecik",       plate: 11, region: "Marmara",    icon: "🌲", popular: false, keywords: ["bilecik"] },
  { name: "Yalova",        plate: 77, region: "Marmara",    icon: "🌺", popular: false, keywords: ["yalova"] },

  // Ege Bölgesi
  { name: "İzmir",         plate: 35, region: "Ege",        icon: "🌅", popular: true,  keywords: ["izmir","smyrna"] },
  { name: "Muğla",         plate: 48, region: "Ege",        icon: "🏖", popular: true,  keywords: ["muğla","bodrum","marmaris"] },
  { name: "Aydın",         plate:  9, region: "Ege",        icon: "🌿", popular: true,  keywords: ["aydın","kuşadası"] },
  { name: "Denizli",       plate: 20, region: "Ege",        icon: "🌊", popular: true,  keywords: ["denizli","pamukkale"] },
  { name: "Manisa",        plate: 45, region: "Ege",        icon: "🍇", popular: false, keywords: ["manisa"] },
  { name: "Afyonkarahisar",plate:  3, region: "Ege",        icon: "🌙", popular: false, keywords: ["afyon","afyonkarahisar"] },
  { name: "Kütahya",       plate: 43, region: "Ege",        icon: "🏺", popular: false, keywords: ["kütahya"] },
  { name: "Uşak",          plate: 64, region: "Ege",        icon: "🌾", popular: false, keywords: ["uşak"] },

  // Akdeniz Bölgesi
  { name: "Antalya",       plate:  7, region: "Akdeniz",    icon: "🌴", popular: true,  keywords: ["antalya","alanya","side"] },
  { name: "Mersin",        plate: 33, region: "Akdeniz",    icon: "🍊", popular: true,  keywords: ["mersin","icel"] },
  { name: "Adana",         plate:  1, region: "Akdeniz",    icon: "🌶", popular: true,  keywords: ["adana"] },
  { name: "Hatay",         plate: 31, region: "Akdeniz",    icon: "🫒", popular: false, keywords: ["hatay","antakya","iskenderun"] },
  { name: "Isparta",       plate: 32, region: "Akdeniz",    icon: "🌹", popular: false, keywords: ["isparta"] },
  { name: "Burdur",        plate: 15, region: "Akdeniz",    icon: "🏔", popular: false, keywords: ["burdur"] },
  { name: "Osmaniye",      plate: 80, region: "Akdeniz",    icon: "🌿", popular: false, keywords: ["osmaniye"] },

  // İç Anadolu Bölgesi
  { name: "Ankara",        plate:  6, region: "İç Anadolu", icon: "🏛", popular: true,  keywords: ["ankara","ank"] },
  { name: "Konya",         plate: 42, region: "İç Anadolu", icon: "🕌", popular: true,  keywords: ["konya"] },
  { name: "Kayseri",       plate: 38, region: "İç Anadolu", icon: "🌋", popular: true,  keywords: ["kayseri","erciyes"] },
  { name: "Eskişehir",     plate: 26, region: "İç Anadolu", icon: "🎓", popular: true,  keywords: ["eskişehir"] },
  { name: "Sivas",         plate: 58, region: "İç Anadolu", icon: "🏔", popular: false, keywords: ["sivas"] },
  { name: "Aksaray",       plate: 68, region: "İç Anadolu", icon: "🌾", popular: false, keywords: ["aksaray"] },
  { name: "Nevşehir",      plate: 50, region: "İç Anadolu", icon: "🎈", popular: true,  keywords: ["nevşehir","kapadokya","göreme"] },
  { name: "Niğde",         plate: 51, region: "İç Anadolu", icon: "🌄", popular: false, keywords: ["niğde"] },
  { name: "Karaman",       plate: 70, region: "İç Anadolu", icon: "🏰", popular: false, keywords: ["karaman"] },
  { name: "Kırıkkale",     plate: 71, region: "İç Anadolu", icon: "⚙", popular: false, keywords: ["kırıkkale"] },
  { name: "Kırşehir",      plate: 40, region: "İç Anadolu", icon: "🌾", popular: false, keywords: ["kırşehir"] },
  { name: "Çankırı",       plate: 18, region: "İç Anadolu", icon: "🌲", popular: false, keywords: ["çankırı"] },

  // Karadeniz Bölgesi
  { name: "Trabzon",       plate: 61, region: "Karadeniz",  icon: "🏔", popular: true,  keywords: ["trabzon"] },
  { name: "Samsun",        plate: 55, region: "Karadeniz",  icon: "⚓", popular: true,  keywords: ["samsun"] },
  { name: "Zonguldak",     plate: 67, region: "Karadeniz",  icon: "⛏", popular: false, keywords: ["zonguldak","kdz ereğli"] },
  { name: "Karabük",       plate: 78, region: "Karadeniz",  icon: "🌲", popular: false, keywords: ["karabük","safranbolu"] },
  { name: "Bolu",          plate: 14, region: "Karadeniz",  icon: "🌲", popular: false, keywords: ["bolu","abant"] },
  { name: "Düzce",         plate: 81, region: "Karadeniz",  icon: "🌿", popular: false, keywords: ["düzce"] },
  { name: "Bartın",        plate: 74, region: "Karadeniz",  icon: "🌊", popular: false, keywords: ["bartın","amasra"] },
  { name: "Kastamonu",     plate: 37, region: "Karadeniz",  icon: "🏰", popular: false, keywords: ["kastamonu"] },
  { name: "Sinop",         plate: 57, region: "Karadeniz",  icon: "⚓", popular: false, keywords: ["sinop"] },
  { name: "Ordu",          plate: 52, region: "Karadeniz",  icon: "🫐", popular: false, keywords: ["ordu","giresun"] },
  { name: "Giresun",       plate: 28, region: "Karadeniz",  icon: "🫐", popular: false, keywords: ["giresun"] },
  { name: "Rize",          plate: 53, region: "Karadeniz",  icon: "🍵", popular: false, keywords: ["rize"] },
  { name: "Artvin",        plate:  8, region: "Karadeniz",  icon: "🌲", popular: false, keywords: ["artvin"] },
  { name: "Gümüşhane",     plate: 29, region: "Karadeniz",  icon: "⛏", popular: false, keywords: ["gümüşhane"] },
  { name: "Bayburt",       plate: 69, region: "Karadeniz",  icon: "🏔", popular: false, keywords: ["bayburt"] },
  { name: "Amasya",        plate:  5, region: "Karadeniz",  icon: "🍎", popular: false, keywords: ["amasya"] },
  { name: "Tokat",         plate: 60, region: "Karadeniz",  icon: "🍎", popular: false, keywords: ["tokat"] },
  { name: "Çorum",         plate: 19, region: "Karadeniz",  icon: "🌾", popular: false, keywords: ["çorum","sungurlu"] },

  // Doğu Anadolu Bölgesi
  { name: "Erzurum",       plate: 25, region: "Doğu Anadolu",  icon: "🏔", popular: true,  keywords: ["erzurum","palandöken"] },
  { name: "Malatya",       plate: 44, region: "Doğu Anadolu",  icon: "🍑", popular: true,  keywords: ["malatya"] },
  { name: "Elazığ",        plate: 23, region: "Doğu Anadolu",  icon: "🌊", popular: false, keywords: ["elazığ"] },
  { name: "Van",           plate: 65, region: "Doğu Anadolu",  icon: "🐱", popular: true,  keywords: ["van","van gölü"] },
  { name: "Erzincan",      plate: 24, region: "Doğu Anadolu",  icon: "🏔", popular: false, keywords: ["erzincan"] },
  { name: "Bingöl",        plate: 12, region: "Doğu Anadolu",  icon: "🌿", popular: false, keywords: ["bingöl"] },
  { name: "Tunceli",       plate: 62, region: "Doğu Anadolu",  icon: "🌊", popular: false, keywords: ["tunceli","dersim"] },
  { name: "Muş",           plate: 49, region: "Doğu Anadolu",  icon: "🌾", popular: false, keywords: ["muş"] },
  { name: "Bitlis",        plate: 13, region: "Doğu Anadolu",  icon: "🏔", popular: false, keywords: ["bitlis"] },
  { name: "Hakkari",       plate: 30, region: "Doğu Anadolu",  icon: "🏔", popular: false, keywords: ["hakkari"] },
  { name: "Ağrı",          plate:  4, region: "Doğu Anadolu",  icon: "🌋", popular: false, keywords: ["ağrı","ağrı dağı"] },
  { name: "Iğdır",         plate: 76, region: "Doğu Anadolu",  icon: "🌾", popular: false, keywords: ["iğdır"] },
  { name: "Kars",          plate: 36, region: "Doğu Anadolu",  icon: "🐂", popular: false, keywords: ["kars"] },
  { name: "Ardahan",       plate: 75, region: "Doğu Anadolu",  icon: "🏔", popular: false, keywords: ["ardahan"] },
  { name: "Yozgat",        plate: 66, region: "İç Anadolu",    icon: "🌾", popular: false, keywords: ["yozgat"] },

  // Güneydoğu Anadolu Bölgesi
  { name: "Gaziantep",     plate: 27, region: "Güneydoğu",  icon: "🫙", popular: true,  keywords: ["gaziantep","antep"] },
  { name: "Diyarbakır",    plate: 21, region: "Güneydoğu",  icon: "🏛", popular: true,  keywords: ["diyarbakır","diyar"] },
  { name: "Şanlıurfa",     plate: 63, region: "Güneydoğu",  icon: "🕌", popular: true,  keywords: ["şanlıurfa","urfa","harran"] },
  { name: "Mardin",        plate: 47, region: "Güneydoğu",  icon: "🏛", popular: true,  keywords: ["mardin"] },
  { name: "Kahramanmaraş", plate: 46, region: "Güneydoğu",  icon: "🌶", popular: false, keywords: ["kahramanmaraş","maraş"] },
  { name: "Batman",        plate: 72, region: "Güneydoğu",  icon: "🌾", popular: false, keywords: ["batman"] },
  { name: "Şırnak",        plate: 73, region: "Güneydoğu",  icon: "🏔", popular: false, keywords: ["şırnak","cizre"] },
  { name: "Siirt",         plate: 56, region: "Güneydoğu",  icon: "🌾", popular: false, keywords: ["siirt"] },
  { name: "Adıyaman",      plate:  2, region: "Güneydoğu",  icon: "🏛", popular: false, keywords: ["adıyaman","nemrut"] },
  { name: "Kilis",         plate: 79, region: "Güneydoğu",  icon: "🫒", popular: false, keywords: ["kilis"] },
];

// Flat list for backward compat
const CITIES = CITIES_FULL.map(c => c.name);

/* ─── Companies ─────────────────────────────────────────────────── */
const COMPANIES = [
  { id: 'metro',     name: 'Metro Turizm',    logo: '🚌', rating: 4.8, color: '#1e40af', founded: 1986, fleet: 500 },
  { id: 'pamukkale', name: 'Pamukkale Tur.',  logo: '🏔', rating: 4.6, color: '#7c3aed', founded: 1972, fleet: 320 },
  { id: 'kamil',     name: 'Kamil Koç',       logo: '⚡', rating: 4.7, color: '#f97316', founded: 1926, fleet: 600 },
  { id: 'ulusoy',    name: 'Ulusoy',          logo: '🌟', rating: 4.9, color: '#059669', founded: 1974, fleet: 280 },
  { id: 'varan',     name: 'Varan Turizm',    logo: '🚀', rating: 4.5, color: '#dc2626', founded: 1946, fleet: 200 },
  { id: 'obilet',    name: 'OBilet Express',  logo: '✨', rating: 4.4, color: '#6d28d9', founded: 2015, fleet: 150 },
  { id: 'su',        name: 'Su Turizm',       logo: '💧', rating: 4.3, color: '#0891b2', founded: 2005, fleet: 100 },
  { id: 'nilu',      name: 'Nilüfer Tur.',    logo: '🌸', rating: 4.2, color: '#be185d', founded: 2000, fleet: 80  },
];

/* ─── Bus Types ─────────────────────────────────────────────────── */
const BUS_TYPES = [
  { id: 'standard',  name: 'Standart', description: '2+2 koltuk', icon: '🚌', multiplier: 1.0 },
  { id: 'business',  name: 'Business', description: '2+1 koltuk', icon: '💺', multiplier: 1.5 },
  { id: 'vip',       name: 'VIP',      description: '1+1 koltuk', icon: '👑', multiplier: 2.0 },
  { id: 'double',    name: 'Çift Katlı', description: '2+2 × 2 kat', icon: '🏢', multiplier: 1.3 },
];

/* ─── All Features ─────────────────────────────────────────────── */
const ALL_FEATURES = [
  '🌐 WiFi',
  '🔌 USB Şarj',
  '☕ İkram',
  '📺 Kişisel Ekran',
  '🧴 Dezenfektan',
  '💺 Yatar Koltuk',
  '❄️ Klima',
  '🎵 Müzik',
  '🔒 Bagaj Kilidi',
  '📰 Gazete',
  '🧊 Soğuk İçecek',
  '🍪 Atıştırmalık',
];

/* ─── Helpers ─────────────────────────────────────────────────── */
const rnd  = (min, max) => Math.floor(Math.random() * (max - min) + min);
const rndChoice = arr => arr[rnd(0, arr.length)];
const pad2 = n => String(n).padStart(2, '0');

function randomTime(startHour = 5, endHour = 23) {
  const h = rnd(startHour, endHour);
  const m = rndChoice([0, 10, 15, 20, 30, 40, 45, 50]);
  return `${pad2(h)}:${pad2(m)}`;
}

function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total  = h * 60 + m + minutes;
  const nextDay = total >= 1440;
  return {
    time: `${pad2(Math.floor(total / 60) % 24)}:${pad2(total % 60)}`,
    nextDay,
  };
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}s ${m}d` : `${h} saat`;
}

function getCityData(name) {
  return CITIES_FULL.find(c => c.name === name);
}

/* ─── Trip Generator ─────────────────────────────────────────── */
function generateTrips(from, to, date) {
  const count = rnd(8, 16);
  const trips = [];

  for (let i = 0; i < count; i++) {
    const company   = rndChoice(COMPANIES);
    const busType   = rndChoice(BUS_TYPES);
    const depTime   = randomTime(5, 23);
    const durationMin = rnd(90, 720);
    const arrResult = addMinutes(depTime, durationMin);
    const totalSeats  = busType.id === 'vip' ? 20 : busType.id === 'business' ? 30 : 44;
    const soldSeats   = rnd(0, totalSeats - 1);
    const basePrice   = rnd(120, 500);
    const finalPrice  = Math.round(basePrice * busType.multiplier);
    const origPrice   = Math.round(finalPrice * (1 + rnd(0, 40) / 100));

    // Randomly choose features
    const featCount = rnd(2, 8);
    const features  = [...ALL_FEATURES].sort(() => Math.random() - 0.5).slice(0, featCount);

    trips.push({
      id: `trip_${Date.now()}_${i}`,
      from,
      to,
      fromCity: getCityData(from),
      toCity:   getCityData(to),
      date,
      company,
      busType,
      departureTime:    depTime,
      arrivalTime:      arrResult.time,
      arrivalNextDay:   arrResult.nextDay,
      durationMinutes:  durationMin,
      durationText:     formatDuration(durationMin),
      price:            finalPrice,
      originalPrice:    finalPrice === origPrice ? null : origPrice,
      totalSeats,
      availableSeats:   totalSeats - soldSeats,
      features,
      comfort:          rnd(60, 100),
      punctuality:      rnd(70, 100),
    });
  }

  return trips.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
}

/* ─── Seat map generator (40 seat, gendered) ─────────────────── */
function generateSeats(tripId, totalSeats = 44) {
  const seats = [];
  const occupiedCount = rnd(5, Math.floor(totalSeats * 0.7));
  const occupiedSet   = new Set();

  while (occupiedSet.size < occupiedCount) {
    occupiedSet.add(rnd(1, totalSeats + 1));
  }

  for (let i = 1; i <= totalSeats; i++) {
    const occupied = occupiedSet.has(i);
    seats.push({
      number: i,
      status: occupied ? 'occupied' : 'available',
      gender: occupied ? rndChoice(['male', 'female']) : null,
    });
  }
  return seats;
}

/* ─── Booking / Payment Mock ─────────────────────────────────── */
async function mockBooking(tripId, seatNumbers, passengerInfo) {
  await delay(1200);
  const bookingId = `BK${Date.now()}`;
  return {
    success: true,
    bookingId,
    message: 'Rezervasyon oluşturuldu',
    data: { bookingId, tripId, seatNumbers, passenger: passengerInfo,
      totalPrice: seatNumbers.length * rnd(150, 450),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() },
  };
}

async function mockPayment(bookingId, paymentInfo) {
  await delay(2000);
  const success = Math.random() > 0.05;
  if (!success) return { success: false, message: 'Ödeme reddedildi. Kart bilgilerini kontrol edin.', code: 'PAYMENT_DECLINED' };
  return {
    success: true,
    transactionId: `TXN${Date.now()}`,
    bookingId,
    message: 'Ödeme tamamlandı',
    ticket: { ticketNo: `AG${Date.now().toString().slice(-8)}`, bookingId, barcode: Array.from({length:13},()=>rnd(0,10)).join('') },
  };
}

/* ─── Auth Mock ──────────────────────────────────────────────── */
const MOCK_USERS = [
  { id:'u1', email:'dev@antigravity.app', password:'123456', name:'Can Yılmaz',  phone:'+90 532 123 45 67', avatar:'🧑‍💻' },
  { id:'u2', email:'test@test.com',       password:'123456', name:'Ayşe Kaya',   phone:'+90 555 987 65 43', avatar:'👩' },
];

async function mockLogin(email, password) {
  await delay(700);
  const user = MOCK_USERS.find(u => u.email === email && u.password === password);
  if (!user) return { success: false, message: 'E-posta veya şifre hatalı' };
  const token = `mock_jwt_${btoa(user.id + ':' + Date.now())}`;
  sessionStorage.setItem('ag_token', token);
  sessionStorage.setItem('ag_user', JSON.stringify(user));
  return { success: true, token, user };
}

async function mockRegister(data) {
  await delay(900);
  const existing = MOCK_USERS.find(u => u.email === data.email);
  if (existing) return { success: false, message: 'Bu e-posta zaten kayıtlı' };
  const newUser = { id:`u${Date.now()}`, email:data.email, password:data.password, name:data.name, phone:data.phone||'', avatar:'👤' };
  MOCK_USERS.push(newUser);
  const token = `mock_jwt_${btoa(newUser.id + ':' + Date.now())}`;
  sessionStorage.setItem('ag_token', token);
  sessionStorage.setItem('ag_user', JSON.stringify(newUser));
  return { success: true, token, user: newUser };
}

function getCurrentUser() { const r=sessionStorage.getItem('ag_user'); return r?JSON.parse(r):null; }
function isLoggedIn()     { return !!sessionStorage.getItem('ag_token'); }
function logout() {
  ['ag_token','ag_user','ag_search','ag_trip','ag_seats','ag_ticket'].forEach(k=>sessionStorage.removeItem(k));
  window.location.href='index.html';
}

/* ─── Session State ─────────────────────────────────────────── */
const saveSearch       = p  => sessionStorage.setItem('ag_search', JSON.stringify(p));
const loadSearch       = () => { const r=sessionStorage.getItem('ag_search'); return r?JSON.parse(r):null; };
const saveSelectedTrip = t  => sessionStorage.setItem('ag_trip',   JSON.stringify(t));
const loadSelectedTrip = () => { const r=sessionStorage.getItem('ag_trip');   return r?JSON.parse(r):null; };
const saveSeats        = s  => sessionStorage.setItem('ag_seats',  JSON.stringify(s));
const loadSeats        = () => { const r=sessionStorage.getItem('ag_seats');  return r?JSON.parse(r):null; };

/* ─── Utilities ─────────────────────────────────────────────── */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatPrice(amount) {
  return new Intl.NumberFormat('tr-TR', { style:'currency', currency:'TRY', minimumFractionDigits:0, maximumFractionDigits:0 }).format(amount);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat('tr-TR', { weekday:'long', year:'numeric', month:'long', day:'numeric' }).format(new Date(dateString));
}

function formatDateShort(dateString) {
  return new Intl.DateTimeFormat('tr-TR', { day:'2-digit', month:'short', weekday:'short' }).format(new Date(dateString));
}

function getTodayDate() { return new Date().toISOString().split('T')[0]; }

function getTomorrowDate() {
  const d = new Date(); d.setDate(d.getDate()+1);
  return d.toISOString().split('T')[0];
}

/* ─── Popular Routes  ────────────────────────────────────────── */
const POPULAR_ROUTES = [
  { from:'İstanbul', to:'Ankara',   minPrice: 180, icon:'🚌' },
  { from:'İstanbul', to:'İzmir',    minPrice: 220, icon:'🚌' },
  { from:'Ankara',   to:'Antalya',  minPrice: 150, icon:'🚌' },
  { from:'İzmir',    to:'İstanbul', minPrice: 220, icon:'🚌' },
  { from:'Bursa',    to:'İzmir',    minPrice: 130, icon:'🚌' },
  { from:'İstanbul', to:'Trabzon',  minPrice: 280, icon:'🚌' },
  { from:'Ankara',   to:'İzmir',    minPrice: 170, icon:'🚌' },
  { from:'İstanbul', to:'Muğla',    minPrice: 260, icon:'🚌' },
  { from:'İstanbul', to:'Gaziantep',minPrice: 320, icon:'🚌' },
  { from:'Ankara',   to:'Konya',    minPrice: 90,  icon:'🚌' },
];

/* ─── Export ─────────────────────────────────────────────────── */
window.AG = {
  CITIES, CITIES_FULL, COMPANIES, BUS_TYPES, ALL_FEATURES, POPULAR_ROUTES,
  mockLogin, mockRegister, getCurrentUser, isLoggedIn, logout,
  generateTrips, generateSeats,
  mockBooking, mockPayment,
  saveSearch, loadSearch, saveSelectedTrip, loadSelectedTrip, saveSeats, loadSeats,
  formatPrice, formatDate, formatDateShort, getTodayDate, getTomorrowDate,
  getCityData, delay,
};
