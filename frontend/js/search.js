/**
 * ANTIGRAVITY — Search Engine v2
 * Enhanced: grouped city dropdown, plate numbers, region badges,
 * passenger stepper, round-trip toggle, results with filters
 */

/* ══════════════════════════════════════════════════════════════
   CITY AUTOCOMPLETE — Grouped by region, shows plate & icon
══════════════════════════════════════════════════════════════ */
class CityAutocomplete {
  constructor(inputEl, dropdownEl, opts = {}) {
    this.input    = inputEl;
    this.dropdown = dropdownEl;
    this.onSelect = opts.onSelect || (() => {});
    this.exclude  = opts.exclude   || null;   // getter → city to exclude

    this._active = -1;
    this._filtered = [];
    this._bind();
  }

  _bind() {
    this.input.addEventListener('input',   () => this._show());
    this.input.addEventListener('focus',   () => this._show());
    this.input.addEventListener('keydown', e => this._keyNav(e));
    this.input.addEventListener('blur',    () => setTimeout(() => this._hide(), 180));
  }

  _show() {
    const q = this._normalize(this.input.value);
    const exclude = this.exclude ? this._normalize(this.exclude()) : '';

    let pool = AG.CITIES_FULL.filter(c => this._normalize(c.name) !== exclude);

    if (q.length === 0) {
      // Show popular first, then rest
      this._filtered = [
        ...pool.filter(c => c.popular),
        ...pool.filter(c => !c.popular),
      ].slice(0, 10);
    } else {
      this._filtered = pool.filter(c =>
        this._normalize(c.name).includes(q) ||
        c.keywords.some(k => k.includes(q)) ||
        String(c.plate).startsWith(q)
      ).slice(0, 12);
    }

    if (this._filtered.length === 0) { this._hide(); return; }

    this._active = -1;
    this._render(q);
    this.dropdown.style.display = 'block';
  }

  _normalize(str) {
    return str.toLocaleLowerCase('tr')
      .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
      .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c');
  }

  _render(q) {
    this.dropdown.innerHTML = '';

    // Group by region when query is empty
    if (q.length === 0) {
      const byRegion = {};
      this._filtered.forEach(c => {
        if (!byRegion[c.region]) byRegion[c.region] = [];
        byRegion[c.region].push(c);
      });

      Object.entries(byRegion).forEach(([region, cities]) => {
        const header = document.createElement('div');
        header.className = 'dropdown-region-header';
        header.textContent = region;
        this.dropdown.appendChild(header);
        cities.forEach((c, i) => this._renderItem(c, q, this.dropdown));
      });
    } else {
      this._filtered.forEach((c, i) => this._renderItem(c, q, this.dropdown));
    }
  }

  _renderItem(city, q, container) {
    const el = document.createElement('div');
    el.className = 'city-dropdown-item';
    el.dataset.name = city.name;

    const nameHtml = q ? this._highlight(city.name, q) : city.name;

    el.innerHTML = `
      <div class="cdi__icon">${city.icon}</div>
      <div class="cdi__info">
        <div class="cdi__name">${nameHtml}</div>
        <div class="cdi__meta">
          <span class="cdi__region">${city.region}</span>
          ${city.popular ? '<span class="cdi__popular">Popüler</span>' : ''}
        </div>
      </div>
      <div class="cdi__plate">${String(city.plate).padStart(2,'0')}</div>
    `;

    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.input.value = city.name;
      this._hide();
      this.onSelect(city);
    });

    container.appendChild(el);
  }

  _highlight(text, q) {
    const nText = this._normalize(text);
    const idx   = nText.indexOf(q);
    if (idx === -1) return text;
    return text.slice(0, idx) +
      `<mark>${text.slice(idx, idx + q.length)}</mark>` +
      text.slice(idx + q.length);
  }

  _keyNav(e) {
    const items = this.dropdown.querySelectorAll('.city-dropdown-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._active = Math.min(this._active + 1, items.length - 1);
      this._highlight_active(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._active = Math.max(this._active - 1, 0);
      this._highlight_active(items);
    } else if (e.key === 'Enter' && this._active >= 0) {
      e.preventDefault();
      items[this._active].dispatchEvent(new MouseEvent('mousedown'));
    } else if (e.key === 'Escape') {
      this._hide();
    }
  }

  _highlight_active(items) {
    items.forEach((el, i) => el.classList.toggle('active', i === this._active));
    if (this._active >= 0) items[this._active].scrollIntoView({ block: 'nearest' });
  }

  _hide() {
    this.dropdown.style.display = 'none';
    this._active = -1;
  }

  setValue(name) { this.input.value = name; }
  getValue()     { return this.input.value.trim(); }
  clear()        { this.input.value = ''; }
}


