/**
 * ANTIGRAVITY — Seat Engine
 * Interactive bus seat map: 40 seats, 2+2 layout
 * Real-time seat selection with gender preference
 */

class SeatEngine {
  constructor() {
    this.trip = AG.loadSelectedTrip();
    this.seats = [];
    this.selectedSeats = [];
    this.maxPassengers = parseInt(AG.loadSearch()?.pass || '1');

    this.mapEl      = document.getElementById('seat-map');
    this.summaryEl  = document.getElementById('seat-summary');
    this.continueBtn = document.getElementById('continue-btn');
    this.legendEl   = document.getElementById('seat-legend');
    this.headerEl   = document.getElementById('trip-header');

    if (!this.trip) {
      window.location.href = 'dashboard.html';
      return;
    }

    this._renderTripHeader();
    this._loadSeats();
  }

  _renderTripHeader() {
    if (!this.headerEl) return;
    const t = this.trip;
    this.headerEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
        <div>
          <div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.5rem;">
            <div style="font-size:var(--text-3xl); font-weight:var(--weight-black)">${t.from}</div>
            <div style="color:var(--text-tertiary); font-size:1.5rem">→</div>
            <div style="font-size:var(--text-3xl); font-weight:var(--weight-black)">${t.to}</div>
          </div>
          <div style="display:flex; gap:1rem; color:var(--text-secondary); font-size:var(--text-sm)">
            <span>${t.company.logo} ${t.company.name}</span>
            <span>🕐 ${t.departureTime} - ${t.arrivalTime}</span>
            <span>⏱ ${t.durationText}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:var(--text-3xl); font-weight:var(--weight-black); color:var(--blob-yellow-glow)">
            ${AG.formatPrice(t.price)}
          </div>
          <div style="font-size:var(--text-xs); color:var(--text-tertiary)">kişi başı</div>
        </div>
      </div>
    `;
  }

  async _loadSeats() {
    if (!this.mapEl) return;

    // Loading state
    this.mapEl.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:300px; flex-direction:column; gap:1rem;">
        <div style="
          width:40px; height:40px;
          border:3px solid rgba(124,58,237,0.3);
          border-top-color:var(--blob-purple);
          border-radius:50%;
          animation:spin 0.8s linear infinite;
        "></div>
        <div style="color:var(--text-tertiary); font-size:var(--text-sm)">Koltuklar yükleniyor...</div>
      </div>
    `;

    await AG.delay(700);
    this.seats = AG.generateSeats(this.trip.id);
    this._renderMap();
  }

  _renderMap() {
    if (!this.mapEl) return;

    // Bus shape container
    this.mapEl.innerHTML = `
      <div class="seat-bus-shape">
        <!-- Driver area -->
        <div style="
          display:flex; justify-content:flex-end; align-items:center;
          margin-bottom:var(--space-4); padding-bottom:var(--space-4);
          border-bottom:1px solid var(--glass-border);
        ">
          <div style="font-size:2rem">🚌</div>
          <div style="margin-left:auto; font-size:var(--text-xs); color:var(--text-tertiary)">Şoför</div>
          <div style="
            width:40px; height:40px; border-radius:var(--radius-full);
            background:rgba(255,255,255,0.05); border:1px solid var(--glass-border);
            display:flex; align-items:center; justify-content:center;
            font-size:1.25rem; margin-left:var(--space-3);
          ">🎯</div>
        </div>
        <div id="seat-rows"></div>
      </div>
    `;

    const rowsEl = document.getElementById('seat-rows');
    const totalSeats = this.seats.length;
    const rowCount = Math.ceil(totalSeats / 4);

    for (let row = 0; row < rowCount; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'seat-row';
      rowEl.style.cssText = 'display:grid; grid-template-columns:1fr 1fr 24px 1fr 1fr; gap:6px; margin-bottom:6px;';

      // Seats: 1,2 | aisle | 3,4
      const seatNums = [row * 4 + 1, row * 4 + 2, null, row * 4 + 3, row * 4 + 4];

      seatNums.forEach((seatNum) => {
        if (seatNum === null) {
          // Aisle
          const aisle = document.createElement('div');
          aisle.style.cssText = 'display:flex; align-items:center; justify-content:center; color:var(--text-tertiary); font-size:10px; writing-mode:vertical-rl;';
          rowEl.appendChild(aisle);
          return;
        }

        if (seatNum > totalSeats) {
          const empty = document.createElement('div');
          rowEl.appendChild(empty);
          return;
        }

        const seat = this.seats[seatNum - 1];
        const seatEl = document.createElement('div');
        seatEl.className = `seat${seat.status === 'occupied' ? ' seat--occupied' : ''}`;
        seatEl.dataset.seatNum = seatNum;
        seatEl.innerHTML = `
          <div style="font-size:10px; font-weight:700; line-height:1;">${seatNum}</div>
          ${seat.status === 'occupied' ? `<div style="font-size:8px;">${seat.gender === 'female' ? '♀' : '♂'}</div>` : ''}
        `;
        seatEl.style.cssText = `
          aspect-ratio:1; border-radius:var(--radius-md);
          border:1px solid var(--glass-border);
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          cursor:${seat.status === 'occupied' ? 'not-allowed' : 'pointer'};
          transition:all 0.2s var(--ease-spring);
          background:${seat.status === 'occupied' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)'};
          color:${seat.status === 'occupied' ? 'var(--text-tertiary)' : 'var(--text-secondary)'};
          opacity:${seat.status === 'occupied' ? '0.4' : '1'};
          font-size:var(--text-xs); font-weight:var(--weight-bold);
          user-select:none;
          padding:4px;
        `;

        if (seat.status !== 'occupied') {
          seatEl.addEventListener('click', () => this._toggleSeat(seatNum, seatEl));
        }

        rowEl.appendChild(seatEl);
      });

      rowsEl.appendChild(rowEl);
    }

    this._updateSummary();
  }

