// Sesion y carrito. La sesion se guarda en este telefono (localStorage) hasta que vence el token.
const KS = 'tiendita.sesion.v2';
const KC = 'tiendita.carrito.v2';

export const S = { token: null, usuario: null, permisos: [], productos: [], cart: {} };

export function cargarSesion() {
  try {
    const d = JSON.parse(localStorage.getItem(KS) || 'null');
    if (d && d.token && d.usuario) {
      S.token = d.token; S.usuario = d.usuario; S.permisos = d.permisos || [];
      S.cart = JSON.parse(localStorage.getItem(KC) || '{}') || {};
      return true;
    }
  } catch (_) {}
  return false;
}

export function guardarSesion() {
  try { localStorage.setItem(KS, JSON.stringify({ token: S.token, usuario: S.usuario, permisos: S.permisos })); } catch (_) {}
}

export function iniciarSesion(r) {
  S.token = r.token; S.usuario = r.usuario; S.permisos = r.permisos || [];
  guardarSesion();
}

export function cerrarSesion() {
  try { localStorage.removeItem(KS); localStorage.removeItem(KC); } catch (_) {}
  S.token = null; S.usuario = null; S.permisos = []; S.productos = []; S.cart = {};
}

export const puede = (permiso) => S.permisos.includes('*') || S.permisos.includes(permiso);
export const esStaff = () => puede('admin.resumen');

// ---- carrito ----
const guardarCarrito = () => { try { localStorage.setItem(KC, JSON.stringify(S.cart)); } catch (_) {} };
export const cantidad = (sku) => S.cart[sku] || 0;
export function fijarCantidad(sku, n) {
  const p = S.productos.find((x) => x.sku === sku);
  const tope = p ? p.stock : 0;
  n = Math.max(0, Math.min(Math.floor(n), tope));
  if (n === 0) delete S.cart[sku]; else S.cart[sku] = n;
  guardarCarrito();
  return n;
}
export const vaciarCarrito = () => { S.cart = {}; guardarCarrito(); };
export const lineasCarrito = () =>
  Object.keys(S.cart).map((sku) => {
    const p = S.productos.find((x) => x.sku === sku);
    return p ? { sku, nombre: p.nombre, precio: p.precio, cantidad: S.cart[sku], monto: p.precio * S.cart[sku] } : null;
  }).filter(Boolean);
export const totalCarrito = () => lineasCarrito().reduce((s, l) => s + l.monto, 0);
export const piezasCarrito = () => lineasCarrito().reduce((s, l) => s + l.cantidad, 0);
// quita del carrito lo que ya no existe o no tiene stock
export function depurarCarrito() {
  Object.keys(S.cart).forEach((sku) => fijarCantidad(sku, S.cart[sku]));
}