/* ══════════════════════════════════════════════════════════════
   PASSENGER STEPPER
══════════════════════════════════════════════════════════════ */
class PassengerStepper {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.count = 1;
    this._render();
  }

  _render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="passenger-stepper">
        <button class="stepper-btn" id="pass-dec" aria-label="Yolcu azalt">−</button>
        <div class="stepper-display">
          <span id="pass-count">1</span>
          <span class="stepper-label">Yolcu</span>
        </div>
        <button class="stepper-btn" id="pass-inc" aria-label="Yolcu artır">+</button>
      </div>
    `;

    document.getElementById('pass-dec').addEventListener('click', () => this._dec());
    document.getElementById('pass-inc').addEventListener('click', () => this._inc());
  }

  _dec() {
    if (this.count > 1) { this.count--; this._update(); }
  }
  _inc() {
    if (this.count < 6) { this.count++; this._update(); }
  }
  _update() {
    const el = document.getElementById('pass-count');
    if (el) el.textContent = this.count;
    const dec = document.getElementById('pass-dec');
    const inc = document.getElementById('pass-inc');
    if (dec) dec.style.opacity = this.count <= 1 ? '0.3' : '1';
    if (inc) inc.style.opacity = this.count >= 6 ? '0.3' : '1';
  }

  getValue() { return this.count; }
  setValue(v) { this.count = v; this._update(); }
}


/* ══════════════════════════════════════════════════════════════
   DATE PICKER HELPER (quick + / − navigation)
══════════════════════════════════════════════════════════════ */
class DateNavigator {
  constructor(inputId) {
    this.input = document.getElementById(inputId);
    this._setMin();
  }

  _setMin() {
    if (this.input) {
      this.input.min = AG.getTodayDate();
      if (!this.input.value) this.input.value = AG.getTodayDate();
    }
  }

  prev() {
    const d = new Date(this.input.value);
    d.setDate(d.getDate() - 1);
    if (d >= new Date(AG.getTodayDate())) {
      this.input.value = d.toISOString().split('T')[0];
    }
  }

  next() {
    const d = new Date(this.input.value);
    d.setDate(d.getDate() + 1);
    this.input.value = d.toISOString().split('T')[0];
  }

  getValue() { return this.input ? this.input.value : AG.getTodayDate(); }
  setValue(v) { if (this.input) this.input.value = v; }
}


/* ══════════════════════════════════════════════════════════════
   SEARCH FORM CONTROLLER
══════════════════════════════════════════════════════════════ */
class SearchEngine {
  constructor() {
    this.fromAC  = null;
    this.toAC    = null;
    this.datNav  = null;
    this.stepper = null;
    this.roundTrip = false;

    this._init();
    this._restoreState();
  }

  _init() {
    // City autocompletes
    const fromInput    = document.getElementById('from-city');
    const toInput      = document.getElementById('to-city');
    const fromDropdown = document.getElementById('from-dropdown');
    const toDropdown   = document.getElementById('to-dropdown');

    if (fromInput && fromDropdown) {
      this.fromAC = new CityAutocomplete(fromInput, fromDropdown, {
        exclude: () => this.toAC ? this.toAC.getValue() : '',
        onSelect: () => this._validate(),
      });
    }

    if (toInput && toDropdown) {
      this.toAC = new CityAutocomplete(toInput, toDropdown, {
        exclude: () => this.fromAC ? this.fromAC.getValue() : '',
        onSelect: () => this._validate(),
      });
    }

    // Date navigator
    this.datNav  = new DateNavigator('travel-date');

    // Passenger stepper
    this.stepper = new PassengerStepper('passenger-stepper');

    // Round trip toggle
    const rtBtn = document.getElementById('round-trip-toggle');
    if (rtBtn) {
      rtBtn.addEventListener('click', () => {
        this.roundTrip = !this.roundTrip;
        rtBtn.classList.toggle('active', this.roundTrip);
        const returnDate = document.getElementById('return-date-wrap');
        if (returnDate) {
          returnDate.style.display = this.roundTrip ? 'flex' : 'none';
        }
      });
    }

    // Swap button
    document.getElementById('swap-cities')?.addEventListener('click', () => this._swap());

    // Date prev/next
    document.getElementById('date-prev')?.addEventListener('click', () => this.datNav.prev());
    document.getElementById('date-next')?.addEventListener('click', () => this.datNav.next());

    // Search button
    document.getElementById('search-btn')?.addEventListener('click', () => this._doSearch());

    // Popular routes
    document.querySelectorAll('[data-from][data-to]').forEach(el => {
      el.addEventListener('click', () => {
        this.fromAC?.setValue(el.dataset.from);
        this.toAC?.setValue(el.dataset.to);
        this._validate();
        setTimeout(() => this._doSearch(), 200);
      });
    });

    // Enter key
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) {
        this._doSearch();
      }
    });
  }

  _restoreState() {
    const saved = AG.loadSearch();
    if (!saved) return;
    this.fromAC?.setValue(saved.from || '');
    this.toAC?.setValue(saved.to || '');
    this.datNav?.setValue(saved.date || AG.getTodayDate());
    this.stepper?.setValue(parseInt(saved.pass) || 1);
    this._validate();
  }

  _swap() {
    if (!this.fromAC || !this.toAC) return;
    const from = this.fromAC.getValue();
    const to   = this.toAC.getValue();
    // Animate
    [document.getElementById('from-city'), document.getElementById('to-city')].forEach(el => {
      el.style.transition = 'opacity 0.2s';
      el.style.opacity = '0';
    });
    setTimeout(() => {
      this.fromAC.setValue(to);
      this.toAC.setValue(from);
      [document.getElementById('from-city'), document.getElementById('to-city')].forEach(el => {
        el.style.opacity = '1';
      });
      this._validate();
    }, 200);
  }

  _validate() {
    const from = this.fromAC?.getValue();
    const to   = this.toAC?.getValue();
    const btn  = document.getElementById('search-btn');
    const valid = from && to && from !== to &&
      AG.CITIES.includes(from) && AG.CITIES.includes(to);

    if (btn) {
      btn.disabled = !valid;
      btn.style.opacity = valid ? '1' : '0.6';
    }
    return valid;
  }

  _doSearch() {
    if (!this._validate()) {
      this._flashErrors();
      return;
    }

    const params = {
      from: this.fromAC.getValue(),
      to:   this.toAC.getValue(),
      date: this.datNav.getValue(),
      pass: this.stepper.getValue(),
    };

    AG.saveSearch(params);

    const btn = document.getElementById('search-btn');
    if (btn) {
      btn.innerHTML = `<div class="btn__spinner"></div> Aranıyor...`;
      btn.disabled = true;
    }

    setTimeout(() => { window.location.href = 'dashboard.html?results=1'; }, 500);
  }

  _flashErrors() {
    const from = this.fromAC?.getValue();
    const to   = this.toAC?.getValue();
    if (!from || !AG.CITIES.includes(from)) {
      document.getElementById('from-city')?.classList.add('input-error');
      setTimeout(() => document.getElementById('from-city')?.classList.remove('input-error'), 700);
    }
    if (!to || !AG.CITIES.includes(to)) {
      document.getElementById('to-city')?.classList.add('input-error');
      setTimeout(() => document.getElementById('to-city')?.classList.remove('input-error'), 700);
    }
    if (from && to && from === to) {
      showToast('Kalkış ve varış aynı şehir olamaz!', 'error');
    }
  }
}


/* ══════════════════════════════════════════════════════════════
   RESULTS ENGINE — Filter, Sort, Render
══════════════════════════════════════════════════════════════ */
class ResultsEngine {
  constructor() {
    this.container  = document.getElementById('results-container');
    this.params     = AG.loadSearch();
    this.trips      = [];
    this.filtered   = [];

    this.filters = {
      sort:        'departure',
      companies:   new Set(),
      busTypes:    new Set(),
      priceMin:    0,
      priceMax:    9999,
      depHours:    [0, 24],
      featWifi:    false,
      featIkram:   false,
      featYatar:   false,
    };

    if (this.params && this.container) {
      this._updateHeader();
      this._loadResults();
    }
  }

  _updateHeader() {
    const el = document.getElementById('results-header');
    if (el && this.params) {
      const fromCity = AG.getCityData(this.params.from);
      const toCity   = AG.getCityData(this.params.to);
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:0.75rem">
            <span style="font-size:1.75rem">${fromCity?.icon || '🏙'}</span>
            <div>
              <div style="font-size:var(--text-2xl);font-weight:var(--weight-black);letter-spacing:-0.02em">${this.params.from}</div>
              <div style="font-size:var(--text-xs);color:var(--text-tertiary)">${fromCity?.region || ''}</div>
            </div>
          </div>
          <svg width="32" height="16" viewBox="0 0 32 16" fill="none" style="color:var(--blob-purple);flex-shrink:0">
            <path d="M0 8h28M22 2l8 6-8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div style="display:flex;align-items:center;gap:0.75rem">
            <span style="font-size:1.75rem">${toCity?.icon || '🏙'}</span>
            <div>
              <div style="font-size:var(--text-2xl);font-weight:var(--weight-black);letter-spacing:-0.02em">${this.params.to}</div>
              <div style="font-size:var(--text-xs);color:var(--text-tertiary)">${toCity?.region || ''}</div>
            </div>
          </div>
          <div class="badge badge--purple" style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">${AG.formatDate(this.params.date)}</div>
          <div class="badge badge--orange">${this.params.pass} Yolcu</div>
        </div>
      `;
    }
  }

  async _loadResults() {
    this._showSkeleton();
    await AG.delay(800);
    this.trips    = AG.generateTrips(this.params.from, this.params.to, this.params.date);
    this.filtered = [...this.trips];
    this._buildFilters();
    this._applyFilters();
    this._renderStats();
  }

  _showSkeleton() {
    if (!this.container) return;
    this.container.innerHTML = Array(5).fill(0).map(() => `
      <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-xl);padding:1.5rem;display:flex;flex-direction:column;gap:0.75rem;">
        <div class="skeleton" style="height:14px;width:35%;border-radius:6px;"></div>
        <div class="skeleton" style="height:44px;width:75%;border-radius:8px;"></div>
        <div class="skeleton" style="height:14px;width:55%;border-radius:6px;"></div>
        <div class="skeleton" style="height:24px;width:40%;border-radius:6px;"></div>
      </div>
    `).join('');
  }

  _buildFilters() {
    // Populate company filter
    const compWrap = document.getElementById('filter-companies');
    if (compWrap) {
      const usedCompanies = [...new Set(this.trips.map(t => t.company.id))];
      const allComps = AG.COMPANIES.filter(c => usedCompanies.includes(c.id));
      compWrap.innerHTML = allComps.map(c => `
        <label class="filter-check-label" data-comp="${c.id}">
          <input type="checkbox" class="filter-comp-cb" data-comp="${c.id}" />
          <span class="filter-check-box"></span>
          <span>${c.logo} ${c.name}</span>
          <span class="filter-count">${this.trips.filter(t=>t.company.id===c.id).length}</span>
        </label>
      `).join('');

      compWrap.querySelectorAll('.filter-comp-cb').forEach(cb => {
        cb.addEventListener('change', () => {
          const id = cb.dataset.comp;
          if (cb.checked) this.filters.companies.add(id);
          else this.filters.companies.delete(id);
          this._applyFilters();
        });
      });
    }

    // Bus type filter
    const busWrap = document.getElementById('filter-bustypes');
    if (busWrap) {
      const usedBus = [...new Set(this.trips.map(t => t.busType.id))];
      busWrap.innerHTML = usedBus.map(id => {
        const bt = AG.BUS_TYPES.find(b => b.id === id);
        if (!bt) return '';
        return `
          <label class="filter-check-label" data-bus="${id}">
            <input type="checkbox" class="filter-bus-cb" data-bus="${id}" />
            <span class="filter-check-box"></span>
            <span>${bt.icon} ${bt.name}</span>
            <span class="filter-count">${this.trips.filter(t=>t.busType.id===id).length}</span>
          </label>
        `;
      }).join('');

      busWrap.querySelectorAll('.filter-bus-cb').forEach(cb => {
        cb.addEventListener('change', () => {
          const id = cb.dataset.bus;
          if (cb.checked) this.filters.busTypes.add(id);
          else this.filters.busTypes.delete(id);
          this._applyFilters();
        });
      });
    }

    // Price range
    const prices = this.trips.map(t => t.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    this.filters.priceMin = minP;
    this.filters.priceMax = maxP;

    const priceMinEl = document.getElementById('price-min-label');
    const priceMaxEl = document.getElementById('price-max-label');
    if (priceMinEl) priceMinEl.textContent = AG.formatPrice(minP);
    if (priceMaxEl) priceMaxEl.textContent = AG.formatPrice(maxP);

    const slider = document.getElementById('price-range');
    if (slider) {
      slider.min   = minP;
      slider.max   = maxP;
      slider.value = maxP;
      slider.addEventListener('input', () => {
        this.filters.priceMax = parseInt(slider.value);
        document.getElementById('price-max-label').textContent = AG.formatPrice(this.filters.priceMax);
        this._applyFilters();
      });
    }

    // Feature checkboxes
    ['feat-wifi','feat-ikram','feat-yatar'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        this.filters[id.replace('-','').replace('feat','feat')] = e.target.checked;
        const map = { 'feat-wifi':'featWifi', 'feat-ikram':'featIkram', 'feat-yatar':'featYatar' };
        this.filters[map[id]] = e.target.checked;
        this._applyFilters();
      });
    });

    // Time chips
    document.querySelectorAll('[data-dep-range]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('[data-dep-range]').forEach(c => c.classList.remove('active'));
        chip.classList.toggle('active');
        const range = chip.dataset.depRange.split('-').map(Number);
        this.filters.depHours = chip.classList.contains('active') ? range : [0, 24];
        this._applyFilters();
      });
    });
  }

  _applyFilters() {
    let f = [...this.trips];

    // Company
    if (this.filters.companies.size > 0)
      f = f.filter(t => this.filters.companies.has(t.company.id));

    // Bus type
    if (this.filters.busTypes.size > 0)
      f = f.filter(t => this.filters.busTypes.has(t.busType.id));

    // Price
    f = f.filter(t => t.price >= this.filters.priceMin && t.price <= this.filters.priceMax);

    // Departure time
    f = f.filter(t => {
      const h = parseInt(t.departureTime.split(':')[0]);
      return h >= this.filters.depHours[0] && h < this.filters.depHours[1];
    });

    // Features
    if (this.filters.featWifi)  f = f.filter(t => t.features.some(x => x.includes('WiFi')));
    if (this.filters.featIkram) f = f.filter(t => t.features.some(x => x.includes('İkram')));
    if (this.filters.featYatar) f = f.filter(t => t.features.some(x => x.includes('Yatar')));

    // Sort
    switch (this.filters.sort) {
      case 'price_asc':   f.sort((a,b) => a.price - b.price); break;
      case 'price_desc':  f.sort((a,b) => b.price - a.price); break;
      case 'departure':   f.sort((a,b) => a.departureTime.localeCompare(b.departureTime)); break;
      case 'duration':    f.sort((a,b) => a.durationMinutes - b.durationMinutes); break;
      case 'rating':      f.sort((a,b) => b.company.rating - a.company.rating); break;
      case 'comfort':     f.sort((a,b) => b.comfort - a.comfort); break;
      case 'seats':       f.sort((a,b) => b.availableSeats - a.availableSeats); break;
    }

    this.filtered = f;
    this._render();

    // Update count
    const el = document.getElementById('results-count');
    if (el) el.textContent = `${f.length} sefer bulundu`;
  }

  _renderStats() {
    if (!this.trips.length) return;
    const minP = Math.min(...this.trips.map(t => t.price));
    const totalSeats = this.trips.reduce((a,t) => a + t.availableSeats, 0);
    const el = id => document.getElementById(id);
    if (el('stat-trips'))    el('stat-trips').textContent    = this.trips.length;
    if (el('stat-min-price'))el('stat-min-price').textContent= AG.formatPrice(minP);
    if (el('stat-seats'))    el('stat-seats').textContent    = totalSeats;
    if (el('stat-companies'))el('stat-companies').textContent= [...new Set(this.trips.map(t=>t.company.id))].length;
  }

  _render() {
    if (!this.container) return;

    if (this.filtered.length === 0) {
      this.container.innerHTML = `
        <div style="text-align:center;padding:4rem 2rem;color:var(--text-tertiary)">
          <div style="font-size:4rem;margin-bottom:1rem">🚌</div>
          <div style="font-size:var(--text-lg);font-weight:var(--weight-semibold);margin-bottom:0.5rem">Sefer bulunamadı</div>
          <div style="font-size:var(--text-sm)">Filtrelerinizi değiştirmeyi deneyin</div>
          <button class="btn btn--secondary btn--sm" style="margin-top:1.5rem" onclick="location.reload()">Filtreleri Sıfırla</button>
        </div>
      `;
      return;
    }

    const html = this.filtered.map((trip, i) => this._tripCard(trip, i)).join('');
    this.container.innerHTML = html;

    // Stagger animation
    this.container.querySelectorAll('.trip-result-card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      setTimeout(() => {
        card.style.transition = 'all 0.35s var(--ease-out-quint)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, i * 60);
    });

    // Click handlers
    this.container.querySelectorAll('.trip-result-card').forEach((card, i) => {
      card.addEventListener('click', () => {
        card.style.transform = 'scale(0.98)';
        AG.saveSelectedTrip(this.filtered[i]);
        setTimeout(() => { window.location.href = 'seats.html'; }, 150);
      });
    });
  }

  _tripCard(trip, idx) {
    const avail     = trip.availableSeats;
    const availPct  = Math.round((avail / trip.totalSeats) * 100);
    const discount  = trip.originalPrice ? Math.round(((trip.originalPrice - trip.price) / trip.originalPrice) * 100) : 0;
    const urgency   = avail <= 3 ? 'danger' : avail <= 8 ? 'warning' : 'success';
    const urgencyText = avail <= 3 ? `Son ${avail} koltuk!` : avail <= 8 ? `${avail} koltuk kaldı` : `${avail} boş koltuk`;

    const featIcons = trip.features.slice(0, 5).map(f => `
      <span class="feat-pill" title="${f}">${f.split(' ')[0]}</span>
    `).join('');

    return `
      <div class="trip-result-card" data-idx="${idx}" role="button" tabindex="0"
           aria-label="${trip.from} → ${trip.to} ${trip.departureTime} - ${trip.company.name}">

        <!-- Top accent line -->
        <div class="trc__accent" style="background:linear-gradient(90deg, ${trip.company.color}, transparent)"></div>

        <div class="trc__body">
          <!-- Left: company + time -->
          <div class="trc__left">
            <div class="trc__company">
              <div class="trc__logo" style="background:${trip.company.color}22;border-color:${trip.company.color}44;">
                ${trip.company.logo}
              </div>
              <div>
                <div class="trc__company-name">${trip.company.name}</div>
                <div class="trc__company-meta">
                  ⭐ ${trip.company.rating}
                  &bull; ${trip.busType.icon} ${trip.busType.name}
                </div>
              </div>
            </div>

            <!-- Time route -->
            <div class="trc__times">
              <div class="trc__time-block">
                <div class="trc__depart">${trip.departureTime}</div>
                <div class="trc__city-small">${trip.from}</div>
              </div>
              <div class="trc__route-mid">
                <div class="trc__duration">${trip.durationText}</div>
                <div class="trc__line">
                  <div class="trc__line-dot"></div>
                  <div class="trc__line-inner"></div>
                  <div class="trc__line-dot"></div>
                </div>
                <div class="trc__direct">Direkt</div>
              </div>
              <div class="trc__time-block trc__time-block--right">
                <div class="trc__depart">
                  ${trip.arrivalTime}
                  ${trip.arrivalNextDay ? '<sup style="font-size:10px;color:var(--accent-warning)">+1</sup>' : ''}
                </div>
                <div class="trc__city-small">${trip.to}</div>
              </div>
            </div>

            <!-- Features -->
            <div class="trc__features">${featIcons}</div>
          </div>

          <!-- Right: price + seats + CTA -->
          <div class="trc__right">
            ${discount > 0 ? `<div class="trc__original">${AG.formatPrice(trip.originalPrice)}</div>` : ''}
            ${discount > 0 ? `<div class="trc__discount-badge">%${discount} İndirim</div>` : ''}
            <div class="trc__price">${AG.formatPrice(trip.price)}</div>
            <div class="trc__per">kişi başı</div>

            <!-- Seat availability bar -->
            <div class="trc__seats">
              <div class="trc__seats-bar">
                <div class="trc__seats-fill trc__seats-fill--${urgency}" style="width:${availPct}%"></div>
              </div>
              <div class="trc__seats-label trc__seats-label--${urgency}">${urgencyText}</div>
            </div>

            <button class="trc__cta">
              Koltuk Seç
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  setSort(val) {
    this.filters.sort = val;
    this._applyFilters();
  }
}


/* ══════════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════════ */
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${type==='error'?'❌':type==='success'?'✅':'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

window.SearchEngine  = SearchEngine;
window.ResultsEngine = ResultsEngine;
window.CityAutocomplete = CityAutocomplete;
window.showToast = showToast;
