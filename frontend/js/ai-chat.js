/**
 * ANTIGRAVITY — AI Travel Concierge Chat Widget
 * Backend yoksa akıllı local fallback çalışır, bağlanabilirse gerçek AI yanıtı alır.
 */

const AI_BASE = window.AI_SERVICE_URL || 'http://10.159.109.35:8006';

const QUICK_PROMPTS = [
  '🌊 Hafta sonu deniz kenarı',
  '🏔 Doğa tatili',
  '🚀 En ucuz bilet',
  '⭐ VIP sefer öner',
  '🎭 İstanbul gezisi',
];

/* ── LOCAL fallback bilgi tabanı ─────────────────────────────── */
const LOCAL_TRIPS = [
  { id:'t1', from_city:'İstanbul', to_city:'Bodrum',   company_name:'Kamil Koç', bus_type:'VIP', price:380, rating:4.8, tags:['deniz','yaz'] },
  { id:'t2', from_city:'İstanbul', to_city:'Antalya',  company_name:'Pamukkale', bus_type:'VIP', price:420, rating:4.7, tags:['deniz','tatil'] },
  { id:'t3', from_city:'İstanbul', to_city:'Ankara',   company_name:'Ulusoy',    bus_type:'VIP', price:350, rating:4.9, tags:['iş','hızlı'] },
  { id:'t4', from_city:'Ankara',   to_city:'Antalya',  company_name:'Varan',     bus_type:'Standart', price:220, rating:4.6, tags:['deniz','uygun'] },
  { id:'t5', from_city:'İstanbul', to_city:'Trabzon',  company_name:'Ulusoy',    bus_type:'VIP', price:490, rating:4.8, tags:['doğa','karadeniz'] },
  { id:'t6', from_city:'İstanbul', to_city:'İzmir',    company_name:'Metro',     bus_type:'Standart', price:240, rating:4.7, tags:['deniz','ege'] },
  { id:'t7', from_city:'Ankara',   to_city:'Kapadokya',company_name:'Göreme Tur',bus_type:'Standart', price:180, rating:4.5, tags:['doğa','kültür','tarihi'] },
  { id:'t8', from_city:'İstanbul', to_city:'Safranbolu',company_name:'Kamil Koç',bus_type:'Standart', price:200, rating:4.6, tags:['doğa','tarihi','kültür'] },
  { id:'t9', from_city:'İzmir',    to_city:'Çeşme',    company_name:'Pamukkale', bus_type:'Standart', price:90,  rating:4.4, tags:['deniz','ege','ucuz'] },
  { id:'t10',from_city:'İstanbul', to_city:'Bursa',    company_name:'Nilüfer',   bus_type:'Standart', price:120, rating:4.3, tags:['yakın','ucuz'] },
];

const INTENT_MAP = {
  deniz:     ['deniz','tatil','yaz','plaj','bodrum','antalya','çeşme','ege','marmaris'],
  doğa:      ['doğa','dağ','orman','karadeniz','trabzon','kapadokya','safranbolu'],
  ucuz:      ['ucuz','uygun','ekonomik','bütçe','hesaplı'],
  vip:       ['vip','konfor','lüks','birinci'],
  hızlı:     ['hızlı','acele','ekspres','en kısa'],
  kültür:    ['tarih','müze','kültür','tarihi','kültürel'],
  istanbul:  ['istanbul','taksim','kadıköy','boğaz'],
};

function detectIntent(text) {
  const lower = text.toLowerCase();
  const matched = new Set();
  for (const [intent, keywords] of Object.entries(INTENT_MAP)) {
    if (keywords.some(k => lower.includes(k))) matched.add(intent);
  }
  return matched;
}

