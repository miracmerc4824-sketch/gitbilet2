/**
 * ANTIGRAVITY — Live Pulse Heatmap
 * Türkiye SVG haritası üzerinde anlık arama yoğunluğunu
 * yanan sönen "nabız" efektleriyle gösterir.
 */

// Popüler rotalar ve koordinatları (SVG viewport 800x480)
const ROUTES = [
  { from: 'İstanbul', to: 'Ankara',   fromXY: [180, 120], toXY: [390, 200], volume: 98 },
  { from: 'İstanbul', to: 'İzmir',    fromXY: [180, 120], toXY: [115, 265], volume: 87 },
  { from: 'İstanbul', to: 'Antalya',  fromXY: [180, 120], toXY: [265, 360], volume: 75 },
  { from: 'İstanbul', to: 'Bodrum',   fromXY: [180, 120], toXY: [140, 330], volume: 68 },
  { from: 'Ankara', to: 'Antalya',    fromXY: [390, 200], toXY: [265, 360], volume: 55 },
  { from: 'İzmir', to: 'Bodrum',      fromXY: [115, 265], toXY: [140, 330], volume: 50 },
  { from: 'İstanbul', to: 'Trabzon',  fromXY: [180, 120], toXY: [570, 105], volume: 45 },
  { from: 'Ankara', to: 'İzmir',      fromXY: [390, 200], toXY: [115, 265], volume: 42 },
  { from: 'Ankara', to: 'Konya',      fromXY: [390, 200], toXY: [375, 295], volume: 38 },
  { from: 'İstanbul', to: 'Bursa',    fromXY: [180, 120], toXY: [230, 155], volume: 78 },
  { from: 'Ankara', to: 'Kayseri',    fromXY: [390, 200], toXY: [480, 255], volume: 32 },
  { from: 'İzmir', to: 'Marmaris',    fromXY: [115, 265], toXY: [170, 360], volume: 29 },
];

// City dot positions on SVG map
const CITIES = {
  'İstanbul':  { x: 180, y: 120 },
  'Ankara':    { x: 390, y: 200 },
  'İzmir':     { x: 115, y: 265 },
  'Antalya':   { x: 265, y: 360 },
  'Bursa':     { x: 230, y: 155 },
  'Trabzon':   { x: 570, y: 105 },
  'Konya':     { x: 375, y: 295 },
  'Bodrum':    { x: 140, y: 330 },
  'Marmaris':  { x: 170, y: 360 },
  'Kayseri':   { x: 480, y: 255 },
  'Samsun':    { x: 490, y: 128 },
  'Erzurum':   { x: 600, y: 180 },
};

// Turkey outline simplified path (fits 800x480)
const TURKEY_PATH = `
M 130,58 L 145,50 L 165,45 L 185,43 L 205,40 L 225,38 L 245,37 L 265,36 L 285,35 L 305,35
L 325,34 L 345,33 L 365,32 L 385,31 L 405,31 L 425,32 L 445,33 L 465,35 L 485,37 L 505,40
L 525,43 L 545,47 L 565,52 L 585,57 L 605,62 L 625,67 L 645,72 L 660,77 L 670,84 L 675,92
L 673,100 L 665,108 L 660,115 L 661,123 L 668,130 L 672,137 L 676,145 L 678,155 L 675,164
L 668,172 L 655,178 L 640,182 L 625,188 L 610,195 L 595,202 L 580,210 L 565,218 L 550,225
L 535,232 L 518,238 L 502,244 L 486,250 L 470,257 L 455,265 L 440,274 L 425,283 L 410,293
L 395,304 L 380,315 L 365,325 L 350,333 L 333,340 L 315,345 L 297,349 L 279,352 L 260,353
L 242,353 L 224,351 L 207,348 L 192,344 L 178,338 L 165,330 L 153,321 L 142,311 L 133,300
L 126,290 L 120,280 L 116,270 L 113,258 L 112,247 L 113,236 L 116,226 L 121,217 L 128,210
L 120,200 L 115,192 L 112,184 L 110,174 L 110,163 L 111,152 L 113,141 L 116,131 L 120,121
L 124,111 L 128,101 L 131,90 L 131,79 L 130,68 L 130,58 Z
`;

class HeatmapEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.svg = null;
    this.animating = false;
    this.tickerInterval = null;
    this.liveCounts = {};
    ROUTES.forEach(r => { this.liveCounts[`${r.from}-${r.to}`] = r.volume; });
  }

  init() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.buildSVG();
    this.startSimulation();
    console.log('🗺 HeatmapEngine: initialized');
  }

  buildSVG() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '80 20 620 360');
    svg.setAttribute('xmlns', ns);
    svg.style.cssText = 'width:100%;height:100%;overflow:visible;';
    this.svg = svg;
    this.container.appendChild(svg);

    // Defs: gradients & filters
    const defs = document.createElementNS(ns, 'defs');
    defs.innerHTML = `
      <filter id="glow-filter">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="city-glow">
        <feGaussianBlur stdDeviation="5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <radialGradient id="map-fill" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#1a1d3a" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#0d0f20" stop-opacity="0.9"/>
      </radialGradient>
    `;
    svg.appendChild(defs);

    // Turkey map background
    const mapPath = document.createElementNS(ns, 'path');
    mapPath.setAttribute('d', TURKEY_PATH);
    mapPath.setAttribute('fill', 'url(#map-fill)');
    mapPath.setAttribute('stroke', 'rgba(124,107,255,0.4)');
    mapPath.setAttribute('stroke-width', '1.5');
    svg.appendChild(mapPath);

    // Route lines
    this._routeLines = {};
    ROUTES.forEach(route => {
      const key = `${route.from}-${route.to}`;
      const intensity = route.volume / 100;

      const line = document.createElementNS(ns, 'path');
      const [x1, y1] = route.fromXY;
      const [x2, y2] = route.toXY;
      // Curved bezier
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2 - 30;
      line.setAttribute('d', `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`);
      line.setAttribute('stroke', this._intensityColor(intensity));
      line.setAttribute('stroke-width', 1 + intensity * 2.5);
      line.setAttribute('fill', 'none');
      line.setAttribute('opacity', '0.6');
      line.setAttribute('filter', 'url(#glow-filter)');
      svg.appendChild(line);
      this._routeLines[key] = line;
    });

    // City dots + pulse rings
    this._cityEls = {};
    Object.entries(CITIES).forEach(([name, { x, y }]) => {
      const g = document.createElementNS(ns, 'g');

      // Pulse ring 1 (outer)
      const ring1 = document.createElementNS(ns, 'circle');
      ring1.setAttribute('cx', x);
      ring1.setAttribute('cy', y);
      ring1.setAttribute('r', 12);
      ring1.setAttribute('fill', 'none');
      ring1.setAttribute('stroke', '#7c6bff');
      ring1.setAttribute('stroke-width', '1.5');
      ring1.setAttribute('opacity', '0');
      ring1.classList.add('pulse-ring-outer');

      // Pulse ring 2 (inner)
      const ring2 = document.createElementNS(ns, 'circle');
      ring2.setAttribute('cx', x);
      ring2.setAttribute('cy', y);
      ring2.setAttribute('r', 7);
      ring2.setAttribute('fill', 'none');
      ring2.setAttribute('stroke', '#00e5ff');
      ring2.setAttribute('stroke-width', '1');
      ring2.setAttribute('opacity', '0');
      ring2.classList.add('pulse-ring-inner');

      // Core dot
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      dot.setAttribute('r', 4);
      dot.setAttribute('fill', '#7c6bff');
      dot.setAttribute('filter', 'url(#city-glow)');

      // Label
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', x + 7);
      label.setAttribute('y', y - 4);
      label.setAttribute('fill', 'rgba(255,255,255,0.7)');
      label.setAttribute('font-size', '8');
      label.setAttribute('font-family', 'Inter, sans-serif');
      label.setAttribute('font-weight', '600');
      label.textContent = name;

      g.appendChild(ring1);
      g.appendChild(ring2);
      g.appendChild(dot);
      g.appendChild(label);
      svg.appendChild(g);

      this._cityEls[name] = { ring1, ring2, dot, g };
    });

    // Inject pulse CSS
    if (!document.getElementById('pulse-style')) {
      const style = document.createElement('style');
      style.id = 'pulse-style';
      style.textContent = `
        @keyframes pulse-outer {
          0%   { r: 4;  opacity: 0.8; }
          100% { r: 22; opacity: 0; }
        }
        @keyframes pulse-inner {
          0%   { r: 4;  opacity: 0.6; }
          100% { r: 14; opacity: 0; }
        }
        .pulse-ring-outer { animation: pulse-outer 1.8s ease-out infinite; }
        .pulse-ring-inner { animation: pulse-inner 1.8s ease-out infinite 0.4s; }
        .pulse-hot .pulse-ring-outer { stroke: #ff6b6b; animation-duration: 1.2s; }
        .pulse-hot .pulse-ring-inner { stroke: #ff9999; animation-duration: 1.2s; }
      `;
      document.head.appendChild(style);
    }

    // Live counter overlay
    this._buildCounter();
  }

  _buildCounter() {
    const div = document.createElement('div');
    div.id = 'heatmap-counter';
    div.style.cssText = `
      position:absolute; top:12px; right:12px;
      background:rgba(0,0,0,0.65);
      backdrop-filter:blur(10px);
      border:1px solid rgba(124,107,255,0.3);
      border-radius:12px; padding:10px 14px;
      color:#fff; font-size:0.78rem;
      font-family:Inter,sans-serif;
    `;
    div.innerHTML = `
      <div style="color:rgba(255,255,255,0.5);margin-bottom:6px;letter-spacing:.06em;font-size:.68rem;font-weight:700;">CANLI ARAMALAR</div>
      <div id="live-search-count" style="font-size:1.6rem;font-weight:800;color:#7c6bff;line-height:1;"></div>
      <div style="color:rgba(255,255,255,0.4);font-size:.68rem;margin-top:2px;">şu an arıyor</div>
    `;
    this.container.style.position = 'relative';
    this.container.appendChild(div);
  }

  _intensityColor(v) {
    // 0→cool blue, 0.5→purple, 1→red-hot
    if (v < 0.3) return `rgba(0,229,255,${0.4 + v})`;
    if (v < 0.6) return `rgba(124,107,255,${0.5 + v * 0.5})`;
    return `rgba(255,${Math.round(107 - v * 107)},${Math.round(107 - v * 107)},${0.6 + v * 0.4})`;
  }

  startSimulation() {
    // Periodically update live counts (simulate real-time search events)
    let totalSearchers = 1200 + Math.floor(Math.random() * 800);

    this.tickerInterval = setInterval(() => {
      totalSearchers += Math.floor(Math.random() * 20) - 5;
      totalSearchers = Math.max(800, Math.min(3000, totalSearchers));

      const el = document.getElementById('live-search-count');
      if (el) el.textContent = totalSearchers.toLocaleString('tr-TR');

      // Randomly boost a route temporarily
      const routeKey = Object.keys(this.liveCounts)[Math.floor(Math.random() * ROUTES.length)];
      const delta = Math.floor(Math.random() * 10) - 4;
      this.liveCounts[routeKey] = Math.max(10, Math.min(100, (this.liveCounts[routeKey] || 50) + delta));

      // Update line colors
      ROUTES.forEach(route => {
        const key = `${route.from}-${route.to}`;
        const line = this._routeLines[key];
        if (line) {
          const intensity = (this.liveCounts[key] || route.volume) / 100;
          line.setAttribute('stroke', this._intensityColor(intensity));
          line.setAttribute('stroke-width', 1 + intensity * 2.5);
        }
      });

      // Hot city pulse
      const hotCity = ROUTES.reduce((max, r) =>
        this.liveCounts[`${r.from}-${r.to}`] > (this.liveCounts[`${max.from}-${max.to}`] || 0) ? r : max
      ).from;

      Object.entries(this._cityEls).forEach(([city, els]) => {
        if (city === hotCity) els.g.classList.add('pulse-hot');
        else els.g.classList.remove('pulse-hot');
      });

    }, 1800);

    // Trigger initial count
    const el = document.getElementById('live-search-count');
    if (el) el.textContent = totalSearchers.toLocaleString('tr-TR');
  }

  destroy() {
    if (this.tickerInterval) clearInterval(this.tickerInterval);
  }
}

window.HeatmapEngine = HeatmapEngine;