  _toggleSeat(seatNum, el) {
    const idx = this.selectedSeats.indexOf(seatNum);

    if (idx > -1) {
      // Deselect
      this.selectedSeats.splice(idx, 1);
      el.style.background = 'rgba(255,255,255,0.04)';
      el.style.borderColor = 'var(--glass-border)';
      el.style.color = 'var(--text-secondary)';
      el.style.boxShadow = 'none';
      el.style.transform = 'scale(1)';
    } else {
      if (this.selectedSeats.length >= this.maxPassengers) {
        this._showToast(`En fazla ${this.maxPassengers} koltuk seçebilirsiniz`, 'error');
        return;
      }

      // Select
      this.selectedSeats.push(seatNum);
      el.style.background = 'linear-gradient(135deg, var(--blob-purple), var(--blob-purple-glow))';
      el.style.borderColor = 'var(--blob-purple-light)';
      el.style.color = '#fff';
      el.style.boxShadow = '0 0 20px rgba(124,58,237,0.5)';
      el.style.transform = 'scale(1.08)';
      setTimeout(() => { el.style.transform = 'scale(1)'; }, 300);
    }

    this._updateSummary();
  }

  _updateSummary() {
    if (!this.summaryEl) return;
    const count = this.selectedSeats.length;
    const total = count * this.trip.price;

    if (count === 0) {
      this.summaryEl.innerHTML = `
        <div style="text-align:center; color:var(--text-tertiary); padding:var(--space-6)">
          Koltuk seçmek için haritaya tıklayın
        </div>
      `;
      if (this.continueBtn) {
        this.continueBtn.disabled = true;
        this.continueBtn.style.opacity = '0.5';
      }
    } else {
      this.summaryEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:var(--space-3)">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--text-secondary); font-size:var(--text-sm)">Seçilen Koltuklar</span>
            <div style="display:flex; gap:var(--space-2); flex-wrap:wrap; justify-content:flex-end">
              ${this.selectedSeats.map(s => `
                <span class="badge badge--purple">${s}. Koltuk</span>
              `).join('')}
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--text-secondary); font-size:var(--text-sm)">${count} Yolcu × ${AG.formatPrice(this.trip.price)}</span>
            <span style="font-size:var(--text-2xl); font-weight:var(--weight-black); color:var(--blob-yellow-glow)">${AG.formatPrice(total)}</span>
          </div>
        </div>
      `;
      if (this.continueBtn) {
        this.continueBtn.disabled = false;
        this.continueBtn.style.opacity = '1';
        this.continueBtn.onclick = () => this._proceed();
      }
    }
  }

  _proceed() {
    if (this.selectedSeats.length === 0) return;

    AG.saveSeats({
      seats: this.selectedSeats,
      total: this.selectedSeats.length * this.trip.price,
    });

    window.location.href = 'payment.html';
  }

  _showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 350);
    }, 3000);
  }
}

window.SeatEngine = SeatEngine;
