import { api, setToken, setAuthHandler, newReqId } from './api.js';
import { S, cargarSesion, iniciarSesion, cerrarSesion, guardarSesion, puede, esStaff } from './state.js';
import { html, raw, mount, on, $, toast, ocupado, abrirHoja, campo } from './ui.js';
import { renderAdmin } from './views-admin.js?v=9';

const app = document.getElementById('app');

const ICONOS = {
  tienda: '<svg viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9c0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0"/></svg>',
  cuenta: '<svg viewBox="0 0 24 24"><path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V3zM9 8h6M9 12h6"/></svg>',
  panel: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
};

let vistaActual = '';

// ---------- sesion ----------
setAuthHandler((mensaje) => {
  if (!S.token) return;
  cerrarSesion(); setToken(null);
  mostrarLogin(mensaje || 'Tu sesión expiró. Entra de nuevo.');
});

function mostrarLogin() { location.replace('../index.html'); }

function pedirCambioPin(pinActual, obligatorio) {
  const h = abrirHoja({
    titulo: obligatorio ? 'Elige tu PIN' : 'Cambiar PIN', ancho: 'chica', cerrable: !obligatorio,
    cuerpo: html`
      <form id="form-pin" novalidate>
        ${obligatorio ? html`<p class="texto">El PIN que te dieron es temporal. Elige uno tuyo de 4 a 8 números.</p>` : ''}
        <div class="error-form" id="pin-error" role="alert"></div>
        ${obligatorio ? '' : campo({ id: 'pin-actual', etiqueta: 'PIN actual', tipo: 'password', attrs: 'inputmode="numeric" maxlength="8" autocomplete="current-password"' })}
        ${campo({ id: 'pin-nuevo', etiqueta: 'PIN nuevo', tipo: 'password', attrs: 'inputmode="numeric" maxlength="8" autocomplete="new-password"' })}
        ${campo({ id: 'pin-repite', etiqueta: 'Repite el PIN nuevo', tipo: 'password', attrs: 'inputmode="numeric" maxlength="8" autocomplete="new-password"' })}
        <div class="acciones"><button class="btn btn--rojo" type="submit">Guardar PIN</button></div>
      </form>`
  });
  $('#form-pin', h.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const caja = $('#pin-error', h.el);
    const actual = obligatorio ? pinActual : $('#pin-actual', h.el).value.trim();
    const nuevo = $('#pin-nuevo', h.el).value.trim();
    const repite = $('#pin-repite', h.el).value.trim();
    if (!/^\d{4,8}$/.test(nuevo)) { caja.textContent = 'El PIN debe tener de 4 a 8 números.'; return; }
    if (nuevo !== repite) { caja.textContent = 'Los dos PIN no coinciden.'; return; }
    const btn = e.submitter || $('button[type=submit]', h.el);
    const r = await ocupado(btn, 'Guardando…', () => api('cambiarPin', { actual, nuevo }));
    if (!r.ok) { caja.textContent = r.error; return; }
    S.token = r.token; setToken(S.token); guardarSesion();
    h.cerrar(); toast(r.mensaje);
    if (obligatorio) entrar();
  });
}

// ---------- pantalla principal ----------
function entrar() {
  setToken(S.token);
  vistaActual = '';
  if (!location.hash || location.hash === '#') {
    location.hash = '#/admin/resumen'; // el cambio de hash dibuja la pantalla
  } else {
    dibujar();
  }
}

function rutaActual() {
  const partes = location.hash.replace(/^#\/?/, '').split('/');
  return { vista: partes[0] || 'tienda', sub: partes[1] || '' };
}

function armarMarco() {
  const enlaces = html`
    <nav class="nav" aria-label="Principal">
      <a href="../catalogo.html"><span class="ico">🛒</span><span>Catálogo</span></a>
      <a href="../perfil.html"><span class="ico">👤</span><span>Mi cuenta</span></a>
      <a href="#/admin/resumen" aria-current="page"><span class="ico">📊</span><span>Panel</span></a>
    </nav>`;
  mount(app, html`
    <header class="cabecera">
      <div class="cabecera__in">
        <a class="marca" href="../catalogo.html"><img src="./img/logo-192.png" alt="" width="40" height="40"><span class="marca__n">TIENDITA</span><span class="marca__c">♥</span></a>
        ${enlaces}
        <div class="cabecera__der">
          <span class="yo">${S.usuario.nombre}</span>
          <span data-tema-boton></span>
          <button class="salir" data-act="salir">Salir</button>
        </div>
      </div>
    </header>
    <main class="pagina" id="vista" tabindex="-1"></main>`);
  if (window.TiendiTema) window.TiendiTema.montar();
}

async function dibujar() {
  if (!S.token) return mostrarLogin();
  if (!esStaff()) { location.replace('../catalogo.html'); return; }
  const { sub } = rutaActual();
  if (!$('#vista')) armarMarco();
  window.scrollTo(0, 0);
  await renderAdmin($('#vista'), sub || 'resumen');
}

window.addEventListener('hashchange', () => { if (S.token) dibujar(); });
on(document, 'click', '[data-act="salir"]', () => { cerrarSesion(); setToken(null); try { sessionStorage.removeItem('tiendita_session'); } catch (_) {} mostrarLogin(); });
on(document, 'click', '[data-act="reintentar"]', () => dibujar());

// ---------- arranque ----------
if (cargarSesion()) { setToken(S.token); entrar(); } else mostrarLogin();