function localMatch(text) {
  const intents = detectIntent(text);
  if (intents.size === 0) {
    // genel öneriler
    return {
      reply: 'Harika bir seyahat fikri! İşte size popüler rotalardan öneriler:',
      trips: LOCAL_TRIPS.slice(0, 3),
    };
  }

  const scored = LOCAL_TRIPS.map(t => {
    let score = 0;
    intents.forEach(intent => {
      if (t.tags.includes(intent)) score += 2;
    });
    if (intents.has('ucuz'))  score += (500 - t.price) / 200;
    if (intents.has('vip') && t.bus_type === 'VIP') score += 2;
    return { ...t, score };
  }).sort((a, b) => b.score - a.score).filter(t => t.score > 0);

  const result = scored.length > 0 ? scored : LOCAL_TRIPS.slice(0, 3);

  const replyMap = {
    deniz: '🌊 Deniz tatili için muhteşem rotalar! Boş koltuklar hızlı doluyor:',
    doğa:  '🌿 Doğa kaçamağı için ideal güzergahlar:',
    ucuz:  '💸 Bütçe dostu rotalar listelendi:',
    vip:   '✨ VIP konfor seçenekleri:',
    kültür:'🏛️ Kültür ve tarih turu için öneriler:',
  };

  const firstIntent = [...intents][0];
  const reply = replyMap[firstIntent] || '🚌 İsteğinize uygun seferler bulundu:';
  return { reply, trips: result.slice(0, 3) };
}

