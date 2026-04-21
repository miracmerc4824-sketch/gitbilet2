/**
 * ANTIGRAVITY — Mood Engine
 * State machine that drives blob character emotions
 * States: IDLE → CURIOUS → SUSPICIOUS → PANIC | VICTORY
 */

class MoodEngine {
  constructor(blobEngine, formElements) {
    this.blob = blobEngine;
    this.form = formElements;
    this.state = 'IDLE';
    this.idleTimer = null;
    this.whisperParticles = [];

    this._bindFormEvents();
    this._startIdleBehavior();
  }

  /* ─── State Machine ─── */
  transition(newState) {
    if (this.state === newState) return;
    const prev = this.state;
    this.state = newState;

    console.log(`[MoodEngine] ${prev} → ${newState}`);

    this.blob.setMood(newState);
    this._onStateEnter(newState, prev);
  }

  _onStateEnter(state, prev) {
    switch (state) {
      case 'IDLE':
        this._clearAllEffects();
        this._startIdleBehavior();
        break;

      case 'CURIOUS':
        this._stopIdleBehavior();
        this._playCuriousEffect();
        break;

      case 'SUSPICIOUS':
        this._stopIdleBehavior();
        this._playSuspiciousEffect();
        break;

      case 'PANIC':
        this._stopIdleBehavior();
        this._playPanicEffect();
        setTimeout(() => this.transition('IDLE'), 1200);
        break;

      case 'VICTORY':
        this._stopIdleBehavior();
        this._playVictoryEffect();
        break;
    }
  }

  /* ─── Form Binding ─── */
  _bindFormEvents() {
    const { emailInput, passwordInput, loginBtn } = this.form;

    // Email typing → CURIOUS
    emailInput?.addEventListener('focus', () => {
      this.transition('CURIOUS');
    });

    emailInput?.addEventListener('blur', () => {
      if (this.state === 'CURIOUS') this.transition('IDLE');
    });

    emailInput?.addEventListener('input', () => {
      this._pulseCurious();
    });

    // Password focus → SUSPICIOUS + reveal Guardian
    passwordInput?.addEventListener('focus', () => {
      this.transition('SUSPICIOUS');
      this.blob.revealGuardian();
    });

    passwordInput?.addEventListener('blur', () => {
      if (this.state === 'SUSPICIOUS') {
        this.transition('IDLE');
        this.blob.hideGuardian();
      }
    });

    passwordInput?.addEventListener('input', (e) => {
      this._onPasswordType(e.target.value);
    });

    // Form submit
    loginBtn?.addEventListener('click', () => {
      this._handleLoginAttempt();
    });
  }

  _onPasswordType(value) {
    // Each keystroke makes the orange blob spring
    window.dispatchEvent(new CustomEvent('blob:curious-spring'));

    // Longer password = more suspicious blend
    if (value.length > 0) {
      this.transition('SUSPICIOUS');
    }
  }

  _handleLoginAttempt() {
    const { emailInput, passwordInput } = this.form;
    const email = emailInput?.value?.trim();
    const pass = passwordInput?.value;

    // Mock validation
    const valid = email && pass && pass.length >= 6;

    if (valid) {
      this.transition('VICTORY');
    } else {
      this.transition('PANIC');
      this._showError();
    }
  }

  /* ─── Idle Behavior ─── */
  _startIdleBehavior() {
    this._stopIdleBehavior();
    this.idleTimer = setInterval(() => {
      // Randomly make blobs "look at each other"
      const rnd = Math.random();
      if (rnd < 0.3) {
        this._playIdleGlance();
      } else if (rnd < 0.5) {
        this._playIdleWiggle();
      }
    }, 3500 + Math.random() * 2000);
  }

  _stopIdleBehavior() {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
  }

  _playIdleGlance() {
    // Blobs briefly look at random positions (simulated via dispatchEvent)
    window.dispatchEvent(new CustomEvent('blob:idle-glance', {
      detail: { x: Math.random(), y: Math.random() }
    }));
  }

  _playIdleWiggle() {
    window.dispatchEvent(new CustomEvent('blob:idle-wiggle'));
  }

  /* ─── Effect Players ─── */
  _playCuriousEffect() {
    // Orange blob gets energy burst on focus
    window.dispatchEvent(new CustomEvent('blob:curious-burst'));
    this._createSparks('curious');
  }

  _pulseCurious() {
    window.dispatchEvent(new CustomEvent('blob:curious-pulse'));
  }

  _playSuspiciousEffect() {
    // Whisper bubbles between blobs
    this._createWhisperBubble();
    window.dispatchEvent(new CustomEvent('blob:suspicious-lean'));
  }

  _playPanicEffect() {
    this.blob.triggerPanic();
    this._createPanicParticles();
    this._shakeForm();
  }

