/**
 * TIENDITA — App helpers v2
 *
 * Maneja sesion local, navegacion, carrito en localStorage, registro del SW,
 * confetti al confirmar compra, banner de estado online/offline.
 */

window.tiendita = {

  // ============================================================
  // SESION
  // ============================================================
  KEY: 'tiendita_session',

  getSession() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || 'null'); }
    catch (_) { return null; }
  },
  setSession(usuario) {
    localStorage.setItem(this.KEY, JSON.stringify(usuario));
  },
  clearSession() {
    localStorage.removeItem(this.KEY);
  },
  cerrarSesion() {
    this.clearSession();
    this.clearCart();
    window.location.href = './index.html';
  },
  requireSession() {
    const s = this.getSession();
    if (!s) {
      window.location.href = './index.html';
      return null;
    }
    return s;
  },
  redirectIfLogged() {
    if (this.getSession()) window.location.href = './catalogo.html';
  },

  // ============================================================
  // CARRITO (persistente en localStorage)
  // ============================================================
  CART_KEY: 'tiendita_cart',

  getCart() {
    try { return JSON.parse(localStorage.getItem(this.CART_KEY) || '[]'); }
    catch (_) { return []; }
  },
  setCart(items) {
    localStorage.setItem(this.CART_KEY, JSON.stringify(items));
  },
  clearCart() {
    localStorage.removeItem(this.CART_KEY);
  },
  addToCart(sku, nombre, precio) {
    const cart = this.getCart();
    const existing = cart.find((i) => i.sku === sku);
    if (existing) existing.cantidad += 1;
    else cart.push({ sku: sku, nombre: nombre, precio: Number(precio), cantidad: 1 });
    this.setCart(cart);
    return cart;
  },
  changeQty(sku, delta) {
    const cart = this.getCart();
    const item = cart.find((i) => i.sku === sku);
    if (!item) return cart;
    item.cantidad = Math.max(0, item.cantidad + delta);
    if (item.cantidad === 0) this.setCart(cart.filter((i) => i.sku !== sku));
    else                     this.setCart(cart);
    return this.getCart();
  },
  cartTotal() {
    return this.getCart().reduce((s, i) => s + i.precio * i.cantidad, 0);
  },
  cartCount() {
    return this.getCart().reduce((s, i) => s + i.cantidad, 0);
  },

  // ============================================================
  // FORMATEO
  // ============================================================
  pesos(n) {
    const v = Number(n) || 0;
    return '$' + v.toFixed(2);
  },
  pesosCorto(n) {
    const v = Number(n) || 0;
    return v % 1 === 0 ? ('$' + v) : ('$' + v.toFixed(2));
  },

  // ============================================================
  // TOAST
  // ============================================================
  toast(mensaje, tipo) {
    const t = document.createElement('div');
    t.className = 'toast toast--' + (tipo || 'ok');
    t.textContent = mensaje;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast--visible'));
    setTimeout(() => {
      t.classList.remove('toast--visible');
      setTimeout(() => t.remove(), 300);
    }, 3500);
  },

  // ============================================================
  // CONFETTI (rosa + rojo, al confirmar compra)
  // ============================================================
  confetti(cantidad) {
    const wrap = document.createElement('div');
    wrap.className = 'confetti-wrap';
    document.body.appendChild(wrap);
    const colors = ['#FF6B9D', '#FFB3C1', '#E62027', '#FFD6E0', '#FFFFFF'];
    const n = cantidad || 80;
    for (let i = 0; i < n; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const color = colors[Math.floor(Math.random() * colors.length)];
      piece.style.background = color;
      piece.style.left = (Math.random() * 100) + 'vw';
      piece.style.animationDuration = (1.5 + Math.random() * 2) + 's';
      piece.style.animationDelay = (Math.random() * 0.4) + 's';
      // mezcla de formas: rectangulos y circulos
      if (Math.random() > 0.6) piece.style.borderRadius = '50%';
      const size = 6 + Math.random() * 8;
      piece.style.width  = size + 'px';
      piece.style.height = size + 'px';
      wrap.appendChild(piece);
    }
    setTimeout(() => wrap.remove(), 4500);
  },

  // ============================================================
  // NETWORK STATUS (banner offline)
  // ============================================================
  initNetwork() {
    const banner = document.createElement('div');
    banner.className = 'net-banner';
    banner.textContent = 'Sin conexión — algunas funciones no van a responder';
    document.body.appendChild(banner);

    const update = () => {
      if (navigator.onLine) banner.classList.remove('is-visible');
      else                  banner.classList.add('is-visible');
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  },

  // ============================================================
  // ESCAPE HTML
  // ============================================================
  esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }
};

// Registro del Service Worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.log('SW registro fallo:', err);
    });
  });
}

// Banner de red en todas las paginas
document.addEventListener('DOMContentLoaded', () => tiendita.initNetwork());