/* ── Chat Widget ─────────────────────────────────────────────── */
class AIChatWidget {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.sessionId = Math.random().toString(36).slice(2);
    this.isOpen = false;
    this.isLoading = false;
    this.messages = [];
    this.backendOk = null; // null=unknown, true=alive, false=down
    this.build();
    this.pingBackend();
  }

  async pingBackend() {
    try {
      const r = await fetch(`${AI_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      this.backendOk = r.ok;
    } catch {
      this.backendOk = false;
    }
    // Status dot
    const dot = document.getElementById('ai-status-dot');
    const lbl = document.getElementById('ai-status-label');
    if (dot && lbl) {
      dot.style.background = this.backendOk ? '#00e59b' : '#f59e0b';
      lbl.textContent = this.backendOk ? 'Llama 3 bağlı' : 'Akıllı öneri modu';
    }
  }

  build() {
    // FAB
    this.fab = document.createElement('button');
    this.fab.id = 'ai-fab';
    this.fab.innerHTML = '🤖';
    this.fab.title = 'AI Seyahat Asistanı';
    this.fab.style.cssText = `
      position:fixed; bottom:24px; right:24px;
      width:58px; height:58px; border-radius:50%;
      background:linear-gradient(135deg,#7c6bff,#5b4fe8);
      border:2px solid rgba(124,107,255,0.4);
      color:#fff; cursor:pointer; font-size:1.5rem;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 0 28px rgba(124,107,255,0.55), 0 8px 20px rgba(0,0,0,0.4);
      z-index:9999; transition:all 0.3s ease;
    `;
    this.fab.addEventListener('click', () => this.toggle());

    // Panel
    this.panel = document.createElement('div');
    this.panel.id = 'ai-chat-panel';
    this.panel.style.cssText = `
      position:fixed; bottom:96px; right:24px;
      width:370px; max-height:540px;
      background:rgba(8,10,22,0.97);
      backdrop-filter:blur(28px);
      border:1px solid rgba(124,107,255,0.28);
      border-radius:22px;
      display:flex; flex-direction:column;
      z-index:9998;
      transform:translateY(16px) scale(0.96);
      opacity:0; pointer-events:none;
      transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);
      overflow:hidden;
      box-shadow:0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,107,255,0.1);
    `;

    this.panel.innerHTML = `
      <!-- Header -->
      <div style="
        display:flex; align-items:center; gap:10px;
        padding:14px 16px;
        border-bottom:1px solid rgba(255,255,255,0.06);
        background:linear-gradient(135deg,rgba(124,107,255,0.18),transparent);
        flex-shrink:0;
      ">
        <div style="
          width:38px; height:38px; border-radius:50%;
          background:linear-gradient(135deg,#7c6bff,#00e5ff);
          display:flex; align-items:center; justify-content:center;
          font-size:1.2rem; flex-shrink:0;
        ">🤖</div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:800; font-size:.9rem; color:#f0f2ff;">AI Seyahat Asistanı</div>
          <div style="font-size:.7rem; color:rgba(255,255,255,0.45); display:flex; align-items:center; gap:5px; margin-top:2px;">
            <span id="ai-status-dot" style="width:6px;height:6px;border-radius:50%;background:#f59e0b;display:inline-block;flex-shrink:0;"></span>
            <span id="ai-status-label">Bağlanılıyor...</span>
          </div>
        </div>
        <button onclick="window.aiChat.close()" style="
          background:rgba(255,255,255,0.06); border:none; border-radius:50%;
          width:30px; height:30px;
          color:rgba(255,255,255,0.5); cursor:pointer; font-size:1rem;
          display:flex; align-items:center; justify-content:center;
          transition:all .2s; flex-shrink:0;
        " onmouseover="this.style.background='rgba(255,255,255,0.12)'"
           onmouseout="this.style.background='rgba(255,255,255,0.06)'">×</button>
      </div>

      <!-- Messages -->
      <div id="chat-messages" style="
        flex:1; overflow-y:auto; padding:14px;
        display:flex; flex-direction:column; gap:10px;
        scroll-behavior:smooth;
        -webkit-overflow-scrolling:touch;
      "></div>

      <!-- Quick prompts -->
      <div id="quick-prompts" style="
        padding:8px 12px; border-top:1px solid rgba(255,255,255,0.05);
        display:flex; gap:5px; flex-wrap:wrap; flex-shrink:0;
      "></div>

      <!-- Input row -->
      <div style="
        padding:10px 12px; border-top:1px solid rgba(255,255,255,0.06);
        display:flex; gap:8px; flex-shrink:0;
      ">
        <input id="chat-input" type="text"
          placeholder="Nereye gitmek istiyorsunuz?"
          style="
            flex:1; background:rgba(255,255,255,0.06);
            border:1px solid rgba(255,255,255,0.1);
            border-radius:12px; padding:10px 14px;
            color:#f0f2ff; font-size:.84rem; font-family:Inter,sans-serif;
            outline:none; transition:border-color .2s;
          "
        />
        <button id="chat-send" style="
          background:linear-gradient(135deg,#7c6bff,#5b4fe8);
          border:none; border-radius:12px; padding:10px 16px;
          color:#fff; cursor:pointer; font-size:1rem;
          transition:all .2s; white-space:nowrap; flex-shrink:0;
        ">→</button>
      </div>
    `;

    document.body.appendChild(this.fab);
    document.body.appendChild(this.panel);

    // Events
    this.panel.querySelector('#chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
    });
    this.panel.querySelector('#chat-send').addEventListener('click', () => this.send());
    this.messagesEl = this.panel.querySelector('#chat-messages');

    // Quick prompts
    const qpEl = this.panel.querySelector('#quick-prompts');
    QUICK_PROMPTS.forEach(q => {
      const btn = document.createElement('button');
      btn.textContent = q;
      btn.style.cssText = `
        background:rgba(124,107,255,0.12);
        border:1px solid rgba(124,107,255,0.25);
        border-radius:18px; padding:4px 11px;
        color:rgba(255,255,255,0.7); font-size:.7rem;
        cursor:pointer; transition:all .2s; white-space:nowrap;
        font-family:Inter,sans-serif;
      `;
      btn.addEventListener('mouseover', () => { btn.style.background = 'rgba(124,107,255,0.25)'; btn.style.color = '#fff'; });
      btn.addEventListener('mouseout',  () => { btn.style.background = 'rgba(124,107,255,0.12)'; btn.style.color = 'rgba(255,255,255,0.7)'; });
      btn.addEventListener('click', () => {
        this.panel.querySelector('#chat-input').value = q;
        this.send();
      });
      qpEl.appendChild(btn);
    });

    // Welcome
    setTimeout(() => {
      this.addMessage('assistant',
        '👋 Merhaba! Nereye gitmek istediğinizi doğal dilde söyleyin, size en iyi seferleri önereyim!'
      );
    }, 400);

    window.aiChat = this;
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  open() {
    this.isOpen = true;
    this.panel.style.transform = 'translateY(0) scale(1)';
    this.panel.style.opacity = '1';
    this.panel.style.pointerEvents = 'auto';
    this.fab.style.transform = 'rotate(15deg) scale(0.9)';
    setTimeout(() => this.panel.querySelector('#chat-input').focus(), 200);
  }

  close() {
    this.isOpen = false;
    this.panel.style.transform = 'translateY(16px) scale(0.96)';
    this.panel.style.opacity = '0';
    this.panel.style.pointerEvents = 'none';
    this.fab.style.transform = '';
  }

  addMessage(role, text, trips = []) {
    const isUser = role === 'user';
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display:flex; flex-direction:column;
      align-items:${isUser ? 'flex-end' : 'flex-start'};
      animation:fadeInUp .25s ease both;
    `;

    if (!document.getElementById('ai-anim-style')) {
      const s = document.createElement('style');
      s.id = 'ai-anim-style';
      s.textContent = `
        @keyframes fadeInUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes typing-dot { 0%,80%,100%{transform:scale(1);opacity:.4} 40%{transform:scale(1.3);opacity:1} }
      `;
      document.head.appendChild(s);
    }

    const bubble = document.createElement('div');
    bubble.style.cssText = `
      max-width:88%;
      background:${isUser ? 'linear-gradient(135deg,#7c6bff,#5b4fe8)' : 'rgba(255,255,255,0.07)'};
      border:1px solid ${isUser ? 'transparent' : 'rgba(255,255,255,0.08)'};
      border-radius:${isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
      padding:10px 14px; font-size:.83rem; color:#f0f2ff; line-height:1.55;
      word-break:break-word;
    `;
    bubble.textContent = text;
    wrap.appendChild(bubble);

    // Trip cards
    if (trips.length > 0) {
      const cardsWrap = document.createElement('div');
      cardsWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:8px;width:100%;';
      trips.slice(0, 3).forEach(t => {
        const card = document.createElement('div');
        card.style.cssText = `
          background:rgba(124,107,255,0.1);
          border:1px solid rgba(124,107,255,0.22);
          border-radius:12px; padding:10px 12px;
          cursor:pointer; transition:all .2s; font-size:.78rem;
        `;
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <strong style="color:#f0f2ff;font-size:.85rem;">${t.from_city} → ${t.to_city}</strong>
            <span style="color:#7c6bff;font-weight:800;font-size:.92rem;">${t.price?.toLocaleString('tr-TR')} ₺</span>
          </div>
          <div style="color:rgba(255,255,255,0.45);display:flex;gap:10px;flex-wrap:wrap;">
            <span>🚌 ${t.company_name}</span>
            <span>${t.bus_type}</span>
            <span>⭐ ${t.rating}</span>
          </div>
        `;
        card.addEventListener('mouseenter', () => { card.style.borderColor = 'rgba(124,107,255,0.5)'; card.style.background = 'rgba(124,107,255,0.2)'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = 'rgba(124,107,255,0.22)'; card.style.background = 'rgba(124,107,255,0.1)'; });
        card.addEventListener('click', () => {
          // Save trip and go to seats
          if (window.AG) {
            AG.saveSelectedTrip({
              id: t.id, from: t.from_city, to: t.to_city,
              company: { name: t.company_name, logo: '🚌' },
              price: t.price, bus_type: t.bus_type,
              departureTime: '22:30', arrivalTime: '07:00', date: new Date().toISOString().slice(0,10)
            });
          }
          window.location.href = 'seats.html';
        });
        cardsWrap.appendChild(card);
      });
      wrap.appendChild(cardsWrap);
    }

    this.messagesEl.appendChild(wrap);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    this.messages.push({ role, text });
  }

  addTyping() {
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.style.cssText = 'display:flex;gap:5px;padding:8px 4px;align-items:center;';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        width:7px; height:7px; border-radius:50%; background:#7c6bff;
        animation:typing-dot .8s ease infinite; animation-delay:${i * .2}s;
      `;
      div.appendChild(dot);
    }
    this.messagesEl.appendChild(div);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    return div;
  }

  async send() {
    const input = this.panel.querySelector('#chat-input');
    const text = input.value.trim();
    if (!text || this.isLoading) return;
    input.value = '';

    this.addMessage('user', text);
    this.isLoading = true;
    const typing = this.addTyping();

    // Simulate thinking delay for better UX
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

    if (this.backendOk) {
      // Try real backend
      try {
        const res = await fetch(`${AI_BASE}/api/v1/ai/concierge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, session_id: this.sessionId }),
          signal: AbortSignal.timeout(10000),
        });
        typing.remove();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this.addMessage('assistant', data.reply, data.trips || []);
        this.isLoading = false;
        return;
      } catch {
        this.backendOk = false;
        // fall through to local
      }
    }

    // ── Local intelligent fallback ─────────────────────────────
    typing.remove();
    const { reply, trips } = localMatch(text);
    this.addMessage('assistant', reply, trips);
    this.isLoading = false;
  }
}

window.AIChatWidget = AIChatWidget;

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  if (document.body) {
    window.aiChatInstance = new AIChatWidget('ai-chat-container');
  }
});
