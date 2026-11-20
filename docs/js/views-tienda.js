import { api, newReqId } from './api.js';
import { S, guardarSesion, cantidad, fijarCantidad, vaciarCarrito, lineasCarrito, totalCarrito, piezasCarrito, depurarCarrito } from './state.js';
import { html, raw, mount, on, $, $$, reiniciarRaiz, toast, ocupado, abrirHoja, money, moneyShort, glifo, errorCaja, vacio, campo } from './ui.js';

// ====================== TIENDA ======================

let filtro = { q: '', cat: 'Todo' };

const etiquetaPrecio = (precio) => {
  const n = Number(precio);
  const entero = Math.floor(n);
  const cent = Math.round((n - entero) * 100);
  return html`<span class="etiqueta num">$${entero}${cent ? html`<small>${String(cent).padStart(2, '0')}</small>` : ''}</span>`;
};

function tarjeta(p) {
  const n = cantidad(p.sku);
  const agotado = p.stock <= 0;
  const poco = !agotado && p.stock <= p.stockMinimo;
  const arte = p.imagenUrl && /^https:\/\//i.test(p.imagenUrl)
    ? html`<img src="${p.imagenUrl}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : html`<span aria-hidden="true">${glifo(p.categoria)}</span>`;
  const control = agotado ? html`<span class="stock stock--poco">Agotado</span>`
    : n > 0
      ? html`<div class="paso" role="group" aria-label="Cantidad de ${p.nombre}">
          <button data-act="menos" data-sku="${p.sku}" aria-label="Quitar uno">−</button>
          <output aria-live="polite">${n}</output>
          <button data-act="mas" data-sku="${p.sku}" aria-label="Agregar uno" ${n >= p.stock ? raw('disabled') : ''}>+</button>
        </div>`
      : html`<button class="btn-mas" data-act="mas" data-sku="${p.sku}" aria-label="Agregar ${p.nombre}">+</button>`;
  return html`
    <article class="prod ${agotado ? 'prod--agotado' : ''}" data-card="${p.sku}">
      <div class="prod__arte">${arte}</div>
      <div class="prod__cuerpo">
        <h3 class="prod__nombre">${p.nombre}</h3>
        ${agotado ? '' : html`<span class="stock ${poco ? 'stock--poco' : ''}">${poco ? 'Últimas ' + p.stock : 'Hay ' + p.stock}</span>`}
        <div class="prod__pie">${etiquetaPrecio(p.precio)}${control}</div>
      </div>
    </article>`;
}

function productosFiltrados() {
  const q = filtro.q.trim().toLowerCase();
  return S.productos.filter((p) =>
    (filtro.cat === 'Todo' || p.categoria === filtro.cat) &&
    (!q || (p.nombre + ' ' + p.categoria).toLowerCase().includes(q)))
    // primero lo que hay, al final lo agotado
    .sort((a, b) => (a.stock > 0 ? 0 : 1) - (b.stock > 0 ? 0 : 1) || a.nombre.localeCompare(b.nombre, 'es'));
}

function pintarGrid(raiz = document) {
  const grid = $('#grid', raiz);
  if (!grid) return; // la pantalla ya cambió
  const lista = productosFiltrados();
  mount(grid, lista.length
    ? html`${lista.map(tarjeta)}`
    : vacio('No encontré nada con eso', 'Prueba con otra palabra o quita el filtro.'));
}

export function actualizarBarra(visible = true) {
  const cont = $('#barra-carrito');
  if (!cont) return;
  const n = piezasCarrito();
  if (!visible || n === 0) { mount(cont, html``); return; }
  mount(cont, html`
    <button class="barra-carrito" data-act="abrir-carrito">
      <span>${n} ${n === 1 ? 'producto' : 'productos'}</span>
      <span class="num">Ver carrito · ${money(totalCarrito())}</span>
    </button>`);
}

export async function renderTienda(root) {
  root = reiniciarRaiz(root);
  mount(root, html`<div class="cargando">Abriendo la tiendita…</div>`);
  const [cat, perfil] = await Promise.all([api('catalogo'), api('perfil')]);
  if (!cat.ok) { mount(root, errorCaja(cat.error)); return; }
  S.productos = cat.productos;
  if (perfil.ok) { S.usuario = perfil.usuario; guardarSesion(); }
  depurarCarrito();

  const cats = ['Todo', ...Array.from(new Set(S.productos.map((p) => p.categoria).filter(Boolean))).sort()];
  if (!cats.includes(filtro.cat)) filtro.cat = 'Todo';
  const u = S.usuario;
  mount(root, html`
    <section>
      <div class="saludo">
        <h1>Hola, ${u.nombre.split(' ')[0]}</h1>
        <p>Debes ${money(u.deuda)} · te quedan ${money(u.disponible)} para comprar</p>
      </div>
      <div class="buscador">
        <label class="solo-lector" for="q">Buscar producto</label>
        <input id="q" type="search" placeholder="Buscar: coca, mazapán, sopa…" value="${filtro.q}" autocomplete="off">
      </div>
      <div class="chips" id="chips">
        ${cats.map((c) => html`<button class="chip" data-cat="${c}" aria-pressed="${c === filtro.cat}">${c}</button>`)}
      </div>
      <div class="grid" id="grid"></div>
    </section>`);
  pintarGrid(root); actualizarBarra();

  $('#q', root).addEventListener('input', (e) => { filtro.q = e.target.value; pintarGrid(root); });
  on(root, 'click', '[data-cat]', (b) => {
    filtro.cat = b.dataset.cat;
    $$('#chips .chip', root).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === filtro.cat)));
    pintarGrid(root);
  });
  on(root, 'click', '[data-act="mas"],[data-act="menos"]', (b) => {
    const sku = b.dataset.sku;
    const nuevo = fijarCantidad(sku, cantidad(sku) + (b.dataset.act === 'mas' ? 1 : -1));
    const card = $(`[data-card="${CSS.escape(sku)}"]`, root);
    const p = S.productos.find((x) => x.sku === sku);
    if (card && p) {
      const tmp = document.createElement('div');
      mount(tmp, tarjeta(p));
      card.replaceWith(tmp.firstElementChild);
      const foco = $(`[data-card="${CSS.escape(sku)}"] [data-act="mas"]`, root);
      if (foco && !foco.disabled) foco.focus({ preventScroll: true });
    }
    actualizarBarra();
  });
}

// ====================== CARRITO ======================

export function abrirCarrito() {
  let reqId = newReqId();
  const h = abrirHoja({ titulo: 'Tu carrito', cuerpo: html`` });
  const pintar = () => {
    const lineas = lineasCarrito();
    if (lineas.length === 0) { h.cerrar(); actualizarBarra(); return; }
    const total = totalCarrito();
    const u = S.usuario;
    const nuevaDeuda = u.deuda + total;
    const pasa = nuevaDeuda > u.limite + 0.001;
    mount(h.cuerpo, html`
      ${lineas.map((l) => html`
        <div class="linea-carrito">
          <div><strong>${l.nombre}</strong><div class="suave num">${money(l.precio)} c/u</div></div>
          <div class="paso">
            <button data-lin="menos" data-sku="${l.sku}" aria-label="Quitar uno de ${l.nombre}">−</button>
            <output>${l.cantidad}</output>
            <button data-lin="mas" data-sku="${l.sku}" aria-label="Agregar uno de ${l.nombre}">+</button>
          </div>
        </div>`)}
      <div class="total-fila"><span>Total</span><span class="num">${money(total)}</span></div>
      ${pasa
        ? html`<div class="aviso aviso--rojo">Esta compra pasa tu límite de ${money(u.limite)}. Te quedan ${money(u.disponible)}. Quita algo o paga tu cuenta.</div>`
        : html`<p class="suave num">Tu deuda quedaría en ${money(nuevaDeuda)} de ${money(u.limite)}. Se cobra en la quincena.</p>`}
      <div class="acciones">
        <button class="btn btn--suave" data-lin="vaciar">Vaciar</button>
        <button class="btn btn--rojo" data-lin="comprar" ${pasa ? raw('disabled') : ''}>Confirmar compra</button>
      </div>`);
  };
  pintar();
  on(h.cuerpo, 'click', '[data-lin]', async (b) => {
    const acc = b.dataset.lin;
    if (acc === 'mas' || acc === 'menos') {
      fijarCantidad(b.dataset.sku, cantidad(b.dataset.sku) + (acc === 'mas' ? 1 : -1));
      reqId = newReqId(); pintar();
    } else if (acc === 'vaciar') {
      vaciarCarrito(); h.cerrar(); actualizarBarra(); pintarGrid();
    } else if (acc === 'comprar') {
      const items = lineasCarrito().map((l) => ({ sku: l.sku, cantidad: l.cantidad }));
      const r = await ocupado(b, 'Comprando…', () => api('comprar', { items, reqId }));
      if (!r.ok) {
        toast(r.error, 'error');
        if (r.code === 'OUT_OF_STOCK' || r.code === 'INACTIVE_PRODUCT') { h.cerrar(); renderTienda($('#vista')); }
        return;
      }
      vaciarCarrito();
      S.usuario.deuda = r.deudaNueva;
      S.usuario.disponible = Math.max(0, S.usuario.limite - r.deudaNueva);
      guardarSesion();
      h.cerrar(); actualizarBarra();
      mostrarTicket(r);
      renderTienda($('#vista'));
    }
  });
}

function mostrarTicket(r) {
  const h = abrirHoja({
    titulo: 'Compra registrada', ancho: 'chica',
    cuerpo: html`
      <div class="ticket">
        <h3>Tiendita</h3>
        ${r.items.map((i) => html`<div class="ticket__fila"><span>${i.cantidad} × ${i.nombre}</span><span class="num">${money(i.monto)}</span></div>`)}
        <div class="ticket__fila ticket__fila--total"><span>Total</span><span class="num">${money(r.total)}</span></div>
      </div>
      <p class="texto">Tu deuda quedó en <strong class="num">${money(r.deudaNueva)}</strong>. Gracias.</p>
      <div class="acciones"><button class="btn btn--rojo" data-cerrar>Listo</button></div>`
  });
  return h;
}

// ====================== MI CUENTA ======================

export async function renderCuenta(root, { cambiarPin }) {
  root = reiniciarRaiz(root);
  mount(root, html`<div class="cargando">Abriendo tu libreta…</div>`);
  const r = await api('perfil');
  if (!r.ok) { mount(root, errorCaja(r.error)); return; }
  S.usuario = r.usuario; guardarSesion();
  const u = r.usuario;
  const pct = u.limite > 0 ? Math.min(100, Math.round((u.deuda / u.limite) * 100)) : 0;

  // agrupar historial por fecha
  const grupos = [];
  r.historial.forEach((v) => {
    const dia = (v.fechaMx || '').split(' ')[0] || 'Sin fecha';
    let g = grupos.find((x) => x.dia === dia);
    if (!g) { g = { dia, filas: [] }; grupos.push(g); }
    g.filas.push(v);
  });

  mount(root, html`
    <section>
      <div class="libreta">
        <h2>Cuenta de ${u.nombre}</h2>
        <div class="libreta__monto num">${money(u.deuda)}</div>
        <div class="progreso ${pct >= 85 ? 'progreso--alto' : ''}" role="img" aria-label="Has usado ${pct}% de tu límite"><span style="width:${pct}%"></span></div>
        <p class="num">Límite ${money(u.limite)} · te quedan ${money(u.disponible)}</p>
        <p class="suave">Se paga en la quincena con Samantha o Victor.</p>
      </div>

      <div class="seccion">
        <h2>Lo que has llevado</h2>
        ${grupos.length === 0 ? vacio('Todavía no has comprado nada', 'Cuando compres, aparece aquí.') : grupos.map((g) => html`
          <h3 class="suave" style="margin-top:14px">${g.dia}</h3>
          ${g.filas.map((v) => html`
            <div class="renglon">
              <div>${v.cantidad} × ${v.producto}</div>
              <div class="num"><strong>${money(v.monto)}</strong></div>
              <small>${(v.fechaMx || '').split(' ')[1] || ''}</small>
              <span class="sello ${v.estatus === 'Pagada' ? 'sello--ok' : ''}">${v.estatus || 'Pendiente'}</span>
            </div>`)}`)}
      </div>

      ${r.pagos.length ? html`
        <div class="seccion">
          <h2>Pagos que has hecho</h2>
          ${r.pagos.map((p) => html`
            <div class="renglon"><div>${p.fecha}<br><small>${p.metodo}</small></div><div class="num"><strong>${money(p.monto)}</strong></div></div>`)}
        </div>` : ''}

      <div class="seccion">
        <h2>¿Qué te gustaría que hubiera?</h2>
        <form id="form-sug" novalidate>
          <div class="error-form" id="sug-error" role="alert"></div>
          <div class="campo"><label for="sug-tipo">Tipo</label>
            <select id="sug-tipo"><option value="producto">Pedir un producto</option><option value="sugerencia">Sugerencia</option><option value="queja">Queja</option></select></div>
          <div class="campo"><label for="sug-msg">Tu mensaje</label><textarea id="sug-msg" maxlength="500" placeholder="Por ejemplo: más papitas Sol"></textarea></div>
          <button class="btn btn--rojo" type="submit">Enviar</button>
        </form>
      </div>

      <div class="seccion"><button class="btn btn--suave" data-act="cambiar-pin">Cambiar mi PIN</button></div>
    </section>`);

  $('#form-sug').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#sug-msg').value.trim();
    if (msg.length < 3) { $('#sug-error').textContent = 'Escribe un poco más.'; return; }
    $('#sug-error').textContent = '';
    const btn = e.submitter || $('#form-sug button');
    const res = await ocupado(btn, 'Enviando…', () => api('sugerir', { tipo: $('#sug-tipo').value, mensaje: msg }));
    if (!res.ok) { $('#sug-error').textContent = res.error; return; }
    $('#sug-msg').value = ''; toast('Gracias, ya lo vieron.');
  });
  on(root, 'click', '[data-act="cambiar-pin"]', () => cambiarPin());
}
