/**
 * TIENDITA — App helpers
 *
 * Maneja sesion local, navegacion entre paginas, registro del service worker
 * y utilidades compartidas que usan las tres paginas.
 */

window.tiendita = {

  // ---- sesion ----
  // La sesion se guarda en localStorage como JSON serializado.
  // Vive entre recargas pero no es seguridad real: el backend valida
  // la whitelist en cada peticion.

  KEY: 'tiendita_session',

  getSession() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  },

  setSession(usuario) {
    localStorage.setItem(this.KEY, JSON.stringify(usuario));
  },

  clearSession() {
    localStorage.removeItem(this.KEY);
  },

  cerrarSesion() {
    this.clearSession();
    window.location.href = './index.html';
  },

  // ---- guards de navegacion ----

  requireSession() {
    const s = this.getSession();
    if (!s) {
      window.location.href = './index.html';
      return null;
    }
    return s;
  },

  // Si ya hay sesion, mandar al catalogo (usar en login)
  redirectIfLogged() {
    if (this.getSession()) window.location.href = './catalogo.html';
  },

  // ---- carrito (vive en localStorage para sobrevivir recargas) ----

  CART_KEY: 'tiendita_cart',

  getCart() {
    try {
      const raw = localStorage.getItem(this.CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
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
    if (existing) {
      existing.cantidad += 1;
    } else {
      cart.push({ sku: sku, nombre: nombre, precio: Number(precio), cantidad: 1 });
    }
    this.setCart(cart);
    return cart;
  },

  removeFromCart(sku) {
    const cart = this.getCart().filter((i) => i.sku !== sku);
    this.setCart(cart);
    return cart;
  },

  changeQty(sku, delta) {
    const cart = this.getCart();
    const item = cart.find((i) => i.sku === sku);
    if (!item) return cart;
    item.cantidad = Math.max(0, item.cantidad + delta);
    if (item.cantidad === 0) {
      this.setCart(cart.filter((i) => i.sku !== sku));
    } else {
      this.setCart(cart);
    }
    return this.getCart();
  },

  cartTotal() {
    return this.getCart().reduce((s, i) => s + i.precio * i.cantidad, 0);
  },

  cartCount() {
    return this.getCart().reduce((s, i) => s + i.cantidad, 0);
  },

  // ---- formateo ----

  pesos(n) {
    const v = Number(n) || 0;
    return '$' + v.toFixed(2);
  },

  // ---- toast notifications ----

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
