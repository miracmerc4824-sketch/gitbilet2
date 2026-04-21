import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Service Definitions ──────────────────────────────────────────
const SERVICES = [
  { id: 'gateway',      label: 'GW',   name: 'API Gateway',       port: 8000, color: '#7c6bff', icon: '⚡' },
  { id: 'booking',      label: 'BK',   name: 'Booking Service',   port: 8001, color: '#00e59b', icon: '🎫' },
  { id: 'payment',      label: 'PY',   name: 'Payment Service',   port: 8002, color: '#ffa726', icon: '💳' },
  { id: 'notification', label: 'NT',   name: 'Notification',      port: 8003, color: '#ff8fc8', icon: '📧' },
  { id: 'pricing',      label: 'PE',   name: 'Pricing Engine',    port: 8005, color: '#00e5ff', icon: '📈' },
  { id: 'twin',         label: 'DT',   name: 'Digital Twin',      port: 8007, color: '#ff6b6b', icon: '🛰' },
  { id: 'kafka',        label: 'KF',   name: 'Kafka',             port: 9092, color: '#ff4d6d', icon: '📨', noHealth: true },
  { id: 'postgres',     label: 'PG',   name: 'PostgreSQL',        port: 5432, color: '#4169E1', icon: '🗄', noHealth: true },
  { id: 'redis',        label: 'RD',   name: 'Redis',             port: 6379, color: '#DC382D', icon: '⚡', noHealth: true },
  { id: 'elastic',      label: 'ES',   name: 'Elasticsearch',     port: 9200, color: '#F4D03F', icon: '🔍', noHealth: true },
]

const API_BASE = import.meta.env.VITE_API_URL || 'http://10.159.109.35:8000'

// ── Mock log generators ──────────────────────────────────────────
const LOG_TEMPLATES = [
  (t) => ({ level: 'INFO',  svc: 'KAFKA',  msg: `seat.reserved → trip_${rnd(100,999)} seat_${rnd(1,40)}`, t }),
  (t) => ({ level: 'INFO',  svc: 'REDIS',  msg: `SET ag:seat_lock:${rnd(1,40)} NX EX 300 → OK`, t }),
  (t) => ({ level: 'INFO',  svc: 'GATE',   msg: `POST /api/v1/bookings → 201 [${rnd(12,120)}ms]`, t }),
  (t) => ({ level: 'INFO',  svc: 'PG',     msg: `INSERT INTO bookings → id=${rnd(1000,9999)} [${rnd(4,30)}ms]`, t }),
  (t) => ({ level: 'INFO',  svc: 'KAFKA',  msg: `payment.processed → txn_${rnd(10000,99999)}`, t }),
  (t) => ({ level: 'INFO',  svc: 'NOTIFY', msg: `Email dispatched → user_${rnd(1,500)}@mail.com`, t }),
  (t) => ({ level: 'INFO',  svc: 'PRICE',  msg: `Dynamic price: +${rnd(5,15)}% demand spike route ${rnd(1,20)}`, t }),
  (t) => ({ level: 'INFO',  svc: 'GATE',   msg: `GET /api/v1/seats/${rnd(100,999)} → 200 [${rnd(3,25)}ms]`, t }),
  (t) => ({ level: 'WARN',  svc: 'KAFKA',  msg: `Consumer lag: notification-group +${rnd(1,12)} msgs`, t }),
  (t) => ({ level: 'INFO',  svc: 'REDIS',  msg: `EXPIRE ag:seat_lock:${rnd(1,40)} → TTL 245s`, t }),
  (t) => ({ level: 'INFO',  svc: 'ES',     msg: `indexed booking_logs-2026.04 +1 doc [${rnd(2,8)}ms]`, t }),
  (t) => ({ level: 'INFO',  svc: 'PG',     msg: `SELECT * FROM seats WHERE trip_id=… → ${rnd(30,45)} rows`, t }),
]

const LOG_COLORS = { INFO: '#00e59b', WARN: '#ffa726', ERROR: '#ff4d6d' }
const rnd = (a, b) => Math.floor(Math.random() * (b - a) + a)

