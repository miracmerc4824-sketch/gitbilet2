/**
 * ANTIGRAVITY — Digital Twin Bus Tracker
 * Leaflet.js + WebSocket ile otobüsün gerçek zamanlı konumunu gösterir.
 */

const TWIN_WS_BASE  = window.TWIN_WS_URL  || 'ws://10.159.109.35:8007';
const TWIN_API_BASE = window.TWIN_API_URL || 'http://10.159.109.35:8007';

class DigitalTwinTracker {
  constructor(containerId, tripId) {
    this.containerId = containerId;
    this.tripId = tripId;
    this.map = null;
    this.busMarker = null;
    this.routeLine = null;
    this.ws = null;
    this.reconnectTimer = null;
    this.lastPos = null;

    this.init();
  }

  async init() {
    // Ensure Leaflet is loaded
    if (!window.L) {
      await this.loadLeaflet();
    }

    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Initialize map
    this.map = L.map(this.containerId, {
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap ©CartoDB',
      maxZoom: 14,
    }).addTo(this.map);

    // Custom zoom
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Bus icon
    this.busIcon = L.divIcon({
      className: 'bus-icon-wrapper',
      html: `
        <div style="
          background:linear-gradient(135deg,#7c6bff,#00e5ff);
          border:2px solid #fff;
          border-radius:50% 50% 0 50%;
          width:32px; height:32px;
          display:flex; align-items:center; justify-content:center;
          font-size:16px;
          box-shadow:0 0 16px rgba(124,107,255,0.8);
          transform:rotate(45deg);
          animation:pulse-ring 2s infinite;
        ">
          <span style="transform:rotate(-45deg)">🚌</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    // Try to get initial position from REST
    try {
      const res = await fetch(`${TWIN_API_BASE}/api/v1/twin/${this.tripId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.lat) this.updatePosition(data);
      }
    } catch (err) {
      // Demo position (Istanbul → Ankara midpoint)
      this.map.setView([40.2, 31.0], 7);
    }

    // Connect WebSocket
    this.connectWS();
  }

  connectWS() {
    if (this.ws) this.ws.close();

    this.ws = new WebSocket(`${TWIN_WS_BASE}/ws/track/${this.tripId}`);

    this.ws.onopen = () => {
      console.log('🚌 Digital Twin WebSocket connected');
      this.clearReconnect();
    };

    this.ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (!data.error) this.updatePosition(data);
    };

    this.ws.onclose = () => {
      console.warn('🔌 Digital Twin WS closed — reconnecting in 5s');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => this.scheduleReconnect();
  }

  updatePosition(data) {
    const { lat, lon, progress, from_city, to_city, speed_kmh, eta } = data;

    // Smooth interpolation to new position
    if (this.busMarker) {
      this.animateMarker(this.busMarker.getLatLng(), L.latLng(lat, lon));
    } else {
      this.busMarker = L.marker([lat, lon], { icon: this.busIcon }).addTo(this.map);
      this.map.setView([lat, lon], 8, { animate: true, duration: 1 });
    }

    // Draw route line
    if (this.lastPos && this.routeLine) {
      const pts = this.routeLine.getLatLngs();
      pts.push([lat, lon]);
      this.routeLine.setLatLngs(pts);
    } else if (this.lastPos) {
      this.routeLine = L.polyline([[this.lastPos.lat, this.lastPos.lon], [lat, lon]], {
        color: '#7c6bff',
        weight: 3,
        opacity: 0.7,
        dashArray: '6,4',
      }).addTo(this.map);
    }

    this.lastPos = { lat, lon };

    // Update info overlay
    this.updateOverlay({ from_city, to_city, progress, speed_kmh, eta });
  }

  animateMarker(from, to) {
    const steps = 60;
    let step = 0;
    const ticker = setInterval(() => {
      step++;
      const t = step / steps;
      const lat = from.lat + (to.lat - from.lat) * t;
      const lng = from.lng + (to.lng - from.lng) * t;
      if (this.busMarker) this.busMarker.setLatLng([lat, lng]);
      if (step >= steps) clearInterval(ticker);
    }, 83); // ~60fps for 5s
  }

  updateOverlay(data) {
    const el = document.getElementById('twin-overlay');
    if (!el) return;
    const pct = typeof data.progress === 'number' ? data.progress.toFixed(1) : '—';
    const spd = data.speed_kmh ? `${data.speed_kmh} km/h` : '—';
    const eta = data.eta ? new Date(data.eta).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—';

    el.innerHTML = `
      <div class="twin-route">${data.from_city || '—'} → ${data.to_city || '—'}</div>
      <div class="twin-stats">
        <span>📍 ${pct}% tamamlandı</span>
        <span>💨 ${spd}</span>
        <span>🕐 TTA: ${eta}</span>
      </div>
      <div class="twin-progress-bar">
        <div class="twin-progress-fill" style="width:${pct}%"></div>
      </div>
    `;
  }

  scheduleReconnect() {
    this.clearReconnect();
    this.reconnectTimer = setTimeout(() => this.connectWS(), 5000);
  }

  clearReconnect() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  async loadLeaflet() {
    return new Promise(resolve => {
      if (document.getElementById('leaflet-css')) { resolve(); return; }
      const css = document.createElement('link');
      css.id = 'leaflet-css';
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);

      const js = document.createElement('script');
      js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      js.onload = resolve;
      document.head.appendChild(js);
    });
  }

  destroy() {
    if (this.ws) this.ws.close();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.map) this.map.remove();
  }
}

// Styles for overlay
const twinStyle = document.createElement('style');
twinStyle.textContent = `
  .twin-route { font-weight:700; font-size:.9rem; color:#f0f2ff; margin-bottom:8px; }
  .twin-stats { display:flex; gap:12px; font-size:.75rem; color:rgba(255,255,255,0.5); margin-bottom:8px; flex-wrap:wrap; }
  .twin-progress-bar { height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; }
  .twin-progress-fill { height:100%; background:linear-gradient(90deg,#7c6bff,#00e5ff); border-radius:2px; transition:width .5s ease; }
  .bus-icon-wrapper { background:none !important; border:none !important; }
`;
document.head.appendChild(twinStyle);

window.DigitalTwinTracker = DigitalTwinTracker;
