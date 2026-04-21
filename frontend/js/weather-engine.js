/**
 * ANTIGRAVITY — Weather Engine (Simulated)
 * Türkiye'nin sezonsal hava durumuna göre temayı dinamik değiştirir.
 * Gerçek API kullanmadan seasonal + random simulation yapar.
 */

const THEMES = {
  sunny: {
    name: 'sunny',
    '--accent-primary':   '#ff9500',
    '--accent-secondary': '#ffcc00',
    '--bg-gradient-1':    '#1a0f00',
    '--bg-gradient-2':    '#2d1800',
    '--hero-gradient':    'linear-gradient(135deg, #ff6b35 0%, #ff9500 50%, #ffcc00 100%)',
    '--glow-color':       'rgba(255, 149, 0, 0.4)',
    '--particle-class':   'sun-particles',
    label: '☀️ Güneşli',
    description: 'Sıcak ve güneşli — harika bir yolculuk vakti!',
  },
  rainy: {
    name: 'rainy',
    '--accent-primary':   '#4fc3f7',
    '--accent-secondary': '#0288d1',
    '--bg-gradient-1':    '#040a12',
    '--bg-gradient-2':    '#071524',
    '--hero-gradient':    'linear-gradient(135deg, #1565c0 0%, #0288d1 50%, #4fc3f7 100%)',
    '--glow-color':       'rgba(79, 195, 247, 0.4)',
    '--particle-class':   'rain-particles',
    label: '🌧 Yağmurlu',
    description: 'Yağmurlu bir gün — otobüs konforu sizin için ideal!',
  },
  cloudy: {
    name: 'cloudy',
    '--accent-primary':   '#90a4ae',
    '--accent-secondary': '#607d8b',
    '--bg-gradient-1':    '#0a0c0e',
    '--bg-gradient-2':    '#141820',
    '--hero-gradient':    'linear-gradient(135deg, #37474f 0%, #546e7a 50%, #90a4ae 100%)',
    '--glow-color':       'rgba(144, 164, 174, 0.3)',
    '--particle-class':   'cloud-particles',
    label: '☁️ Bulutlu',
    description: 'Bulutlu hava — keyifli bir yolculuk dileyiz.',
  },
  snowy: {
    name: 'snowy',
    '--accent-primary':   '#e0f7fa',
    '--accent-secondary': '#80deea',
    '--bg-gradient-1':    '#020a10',
    '--bg-gradient-2':    '#041520',
    '--hero-gradient':    'linear-gradient(135deg, #0277bd 0%, #29b6f6 50%, #e0f7fa 100%)',
    '--glow-color':       'rgba(224, 247, 250, 0.4)',
    '--particle-class':   'snow-particles',
    label: '❄️ Karlı',
    description: 'Kar yağıyor — güvenli yolculuklar için buradasınız!',
  },
  stormy: {
    name: 'stormy',
    '--accent-primary':   '#ce93d8',
    '--accent-secondary': '#ab47bc',
    '--bg-gradient-1':    '#080010',
    '--bg-gradient-2':    '#100520',
    '--hero-gradient':    'linear-gradient(135deg, #4a148c 0%, #7b1fa2 50%, #ce93d8 100%)',
    '--glow-color':       'rgba(206, 147, 216, 0.4)',
    '--particle-class':   'storm-particles',
    label: '⛈ Fırtınalı',
    description: 'Yoğun hava — güvenliğiniz için otobüs tercih edin!',
  },
};

// Seasonal weights for Turkey (month-based)
function getSeasonalWeights() {
  const month = new Date().getMonth() + 1; // 1-12
  // [sunny, rainy, cloudy, snowy, stormy]
  const weights = {
    1:  [5,  20, 35, 30, 10],  // Ocak
    2:  [8,  18, 30, 30, 14],  // Şubat
    3:  [15, 22, 30, 18, 15],  // Mart
    4:  [30, 25, 28, 5,  12],  // Nisan
    5:  [45, 20, 25, 2,  8],   // Mayıs
    6:  [70, 10, 12, 0,  8],   // Haziran
    7:  [80, 5,  10, 0,  5],   // Temmuz
    8:  [75, 8,  12, 0,  5],   // Ağustos
    9:  [55, 15, 20, 0,  10],  // Eylül
    10: [30, 28, 28, 5,  9],   // Ekim
    11: [15, 28, 35, 10, 12],  // Kasım
    12: [8,  22, 35, 25, 10],  // Aralık
  };
  return weights[month] || weights[7];
}

function weightedRandom(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  const keys = Object.keys(THEMES);
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return keys[i];
  }
  return keys[0];
}

// ── Particle Canvas ───────────────────────────────────────────────
function createParticleCanvas() {
  const existing = document.getElementById('weather-canvas');
  if (existing) existing.remove();

  const canvas = document.createElement('canvas');
  canvas.id = 'weather-canvas';
  Object.assign(canvas.style, {
    position: 'fixed',
    top: 0, left: 0,
    width: '100%', height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
    opacity: 0,
    transition: 'opacity 1s ease',
  });
  document.body.prepend(canvas);
  return canvas;
}

