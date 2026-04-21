import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BusScene from './BusScene'
import ThemeToggleBtn from './ThemeToggleBtn'
import SystemIntelPanel from './SystemIntelPanel'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Gender icons
const GENDER_ICON = { male: '♂', female: '♀', null: '○' }

// Seat legend items
const LEGEND = [
  { color: 'var(--seat-avail)',   label: 'Boş' },
  { color: 'var(--seat-sold)',    label: 'Dolu' },
  { color: 'var(--seat-female)',  label: 'Kadınlar' },
  { color: 'var(--seat-selected)',label: 'Seçili' },
]

function SeatPanel({ seats, selectedSeats, onToggle }) {
  // 2D flat grid view alongside 3D
  const rows = 10
  const seatsByRow = Array.from({ length: rows }, (_, r) =>
    [1, 2, null, 3, 4].map(offset =>
      offset === null ? null : seats.find(s => s.seat_number === r * 4 + offset) || {
        seat_number: r * 4 + offset,
        status: 'available',
        gender_pref: null,
      }
    )
  )

  return (
    <div className="seat-grid-2d">
      {/* Driver row */}
      <div className="driver-row">
        <span>🚌 Şoför</span>
      </div>
      {seatsByRow.map((row, ri) => (
        <div className="seat-row" key={ri}>
          {row.map((seat, ci) =>
            seat === null
              ? <div className="aisle" key="aisle" />
              : (
                <button
                  key={seat.seat_number}
                  className={`seat-btn ${seat.status} ${selectedSeats.includes(seat.seat_number) ? 'selected' : ''}`}
                  onClick={() => seat.status === 'available' && onToggle(seat.seat_number)}
                  title={`Koltuk ${seat.seat_number}${seat.gender_pref ? ` (${seat.gender_pref === 'female' ? 'Kadın' : 'Erkek'})` : ''}`}
                  disabled={seat.status === 'sold'}
                >
                  <span className="seat-num">{seat.seat_number}</span>
                  {seat.gender_pref && (
                    <span className="seat-gender">
                      {GENDER_ICON[seat.gender_pref]}
                    </span>
                  )}
                </button>
              )
          )}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [seats, setSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [tripInfo, setTripInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('3d') // '3d' | '2d'
  const [showPanel, setShowPanel] = useState(true)
  const [error, setError] = useState(null)

  // Get trip_id from URL
  const params = new URLSearchParams(window.location.search)
  const tripId = params.get('trip_id')

  useEffect(() => {
    if (!tripId) {
      // Demo mode with mock seats
      const mockSeats = Array.from({ length: 40 }, (_, i) => ({
        seat_number: i + 1,
        status: i < 15 ? (Math.random() > 0.5 ? 'sold' : 'available') : 'available',
        gender_pref: i % 4 === 0 ? 'female' : null,
      }))
      setSeats(mockSeats)
      setTripInfo({ from_city: 'İstanbul', to_city: 'Ankara', departure_time: new Date(Date.now() + 2 * 3600000).toISOString(), bus_type: 'VIP' })
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const [seatsRes, tripRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/seats/${tripId}`),
          fetch(`${API_BASE}/api/v1/trips/${tripId}`),
        ])
        if (seatsRes.ok) setSeats(await seatsRes.json())
        if (tripRes.ok) setTripInfo(await tripRes.json())
      } catch (err) {
        setError('API bağlantısı kurulamadı — demo modda çalışıyorsunuz')
        // Demo fallback
        setSeats(Array.from({ length: 40 }, (_, i) => ({
          seat_number: i + 1,
          status: i < 12 ? 'sold' : 'available',
          gender_pref: i % 4 === 0 ? 'female' : null,
        })))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 10000) // refresh every 10s
    return () => clearInterval(interval)
  }, [tripId])

  const handleSeatToggle = useCallback((seatNum) => {
    setSelectedSeats(prev =>
      prev.includes(seatNum)
        ? prev.filter(s => s !== seatNum)
        : prev.length < 4
        ? [...prev, seatNum]
        : prev  // max 4 seats
    )
  }, [])

  const totalPrice = useMemo_price(tripInfo, selectedSeats.length)

  const handleContinue = () => {
    if (selectedSeats.length === 0) return
    const searchParams = new URLSearchParams({
      trip_id: tripId || 'demo',
      seats: selectedSeats.join(','),
      price: totalPrice,
    })
    window.location.href = `/payment.html?${searchParams}`
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="app-root">
      {/* Header */}
      <header className="app-header glass animate-in">
        <button className="back-btn" onClick={() => history.back()}>
          ← Geri
        </button>
        {tripInfo && (
          <div className="trip-info">
            <span className="route-text">
              {tripInfo.from_city} → {tripInfo.to_city}
            </span>
            <span className="bus-badge">{tripInfo.bus_type}</span>
          </div>
        )}
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === '3d' ? 'active' : ''}`}
            onClick={() => setViewMode('3d')}
          >
            🎮 3D
          </button>
          <button
            className={`toggle-btn ${viewMode === '2d' ? 'active' : ''}`}
            onClick={() => setViewMode('2d')}
          >
            📋 2D
          </button>
        </div>
        <ThemeToggleBtn />
      </header>

      {error && (
        <div className="error-banner animate-in">
          ⚠️ {error}
        </div>
      )}

      {/* Main Layout */}
      <div className="main-layout">
        {/* 3D Canvas */}
        <div className={`canvas-container ${viewMode === '2d' ? 'hidden' : ''}`}>
          <BusScene
            seats={seats}
            selectedSeats={selectedSeats}
            onSeatClick={handleSeatToggle}
          />
          <div className="canvas-hint">
            🖱️ Sürükle: döndür • Kaydır: zoom • Tıkla: koltuk seç
          </div>
        </div>

        {/* 2D Flat View */}
        <AnimatePresence mode="wait">
          {viewMode === '2d' && (
            <motion.div
              className="flat-view-container"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <SeatPanel
                seats={seats}
                selectedSeats={selectedSeats}
                onToggle={handleSeatToggle}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Side Panel */}
        <AnimatePresence>
          {showPanel && (
            <motion.aside
              className="side-panel glass"
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 25 }}
            >
              {/* Legend */}
              <div className="panel-section">
                <h3 className="panel-title">Koltuk Durumları</h3>
                <div className="legend-grid">
                  {LEGEND.map(l => (
                    <div key={l.label} className="legend-item">
                      <div className="legend-dot" style={{ background: l.color }} />
                      <span>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="panel-section stats-row">
                <div className="stat-box">
                  <span className="stat-num available-count">
                    {seats.filter(s => s.status === 'available').length}
                  </span>
                  <span className="stat-label">Boş</span>
                </div>
                <div className="stat-box">
                  <span className="stat-num sold-count">
                    {seats.filter(s => s.status === 'sold').length}
                  </span>
                  <span className="stat-label">Dolu</span>
                </div>
                <div className="stat-box">
                  <span className="stat-num selected-count">
                    {selectedSeats.length}
                  </span>
                  <span className="stat-label">Seçili</span>
                </div>
              </div>

              {/* Selected seats list */}
              <div className="panel-section">
                <h3 className="panel-title">Seçilen Koltuklar</h3>
                {selectedSeats.length === 0 ? (
                  <p className="empty-hint">3D görünümde koltuk tıklayın<br />ya da 2D haritadan seçin</p>
                ) : (
                  <div className="selected-list">
                    <AnimatePresence>
                      {selectedSeats.map(sn => (
                        <motion.div
                          key={sn}
                          className="selected-chip"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        >
                          <span>Koltuk {sn}</span>
                          <button
                            className="chip-remove"
                            onClick={() => handleSeatToggle(sn)}
                          >
                            ×
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Price + CTA */}
              {selectedSeats.length > 0 && (
                <motion.div
                  className="price-section"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="price-row">
                    <span>Toplam</span>
                    <span className="price-amount">
                      {totalPrice.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <motion.button
                    className="btn btn-primary continue-btn"
                    onClick={handleContinue}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Devam Et →
                  </motion.button>
                </motion.div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Panel toggle (mobile) */}
      <button
        className="panel-toggle glass"
        onClick={() => setShowPanel(p => !p)}
        title={showPanel ? 'Paneli Kapat' : 'Paneli Aç'}
      >
        {showPanel ? '›' : '‹'}
      </button>

      {/* System Intelligence Panel */}
      <SystemIntelPanel />
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────
function useMemo_price(tripInfo, count) {
  if (!tripInfo) return 0
  // Demo pricing by bus type
  const basePrice = tripInfo.price ||
    (tripInfo.bus_type === 'VIP' ? 420 : tripInfo.bus_type === 'Comfort' ? 320 : 250)
  return basePrice * count
}

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', flexDirection: 'column', gap: 16,
      background: 'var(--bg-deep)',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid transparent',
        borderTopColor: 'var(--accent-1)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--text-secondary)' }}>3D sahne yükleniyor…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
