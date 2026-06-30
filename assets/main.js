/* ═══════════════════════════════════════════════════
   MKULIMA TRADER — Shared JS Utilities
   ═══════════════════════════════════════════════════ */

// ─── THEME ───────────────────────────────────────────
const MT = {
  theme: {
    init() {
      const saved = localStorage.getItem('mt-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', saved);
      this.updateBtn(saved);
    },
    toggle() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('mt-theme', next);
      this.updateBtn(next);
    },
    updateBtn(t) {
      const btn = document.getElementById('themeBtn');
      if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
    }
  },

  // ─── MODAL ─────────────────────────────────────────
  modal: {
    open(id) {
      const el = document.getElementById(id);
      if (el) el.classList.add('open');
    },
    close(id) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('open');
    },
    closeAll() {
      document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
    }
  },

  // ─── TOAST ─────────────────────────────────────────
  toast: {
    show(msg, type = 'info', duration = 3000) {
      let container = document.getElementById('toastContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = msg;
      container.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
    }
  },

  // ─── ACTIVE NAV ────────────────────────────────────
  nav: {
    setActive() {
      const path = window.location.pathname;
      document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href') || '';
        if (
          (href !== '/' && path.startsWith(href)) ||
          (href === '/' && path === '/')
        ) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
  },

  // ─── FAKE PRICE ENGINE ─────────────────────────────
  prices: {
    data: {
      'V10 (1s)':  { price: 6542.31, symbol: '1HZ10V',  pip: 3 },
      'V25 (1s)':  { price: 8231.54, symbol: '1HZ25V',  pip: 3 },
      'V50 (1s)':  { price: 3417.28, symbol: '1HZ50V',  pip: 2 },
      'V75 (1s)':  { price: 1284.73, symbol: '1HZ75V',  pip: 2 },
      'V100 (1s)': { price: 4921.66, symbol: '1HZ100V', pip: 2 },
      'V10':       { price: 9847.21, symbol: 'R_10',    pip: 3 },
      'V25':       { price: 5638.49, symbol: 'R_25',    pip: 3 },
      'V50':       { price: 7291.83, symbol: 'R_50',    pip: 2 },
      'V75':       { price: 2156.47, symbol: 'R_75',    pip: 2 },
      'V100':      { price: 8473.92, symbol: 'R_100',   pip: 2 },
      'Step Index':{ price:  429.75, symbol: 'stpRNG',  pip: 2 },
      'Jump 10':   { price: 6283.14, symbol: 'JD10',    pip: 2 },
      'Jump 25':   { price: 4571.39, symbol: 'JD25',    pip: 2 },
      'Jump 50':   { price: 3892.67, symbol: 'JD50',    pip: 2 },
      'Jump 75':   { price: 2143.85, symbol: 'JD75',    pip: 2 },
      'Jump 100':  { price: 1872.43, symbol: 'JD100',   pip: 2 },
    },
    tick(name) {
      const d = this.data[name];
      if (!d) return;
      const volatility = name.includes('100') ? 0.8 : name.includes('75') ? 0.5 : 0.3;
      d.prev = d.price;
      d.price += (Math.random() - 0.498) * volatility;
      d.price = Math.max(0.01, d.price);
      d.change = ((d.price - (d.prev || d.price)) / d.price * 100);
      return d;
    },
    format(name) {
      const d = this.data[name];
      if (!d) return '0.00';
      return d.price.toFixed(d.pip);
    }
  },

  // ─── CHART (Canvas line chart) ─────────────────────
  chart: {
    canvas: null, ctx: null,
    history: [],
    maxPoints: 120,
    animFrame: null,
    currentMarket: 'V100 (1s)',

    init(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      // Prime history
      let p = MT.prices.data[this.currentMarket]?.price || 5000;
      for (let i = 0; i < this.maxPoints; i++) {
        p += (Math.random() - 0.498) * 0.5;
        this.history.push(p);
      }
      this.loop();
    },

    resize() {
      if (!this.canvas) return;
      this.canvas.width  = this.canvas.offsetWidth;
      this.canvas.height = this.canvas.offsetHeight;
    },

    setMarket(name) {
      this.currentMarket = name;
      this.history = [];
      let p = MT.prices.data[name]?.price || 5000;
      for (let i = 0; i < this.maxPoints; i++) {
        p += (Math.random() - 0.498) * 0.5;
        this.history.push(p);
      }
    },

    loop() {
      const tick = () => {
        const d = MT.prices.tick(this.currentMarket);
        if (d) {
          this.history.push(d.price);
          if (this.history.length > this.maxPoints) this.history.shift();
        }
        this.draw();
        this.animFrame = setTimeout(tick, 400);
      };
      tick();
    },

    draw() {
      const { canvas, ctx, history } = this;
      if (!canvas || !ctx || history.length < 2) return;
      const W = canvas.width, H = canvas.height;
      const pad = { top: 20, bottom: 30, left: 60, right: 20 };
      ctx.clearRect(0, 0, W, H);

      const min = Math.min(...history) * 0.9995;
      const max = Math.max(...history) * 1.0005;
      const range = max - min || 1;

      const xStep = (W - pad.left - pad.right) / (history.length - 1);
      const toX = i => pad.left + i * xStep;
      const toY = v => pad.top + (1 - (v - min) / range) * (H - pad.top - pad.bottom);

      // Grid lines
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      ctx.strokeStyle = isDark ? 'rgba(30,58,82,0.8)' : 'rgba(194,217,230,0.8)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (H - pad.top - pad.bottom) * i / 4;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        const val = max - (range * i / 4);
        ctx.fillStyle = isDark ? '#8BAAB8' : '#4A7A94';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(val.toFixed(2), pad.left - 4, y + 3);
      }

      // Gradient fill
      const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
      grad.addColorStop(0, 'rgba(29,189,160,0.3)');
      grad.addColorStop(1, 'rgba(29,189,160,0)');
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(history[0]));
      history.forEach((v, i) => ctx.lineTo(toX(i), toY(v)));
      ctx.lineTo(toX(history.length - 1), H - pad.bottom);
      ctx.lineTo(toX(0), H - pad.bottom);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Price line
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(history[0]));
      history.forEach((v, i) => ctx.lineTo(toX(i), toY(v)));
      ctx.strokeStyle = '#1DBDA0';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Last price dot
      const lx = toX(history.length - 1), ly = toY(history[history.length - 1]);
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#1DBDA0'; ctx.fill();
      ctx.beginPath(); ctx.arc(lx, ly, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(29,189,160,0.25)'; ctx.fill();

      // Last price label
      ctx.fillStyle = '#1DBDA0'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
      ctx.fillText(history[history.length - 1].toFixed(2), lx + 8, ly + 4);
    }
  }
};

// ─── INIT ON LOAD ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  MT.theme.init();
  MT.nav.setActive();

  // Bind theme toggle
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', () => MT.theme.toggle());

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) MT.modal.closeAll(); });
  });

  // Close modals on Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape') MT.modal.closeAll(); });
});