class WeatherParticle {
  constructor(type, canvas) {
    this.type = type;
    this.W = canvas.width;
    this.H = canvas.height;
    this.reset();
  }
  reset() {
    this.x = Math.random() * this.W;
    this.y = Math.random() * this.H * -0.5;
    switch (this.type) {
      case 'rain':
        this.vx = Math.random() * 2 - 1;
        this.vy = 8 + Math.random() * 6;
        this.size = 1 + Math.random();
        this.alpha = 0.4 + Math.random() * 0.4;
        this.length = 10 + Math.random() * 15;
        break;
      case 'snow':
        this.vx = Math.random() * 1.5 - 0.75;
        this.vy = 0.8 + Math.random() * 1.2;
        this.size = 2 + Math.random() * 3;
        this.alpha = 0.6 + Math.random() * 0.4;
        this.wobble = Math.random() * Math.PI * 2;
        break;
      case 'sun':
        this.y = Math.random() * this.H;
        this.x = Math.random() * this.W;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = -0.3 - Math.random() * 0.3;
        this.size = 1 + Math.random() * 2;
        this.alpha = 0.3 + Math.random() * 0.4;
        this.life = Math.random();
        break;
    }
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.type === 'snow') this.wobble += 0.02;
    if (this.type === 'sun') { this.alpha -= 0.003; this.size += 0.01; }
    if (this.y > this.H + 20 || this.alpha <= 0) this.reset();
  }
  draw(ctx) {
    ctx.globalAlpha = this.alpha;
    switch (this.type) {
      case 'rain':
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = this.size;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.vx * 3, this.y - this.length);
        ctx.stroke();
        break;
      case 'snow':
        ctx.fillStyle = '#e0f7fa';
        ctx.beginPath();
        ctx.arc(
          this.x + Math.sin(this.wobble) * 2,
          this.y,
          this.size, 0, Math.PI * 2
        );
        ctx.fill();
        break;
      case 'sun':
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4);
        grad.addColorStop(0, `rgba(255,200,50,${this.alpha})`);
        grad.addColorStop(1, 'rgba(255,150,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.globalAlpha = 1;
  }
}

class WeatherEngine {
  constructor() {
    this.currentTheme = null;
    this.particles = [];
    this.animFrame = null;
    this.canvas = null;
    this.ctx = null;
  }

  init() {
    const weights = getSeasonalWeights();
    const themeName = weightedRandom(weights);
    this.applyTheme(themeName);
    console.log(`🌤 WeatherEngine: ${THEMES[themeName].label}`);
  }

  applyTheme(themeName) {
    const theme = THEMES[themeName];
    if (!theme) return;
    this.currentTheme = theme;

    // Apply CSS variables
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, val]) => {
      if (key.startsWith('--')) root.style.setProperty(key, val);
    });

    // Body attribute for conditional CSS
    document.body.setAttribute('data-weather', themeName);

    // Start particles
    this.startParticles(themeName);

    // Show weather badge
    this.showBadge(theme);
  }

  startParticles(themeName) {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.canvas = createParticleCanvas();

    const resize = () => {
      this.canvas.width  = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    this.ctx = this.canvas.getContext('2d');

    let particleType, count;
    switch (themeName) {
      case 'rainy':  particleType = 'rain'; count = 150; break;
      case 'snowy':  particleType = 'snow'; count = 120; break;
      case 'sunny':  particleType = 'sun';  count = 60;  break;
      case 'stormy': particleType = 'rain'; count = 220; break;
      default: count = 0;
    }

    this.particles = Array.from({ length: count }, () =>
      new WeatherParticle(particleType, this.canvas)
    );

    // Spread initial Y
    this.particles.forEach(p => { p.y = Math.random() * this.canvas.height; });

    setTimeout(() => { if (this.canvas) this.canvas.style.opacity = count > 0 ? '1' : '0'; }, 100);

    const animate = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.particles.forEach(p => { p.update(); p.draw(this.ctx); });
      this.animFrame = requestAnimationFrame(animate);
    };
    if (count > 0) animate();
  }

  showBadge(theme) {
    const existing = document.getElementById('weather-badge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id = 'weather-badge';
    badge.innerHTML = `
      <span class="weather-icon">${theme.label.split(' ')[0]}</span>
      <div class="weather-info">
        <strong>${theme.label}</strong>
        <small>${theme.description}</small>
      </div>
    `;
    Object.assign(badge.style, {
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '14px',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      zIndex: 1000,
      color: '#fff',
      fontSize: '0.82rem',
      animation: 'fadeInUp 0.5s ease both',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    });

    badge.addEventListener('click', () => {
      // Cycle to next theme on click (demo)
      const keys = Object.keys(THEMES);
      const idx = keys.indexOf(this.currentTheme?.name || 'sunny');
      this.applyTheme(keys[(idx + 1) % keys.length]);
    });

    badge.title = 'Tıkla: temayı değiştir';
    document.body.appendChild(badge);
  }
}

// Export singleton
window.WeatherEngine = new WeatherEngine();
document.addEventListener('DOMContentLoaded', () => window.WeatherEngine.init());
