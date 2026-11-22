import { api, setToken, setAuthHandler, newReqId } from './api.js';
import { S, cargarSesion, iniciarSesion, cerrarSesion, guardarSesion, puede, esStaff } from './state.js';
import { html, raw, mount, on, $, toast, ocupado, abrirHoja, campo } from './ui.js';
import { renderTienda, renderCuenta, actualizarBarra, abrirCarrito } from './views-tienda.js';
import { renderAdmin } from './views-admin.js';

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

function mostrarLogin(mensaje = '') {
  location.hash = '';
  mount(app, html`
    <main class="login">
      <div class="toldo" aria-hidden="true"></div>
      <div class="login__marca">
        <img src="./img/logo-512.png" alt="Tiendita" width="132" height="132">
        <div class="login__nombre">Tiendita</div>
        <p class="login__lema">llévatelo, paga en quincena</p>
      </div>
      <form class="login__caja" id="form-login" autocomplete="on" novalidate>
        <div class="error-form" id="login-error" role="alert">${mensaje}</div>
        ${campo({ id: 'email', etiqueta: 'Tu correo', tipo: 'email', attrs: 'autocomplete="username" inputmode="email" autocapitalize="off" spellcheck="false" required' })}
        <div id="pin-caja" hidden>${campo({ id: 'pin', etiqueta: 'Tu PIN', tipo: 'password', attrs: 'autocomplete="current-password" inputmode="numeric" pattern="[0-9]*" maxlength="8"' })}</div>
        <button class="btn btn--rojo btn--ancho" type="submit">Entrar</button>
        <p class="login__ayuda" id="login-ayuda">Escribe tu correo para entrar.</p>
      </form>
    </main>`);
  $('#email').focus();
  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter || $('#form-login button[type=submit]');
    const email = $('#email').value.trim();
    const pin = $('#pin').value.trim();
    const caja = $('#login-error');
    if (!email.includes('@')) { caja.textContent = 'Escribe tu correo.'; return; }
    caja.textContent = '';
    const r = await ocupado(btn, 'Entrando…', () => api('login', { email, pin }));
    if (!r.ok && r.code === 'NEEDS_PIN') {
      $('#pin-caja').hidden = false; $('#pin').focus();
      $('#login-ayuda').textContent = 'Este correo es de administración: escribe tu PIN. Si no lo tienes, pídeselo a Victor.';
      return;
    }
    if (!r.ok) { caja.textContent = r.error; if (!$('#pin-caja').hidden) { $('#pin').value = ''; $('#pin').focus(); } return; }
    iniciarSesion(r); setToken(S.token);
    if (r.debeCambiarPin) pedirCambioPin(pin, true); else entrar();
  });
}

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
    location.hash = esStaff() ? '#/admin/resumen' : '#/tienda'; // el cambio de hash dibuja la pantalla
  } else {
    dibujar();
  }
}

function rutaActual() {
  const partes = location.hash.replace(/^#\/?/, '').split('/');
  return { vista: partes[0] || 'tienda', sub: partes[1] || '' };
}

function armarMarco(vista) {
  const staff = esStaff();
  const enlaces = html`
    <nav class="nav" aria-label="Principal">
      <a href="#/tienda" ${vista === 'tienda' ? raw('aria-current="page"') : ''}>${raw(ICONOS.tienda)}<span>Tienda</span></a>
      <a href="#/cuenta" ${vista === 'cuenta' ? raw('aria-current="page"') : ''}>${raw(ICONOS.cuenta)}<span>Mi cuenta</span></a>
      ${staff ? html`<a href="#/admin/resumen" ${vista === 'admin' ? raw('aria-current="page"') : ''}>${raw(ICONOS.panel)}<span>Panel</span></a>` : ''}
    </nav>`;
  mount(app, html`
    <header class="cabecera">
      <div class="cabecera__in">
        <a class="marca" href="#/tienda"><img src="./img/logo-192.png" alt="" width="40" height="40"><span>Tiendita</span></a>
        ${enlaces}
        <div class="cabecera__der">
          <span class="yo">${S.usuario.nombre}</span>
          <button class="btn btn--suave btn--chico" data-act="salir">Salir</button>
        </div>
      </div>
    </header>
    <main class="pagina" id="vista" tabindex="-1"></main>
    <div id="barra-carrito"></div>`);
}

async function dibujar() {
  if (!S.token) return mostrarLogin();
  const { vista, sub } = rutaActual();
  if (vista === 'admin' && !esStaff()) { location.hash = '#/tienda'; return; }
  if (!$('#vista') || vistaActual !== vista) { armarMarco(vista); vistaActual = vista; }
  const root = $('#vista');
  window.scrollTo(0, 0);
  if (vista === 'cuenta') await renderCuenta(root, { cambiarPin: () => pedirCambioPin('', false) });
  else if (vista === 'admin') await renderAdmin(root, sub || 'resumen');
  else await renderTienda(root);
  if (vista !== 'tienda') actualizarBarra(false);
}

window.addEventListener('hashchange', () => { if (S.token) dibujar(); });
on(document, 'click', '[data-act="salir"]', () => { cerrarSesion(); setToken(null); vistaActual = ''; mostrarLogin(); });
on(document, 'click', '[data-act="reintentar"]', () => dibujar());
on(document, 'click', '[data-act="abrir-carrito"]', () => abrirCarrito());

// ---------- arranque ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
if (cargarSesion()) { setToken(S.token); entrar(); } else mostrarLogin();