function timestamp() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}.${String(d.getMilliseconds()).padStart(3,'0')}`
}

// ── Architecture Map ─────────────────────────────────────────────
function ArchMap({ statuses }) {
  const rows = [
    ['gateway'],
    ['booking', 'payment', 'notification', 'pricing', 'twin'],
    ['kafka', 'postgres', 'redis', 'elastic'],
  ]

  return (
    <div className="sip-arch-map">
      {rows.map((row, ri) => (
        <div key={ri} className="sip-arch-row">
          {row.map(id => {
            const svc = SERVICES.find(s => s.id === id)
            const status = statuses[id] ?? 'checking'
            return (
              <div
                key={id}
                className={`sip-node sip-node-${status}`}
                style={{ '--node-color': svc.color }}
                title={`${svc.name} :${svc.port} — ${status}`}
              >
                <span className="sip-node-icon">{svc.icon}</span>
                <span className="sip-node-label">{svc.label}</span>
                <span className={`sip-node-dot sip-dot-${status}`} />
              </div>
            )
          })}
        </div>
      ))}
      <div className="sip-legend-row">
        <span className="sip-leg sip-dot-healthy">● healthy</span>
        <span className="sip-leg sip-dot-checking">◌ checking</span>
        <span className="sip-leg sip-dot-error">● error</span>
      </div>
    </div>
  )
}

// ── Log Stream ───────────────────────────────────────────────────
function LogStream({ logs }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="sip-log-stream" aria-live="polite">
      {logs.map((log, i) => (
        <div key={i} className="sip-log-line">
          <span className="sip-log-time">{log.t}</span>
          <span className="sip-log-svc" style={{ color: SERVICES.find(s => s.label === log.svc || s.id === log.svc.toLowerCase())?.color ?? '#8b92b8' }}>
            [{log.svc}]
          </span>
          <span className="sip-log-level" style={{ color: LOG_COLORS[log.level] }}>
            {log.level}
          </span>
          <span className="sip-log-msg">{log.msg}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────
export default function SystemIntelPanel() {
  const [expanded, setExpanded] = useState(false)
  const [logs, setLogs] = useState([])
  const [tab, setTab] = useState('logs') // 'logs' | 'arch'
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(SERVICES.map(s => [s.id, 'checking']))
  )

  // ── Mock log stream ──────────────────────────────────────────
  useEffect(() => {
    const pushLog = () => {
      const tpl = LOG_TEMPLATES[rnd(0, LOG_TEMPLATES.length)]
      const log = tpl(timestamp())
      setLogs(prev => [...prev.slice(-80), log]) // max 80 lines
    }

    // Initial burst
    for (let i = 0; i < 6; i++) {
      setTimeout(() => pushLog(), i * 120)
    }

    // Ongoing drip
    const interval = setInterval(pushLog, rnd(900, 2200))
    return () => clearInterval(interval)
  }, [])

  // ── Service health polling ────────────────────────────────────
  const pollHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) })
      const ok = res.ok
      setStatuses(prev => ({
        ...prev,
        gateway: ok ? 'healthy' : 'error',
        // When gateway is healthy, infer infra is mostly up
        postgres: ok ? 'healthy' : 'checking',
        redis:    ok ? 'healthy' : 'checking',
        kafka:    ok ? 'healthy' : 'checking',
      }))
      // Simulate other service health based on gateway
      if (ok) {
        setStatuses(prev => ({
          ...prev,
          booking: 'healthy', payment: 'healthy',
          notification: 'healthy', pricing: 'healthy',
          twin: 'healthy', elastic: 'healthy',
        }))
      }
    } catch {
      setStatuses(prev => ({ ...prev, gateway: 'error' }))
    }
  }, [])

  useEffect(() => {
    pollHealth()
    const interval = setInterval(pollHealth, 8000)
    return () => clearInterval(interval)
  }, [pollHealth])

  const healthyCount = Object.values(statuses).filter(s => s === 'healthy').length

  return (
    <div className={`sip-root ${expanded ? 'sip-expanded' : 'sip-collapsed'}`}>
      {/* ── Header ── */}
      <button
        className="sip-header"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        aria-label="System Intelligence Panel"
      >
        <div className="sip-header-left">
          <span className="sip-header-icon">⚙</span>
          <span className="sip-header-title">SYSTEM INTEL</span>
          <span className="sip-header-count">
            <span className="sip-dot-healthy">●</span> {healthyCount}/{SERVICES.length}
          </span>
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: '0.7rem', marginLeft: 4 }}
        >
          ▲
        </motion.span>
      </button>

      {/* ── Body ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="sip-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Tab bar */}
            <div className="sip-tabs">
              <button
                className={`sip-tab ${tab === 'arch' ? 'sip-tab-active' : ''}`}
                onClick={() => setTab('arch')}
              >
                🗺 Mimari
              </button>
              <button
                className={`sip-tab ${tab === 'logs' ? 'sip-tab-active' : ''}`}
                onClick={() => setTab('logs')}
              >
                📡 Canlı Log
              </button>
            </div>

            {tab === 'arch' ? (
              <ArchMap statuses={statuses} />
            ) : (
              <LogStream logs={logs} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