  _playVictoryEffect() {
    // Confetti burst + form fly-away
    this._createConfetti();

    setTimeout(() => {
      this.blob.triggerVictory(() => {
        this._flyFormAway();
      });
    }, 300);
  }

  /* ─── DOM Effects ─── */
  _createWhisperBubble() {
    const existing = document.querySelector('.whisper-bubble');
    if (existing) existing.remove();

    const bubble = document.createElement('div');
    bubble.className = 'whisper-bubble';
    bubble.textContent = '🤫';
    bubble.style.cssText = `
      position: fixed;
      font-size: 24px;
      pointer-events: none;
      z-index: 999;
      left: 30%;
      top: 45%;
      animation: whisperBubble 2s ease-in-out forwards;
    `;
    document.body.appendChild(bubble);
    setTimeout(() => bubble.remove(), 2000);
  }

  _createSparks(type) {
    const colors = type === 'curious'
      ? ['#fb923c', '#fcd34d', '#fde68a']
      : ['#a78bfa', '#c4b5fd', '#ddd6fe'];

    for (let i = 0; i < 8; i++) {
      const spark = document.createElement('div');
      const angle = (i / 8) * 360;
      const dist = 60 + Math.random() * 40;
      spark.style.cssText = `
        position: fixed;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        pointer-events: none;
        z-index: 999;
        left: 50%;
        top: 50%;
        --tx: ${Math.cos(angle * Math.PI / 180) * dist}px;
        --ty: ${Math.sin(angle * Math.PI / 180) * dist}px;
        animation: confettiPop 0.8s ease-out forwards;
        animation-delay: ${i * 30}ms;
      `;
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), 900);
    }
  }

  _createConfetti() {
    const colors = [
      '#7c3aed', '#f97316', '#eab308',
      '#10b981', '#3b82f6', '#ec4899'
    ];

    for (let i = 0; i < 60; i++) {
      const conf = document.createElement('div');
      const angle = Math.random() * 360;
      const dist = 100 + Math.random() * 200;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 6 + Math.random() * 10;

      conf.style.cssText = `
        position: fixed;
        width: ${size}px;
        height: ${size * 0.4}px;
        background: ${color};
        border-radius: 2px;
        pointer-events: none;
        z-index: 9999;
        left: 50%;
        top: 45%;
        --tx: ${Math.cos(angle * Math.PI / 180) * dist}px;
        --ty: ${Math.sin(angle * Math.PI / 180) * dist}px;
        animation: confettiPop ${0.8 + Math.random() * 0.6}s ease-out forwards;
        animation-delay: ${Math.random() * 300}ms;
      `;
      document.body.appendChild(conf);
      setTimeout(() => conf.remove(), 1500);
    }
  }

  _createPanicParticles() {
    const emojiSet = ['😱', '💥', '❗', '😨', '⚡'];
    for (let i = 0; i < 5; i++) {
      const p = document.createElement('div');
      p.textContent = emojiSet[i];
      p.style.cssText = `
        position: fixed;
        font-size: 20px;
        pointer-events: none;
        z-index: 999;
        left: ${30 + Math.random() * 40}%;
        top: ${30 + Math.random() * 30}%;
        animation: confettiPop 0.8s ease-out forwards;
        animation-delay: ${i * 80}ms;
        --tx: ${(Math.random() - 0.5) * 120}px;
        --ty: ${(Math.random() - 0.5) * 120}px;
      `;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }
  }

  _shakeForm() {
    const form = document.querySelector('.login-panel');
    if (!form) return;
    form.style.animation = 'panicShake 0.5s ease-in-out';
    form.addEventListener('animationend', () => {
      form.style.animation = '';
    }, { once: true });
  }

  _flyFormAway() {
    const panel = document.querySelector('.login-panel');
    if (panel) {
      panel.style.animation = 'panelVictoryFly 0.8s var(--ease-in-quint) forwards';
      panel.addEventListener('animationend', () => {
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
      }, { once: true });
    }
  }

  _showError() {
    const hint = document.querySelector('.login-error-hint');
    if (hint) {
      hint.textContent = '! E-posta veya şifre hatalı';
      hint.style.display = 'block';
      hint.style.animation = 'none';
      void hint.offsetWidth;
      hint.style.animation = 'toastSlideIn 0.3s ease forwards';
      setTimeout(() => {
        hint.style.display = 'none';
      }, 3000);
    }

    const passwordInput = this.form.passwordInput;
    if (passwordInput) {
      passwordInput.classList.add('input-field--error');
      setTimeout(() => passwordInput.classList.remove('input-field--error'), 600);
    }
  }

  _clearAllEffects() {
    document.querySelectorAll('.whisper-bubble, .confetti-piece').forEach(el => el.remove());
  }
}

window.MoodEngine = MoodEngine;
