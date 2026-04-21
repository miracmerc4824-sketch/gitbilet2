/**
 * ANTIGRAVITY — Blob Engine
 * Physics-based animated blob characters using Matter.js
 * 4 characters: Purple (Leader), Orange (Curious), Black (Guardian), Yellow (Assistant)
 */

class BlobEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.mouse = { x: this.width / 2, y: this.height / 2 };
    this.blobs = [];
    this.animFrame = null;
    this.currentMood = 'IDLE';

    this._initBlobs();
    this._bindEvents();
    this._startLoop();
  }

  /* ─── Blob Definitions ─── */
  _initBlobs() {
    const cx = this.width / 2;
    const cy = this.height / 2;

    this.blobs = [
      // Purple — The Leader
      new Blob({
        id: 'leader',
        x: cx - 180, y: cy + 40,
        radius: 72,
        color: { r: 124, g: 58, b: 237 },
        glowColor: 'rgba(124,58,237,0.6)',
        mouseFollowSpeed: 0.025,   // slowest — ağırbaşlı
        buoyancy: 0.003,
        personality: 'leader',
        numPoints: 8,
      }),
      // Orange — The Curious
      new Blob({
        id: 'curious',
        x: cx + 200, y: cy - 30,
        radius: 54,
        color: { r: 249, g: 115, b: 22 },
        glowColor: 'rgba(249,115,22,0.6)',
        mouseFollowSpeed: 0.09,   // fastest — hızlı
        buoyancy: 0.007,
        personality: 'curious',
        numPoints: 7,
      }),
      // Black — The Guardian (hidden initially)
      new Blob({
        id: 'guardian',
        x: cx - 30, y: cy + 120,
        radius: 48,
        color: { r: 30, g: 27, b: 75 },
        glowColor: 'rgba(79,70,229,0.5)',
        mouseFollowSpeed: 0.05,
        buoyancy: 0.002,
        personality: 'guardian',
        numPoints: 6,
        opacity: 0,            // invisible by default
      }),
      // Yellow — The Assistant
      new Blob({
        id: 'assistant',
        x: cx + 90, y: cy + 90,
        radius: 44,
        color: { r: 234, g: 179, b: 8 },
        glowColor: 'rgba(234,179,8,0.5)',
        mouseFollowSpeed: 0.045,
        buoyancy: 0.005,
        personality: 'assistant',
        numPoints: 7,
      }),
    ];
  }

  /* ─── Mouse Tracking ─── */
  _bindEvents() {
    document.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.blobs.forEach(b => b.setMouseTarget(this.mouse.x, this.mouse.y));
    });

    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.width = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  /* ─── Mood Setter (called by MoodEngine) ─── */
  setMood(mood) {
    this.currentMood = mood;
    this.blobs.forEach(b => b.setMood(mood));
  }

  /* ─── Main Loop ─── */
  _startLoop() {
    const loop = () => {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.blobs.forEach(blob => {
        blob.update();
        blob.draw(this.ctx);
      });
      this.animFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  revealGuardian() {
    const guardian = this.blobs.find(b => b.id === 'guardian');
    if (guardian) guardian.fadeIn();
  }

  hideGuardian() {
    const guardian = this.blobs.find(b => b.id === 'guardian');
    if (guardian) guardian.fadeOut();
  }

  triggerVictory(callback) {
    this.blobs.forEach((blob, i) => {
      setTimeout(() => {
        blob.triggerVictory(() => {
          if (i === this.blobs.length - 1 && callback) callback();
        });
      }, i * 80);
    });
  }

  triggerPanic() {
    this.blobs.forEach(b => b.triggerPanic());
  }

  destroy() {
    cancelAnimationFrame(this.animFrame);
    document.removeEventListener('mousemove', this._bindEvents);
  }
}

/* ============================================================
   Blob Class — Single Blob Character
   ============================================================ */
class Blob {
  constructor(opts) {
    this.id = opts.id;
    this.x = opts.x;
    this.y = opts.y;
    this.targetX = opts.x;
    this.targetY = opts.y;
    this.baseRadius = opts.radius;
    this.radius = opts.radius;
    this.color = opts.color;
    this.glowColor = opts.glowColor;
    this.mouseFollowSpeed = opts.mouseFollowSpeed;
    this.buoyancy = opts.buoyancy;
    this.personality = opts.personality;
    this.numPoints = opts.numPoints || 8;
    this.opacity = opts.opacity !== undefined ? opts.opacity : 1;
    this.targetOpacity = this.opacity;

    this.mood = 'IDLE';

    // Organic shape state
    this.points = [];
    this.pointVelocities = [];
    this._initPoints();

    // Eye data
    this.eyeL = { x: -0.25, y: -0.15, r: 0.18 };
    this.eyeR = { x: 0.25, y: -0.15, r: 0.18 };
    this.pupilOffset = { x: 0, y: 0 };
    this.targetPupilOffset = { x: 0, y: 0 };
    this.blinkTimer = Math.random() * 200;
    this.blinkDuration = 8;
    this.isBlinking = false;
    this.blinkPhase = 0;
    this.eyeSquint = 0;      // 0=open, 1=fully squinted

    // Idle bobbing
    this.idlePhase = Math.random() * Math.PI * 2;
    this.idleSpeed = 0.008 + Math.random() * 0.004;

    // Panic state
    this.panicVx = 0;
    this.panicVy = 0;
    this.isPanicking = false;

    // Victory explosion
    this.victoryPhase = 0;
    this.isVictory = false;
    this.victoryCallback = null;

    // Scale pulse
    this.scalePulse = 1;
    this.scalePulseTarget = 1;
  }

  _initPoints() {
    for (let i = 0; i < this.numPoints; i++) {
      const angle = (i / this.numPoints) * Math.PI * 2;
      this.points.push({ angle, offset: 0 });
      this.pointVelocities.push((Math.random() - 0.5) * 0.02);
    }
  }

  setMouseTarget(mx, my) {
    // Convert to blob-local coordinates for pupil tracking
    const dx = mx - this.x;
    const dy = my - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxPupilDist = 0.35;
    const norm = Math.min(dist / 300, 1) * maxPupilDist;
    this.targetPupilOffset.x = (dx / (dist || 1)) * norm;
    this.targetPupilOffset.y = (dy / (dist || 1)) * norm;

    // Move body toward mouse
    if (this.mood !== 'PANIC') {
      this.targetX = mx;
      this.targetY = my;
    }
  }

  setMood(mood) {
    this.mood = mood;

    switch (mood) {
      case 'IDLE':
        this.scalePulseTarget = 1;
        this.eyeSquint = 0;
        break;
      case 'CURIOUS':
        this.scalePulseTarget = this.personality === 'curious' ? 1.1 : 1.02;
        this.eyeSquint = 0;
        break;
      case 'SUSPICIOUS':
        this.eyeSquint = 0.5;
        this.scalePulseTarget = 0.97;
        break;
      case 'PANIC':
        this.triggerPanic();
        break;
      case 'VICTORY':
        break;
    }
  }

  fadeIn() {
    this.targetOpacity = 1;
  }

  fadeOut() {
    this.targetOpacity = 0;
  }

  triggerPanic() {
    this.isPanicking = true;
    this.panicVx = (Math.random() - 0.5) * 20;
    this.panicVy = (Math.random() - 0.5) * 20;
    setTimeout(() => {
      this.isPanicking = false;
      this.scalePulseTarget = 1;
    }, 900);
  }

  triggerVictory(callback) {
    this.isVictory = true;
    this.victoryCallback = callback;
    this.victoryPhase = 0;
  }

  update() {
    // Fade opacity
    this.opacity += (this.targetOpacity - this.opacity) * 0.06;

    // Scale pulse
    this.scalePulse += (this.scalePulseTarget - this.scalePulse) * 0.05;

    // Idle bobbing
    this.idlePhase += this.idleSpeed;
    const bobY = Math.sin(this.idlePhase) * 12 * (this.mood === 'IDLE' ? 1 : 0.3);

    // Physics-based body movement
    if (this.isPanicking) {
      this.panicVx *= 0.85;
      this.panicVy *= 0.85;
      this.x += this.panicVx;
      this.y += this.panicVy;
    } else if (!this.isVictory) {
      const tx = this.targetX - 60 * (this.personality === 'leader' ? -2 : this.personality === 'curious' ? 2 : 1);
      const ty = this.targetY + bobY + 40 * (this.personality === 'guardian' ? 2 : 0);
      this.x += (tx - this.x) * this.mouseFollowSpeed;
      this.y += (ty - this.y) * this.mouseFollowSpeed + (ty - this.y) * this.buoyancy * Math.cos(this.idlePhase);
    }

    // Victory: fly to center and burst
    if (this.isVictory) {
      this.victoryPhase += 0.04;
      this.scalePulse = 1 + this.victoryPhase * 0.5;
      this.opacity = Math.max(0, 1 - (this.victoryPhase - 0.8) * 5);
      if (this.victoryPhase > 1 && this.victoryCallback) {
        this.victoryCallback();
        this.victoryCallback = null;
      }
    }

    // Organic shape morphing
    for (let i = 0; i < this.numPoints; i++) {
      this.pointVelocities[i] += (Math.random() - 0.5) * 0.004;
      this.pointVelocities[i] *= 0.92;
      this.points[i].offset += this.pointVelocities[i];
      this.points[i].offset = Math.max(-0.18, Math.min(0.18, this.points[i].offset));
    }

    // Pupil smooth follow
    this.pupilOffset.x += (this.targetPupilOffset.x - this.pupilOffset.x) * 0.08;
    this.pupilOffset.y += (this.targetPupilOffset.y - this.pupilOffset.y) * 0.08;

    // Blink logic
    this.blinkTimer--;
    if (this.blinkTimer <= 0 && !this.isBlinking) {
      this.isBlinking = true;
      this.blinkPhase = 0;
      this.blinkTimer = 150 + Math.random() * 200;
    }
    if (this.isBlinking) {
      this.blinkPhase++;
      if (this.blinkPhase >= this.blinkDuration) {
        this.isBlinking = false;
        this.blinkPhase = 0;
      }
    }
  }

  draw(ctx) {
    if (this.opacity < 0.01) return;

    ctx.save();
    ctx.globalAlpha = Math.min(1, this.opacity);
    ctx.translate(this.x, this.y);
    ctx.scale(this.scalePulse, this.scalePulse);

    const r = this.baseRadius;
    const { r: cr, g: cg, b: cb } = this.color;

    // Glow
    ctx.shadowBlur = 40;
    ctx.shadowColor = this.glowColor;

    // Build organic path
    ctx.beginPath();
    for (let i = 0; i <= this.numPoints; i++) {
      const p = this.points[i % this.numPoints];
      const pNext = this.points[(i + 1) % this.numPoints];
      const angle = (i / this.numPoints) * Math.PI * 2;
      const dist = r * (1 + p.offset);
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevAngle = ((i - 1) / this.numPoints) * Math.PI * 2;
        const prevDist = r * (1 + this.points[(i - 1) % this.numPoints].offset);
        const px = Math.cos(prevAngle) * prevDist;
        const py = Math.sin(prevAngle) * prevDist;
        const cpX = (px + x) / 2;
        const cpY = (py + y) / 2;
        ctx.quadraticCurveTo(px, py, cpX, cpY);
      }
    }
    ctx.closePath();

    // Fill gradient
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 0, 0, 0, r * 1.2);
    grad.addColorStop(0, `rgba(${cr + 40},${cg + 20},${cb + 20},1)`);
    grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},1)`);
    grad.addColorStop(1, `rgba(${Math.max(0, cr - 40)},${Math.max(0, cg - 30)},${Math.max(0, cb - 10)},0.9)`);
    ctx.fillStyle = grad;
    ctx.fill();

    // Specular highlight
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, -r * 0.35, r * 0.25, r * 0.12, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();

    // Draw eyes
    this._drawEyes(ctx, r);

    ctx.restore();
  }

  _drawEyes(ctx, r) {
    const eyeRadius = r * this.eyeL.r;
    const blinkScale = this.isBlinking
      ? Math.abs(Math.sin((this.blinkPhase / this.blinkDuration) * Math.PI))
      : 1;

    // Squint scale for suspicious mode
    const squintY = 1 - this.eyeSquint * 0.6;

    const drawEye = (ex, ey) => {
      ctx.save();
      ctx.translate(r * ex, r * ey);
      ctx.scale(1, blinkScale * squintY);

      // Sclera
      ctx.beginPath();
      ctx.arc(0, 0, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fill();

      // Iris
      ctx.beginPath();
      const iris = eyeRadius * 0.65;
      ctx.arc(
        this.pupilOffset.x * r,
        this.pupilOffset.y * r,
        iris, 0, Math.PI * 2
      );
      const { r: cr, g: cg, b: cb } = this.color;
      ctx.fillStyle = `rgba(${cr},${cg},${cb},1)`;
      ctx.fill();

      // Pupil
      ctx.beginPath();
      ctx.arc(
        this.pupilOffset.x * r * 1.1,
        this.pupilOffset.y * r * 1.1,
        iris * 0.45, 0, Math.PI * 2
      );
      ctx.fillStyle = 'rgba(5,5,15,1)';
      ctx.fill();

      // Eye shine
      ctx.beginPath();
      ctx.arc(-iris * 0.3, -iris * 0.3, iris * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();

      ctx.restore();
    };

    drawEye(this.eyeL.x, this.eyeL.y);
    drawEye(this.eyeR.x, this.eyeR.y);
  }
}

/* Export */
window.BlobEngine = BlobEngine;
