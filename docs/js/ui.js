// Utilidades de interfaz: plantillas que escapan todo por defecto, hojas (dialogs), avisos.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
const render = (v) => {
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  if (v == null || v === false || v === true) return '';
  return esc(v);
};
export const raw = (s) => new Safe(String(s));
export const html = (strings, ...vals) =>
  new Safe(strings.reduce((a, str, i) => a + str + (i < vals.length ? render(vals[i]) : ''), ''));
export const mount = (el, safe) => { el.innerHTML = safe instanceof Safe ? safe.s : esc(safe); };

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
export const money = (n) => fmt.format(Number(n) || 0);
export const moneyShort = (n) => (Number.isInteger(Number(n)) ? '$' + Number(n) : money(n));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Delegacion de eventos: on(root, 'click', '[data-act]', (el, ev) => ...)
export function on(root, tipo, selector, fn) {
  root.addEventListener(tipo, (ev) => {
    const el = ev.target.closest(selector);
    if (el && root.contains(el)) fn(el, ev);
  });
}

// Cambia el contenedor por una copia vacia: asi no se acumulan escuchadores al volver a dibujar.
export function reiniciarRaiz(root) {
  const nuevo = root.cloneNode(false);
  root.replaceWith(nuevo);
  return nuevo;
}

export function toast(mensaje, tipo = 'ok') {
  const cont = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast toast--' + tipo;
  t.textContent = mensaje;
  cont.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast--in'));
  setTimeout(() => { t.classList.remove('toast--in'); setTimeout(() => t.remove(), 250); }, tipo === 'error' ? 5000 : 3000);
}

// Deshabilita un boton mientras corre una accion asincrona.
export async function ocupado(btn, textoMientras, fn) {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = textoMientras;
  try { return await fn(); }
  finally { btn.disabled = false; btn.innerHTML = original; }
}

// Hoja inferior (en celular) / ventana (en escritorio) con <dialog>.
export function abrirHoja({ titulo, cuerpo, ancho, cerrable = true, clase = '' }) {
  const dlg = document.createElement('dialog');
  dlg.className = 'hoja ' + clase + (ancho ? ' hoja--' + ancho : '');
  dlg.innerHTML = '<div class="hoja__barra"><h2 class="hoja__titulo"></h2>' +
    (cerrable ? '<button class="icono-btn" data-cerrar aria-label="Cerrar">✕</button>' : '') +
    '</div><div class="hoja__cuerpo"></div>';
  dlg.querySelector('.hoja__titulo').textContent = titulo;
  mount(dlg.querySelector('.hoja__cuerpo'), cuerpo);
  document.body.appendChild(dlg);
  const cerrar = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => {
    if (cerrable && (e.target === dlg || e.target.closest('[data-cerrar]'))) cerrar();
  });
  if (!cerrable) dlg.addEventListener('cancel', (e) => e.preventDefault());
  dlg.showModal();
  return { el: dlg, cuerpo: dlg.querySelector('.hoja__cuerpo'), cerrar };
}

export function confirmar({ titulo, mensaje, si = 'Sí, continuar', no = 'Cancelar', peligro = false }) {
  return new Promise((resolve) => {
    const h = abrirHoja({
      titulo, ancho: 'chica',
      cuerpo: html`<p class="texto">${mensaje}</p>
        <div class="acciones">
          <button class="btn btn--suave" data-r="0">${no}</button>
          <button class="btn ${peligro ? 'btn--peligro' : 'btn--rojo'}" data-r="1">${si}</button>
        </div>`
    });
    let resuelto = false;
    h.el.addEventListener('close', () => { if (!resuelto) resolve(false); });
    on(h.cuerpo, 'click', '[data-r]', (b) => { resuelto = true; resolve(b.dataset.r === '1'); h.cerrar(); });
  });
}

export const campo = ({ id, etiqueta, tipo = 'text', valor = '', ayuda = '', attrs = '' }) => html`
  <div class="campo">
    <label for="${id}">${etiqueta}</label>
    <input id="${id}" name="${id}" type="${tipo}" value="${valor}" ${raw(attrs)}>
    ${ayuda ? html`<small>${ayuda}</small>` : ''}
  </div>`;

export const errorCaja = (mensaje, reintentar = 'reintentar') => html`
  <div class="vacio vacio--error">
    <p><strong>No se pudo cargar.</strong></p>
    <p>${mensaje}</p>
    <button class="btn btn--rojo" data-act="${reintentar}">Reintentar</button>
  </div>`;

export const vacio = (titulo, texto = '') => html`
  <div class="vacio"><p><strong>${titulo}</strong></p>${texto ? html`<p>${texto}</p>` : ''}</div>`;

const GLIFOS = { Bebidas: '🥤', Dulces: '🍬', Sopas: '🍜', Snacks: '🥔', Combos: '🎁', Pan: '🥐' };
export const glifo = (cat) => GLIFOS[cat] || '🛒';

export function copiarTexto(texto) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(texto);
  return Promise.reject(new Error('sin portapapeles'));
}
