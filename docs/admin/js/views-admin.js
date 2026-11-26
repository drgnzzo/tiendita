import { api, newReqId } from './api.js';
import { S, puede } from './state.js';
import { html, raw, mount, on, $, $$, reiniciarRaiz, toast, ocupado, abrirHoja, confirmar, money, moneyShort, campo, errorCaja, vacio, copiarTexto, esc, glifo } from './ui.js';

const TITULOS = {
  resumen: ['Resumen', 'cómo va la tiendita'], inventario: ['Productos', 'lo que hay en el estante'], cobros: ['Cobros', 'quién debe y cuánto'],
  reportes: ['Reportes', 'el mes en números'], corte: ['Auditoría', 'contar lo que hay y compararlo con el sistema'], usuarios: ['Usuarios', 'quién entra a la tiendita']
};
const SUBS = [
  { id: 'resumen', nombre: 'Resumen', permiso: 'admin.resumen' },
  { id: 'inventario', nombre: 'Productos', permiso: 'inv.lista' },
  { id: 'cobros', nombre: 'Cobros', permiso: 'cobros.lista' },
  { id: 'reportes', nombre: 'Reportes', permiso: 'reporte.mes' },
  { id: 'corte', nombre: 'Auditoría', permiso: 'corte.lista' },
    { id: 'usuarios', nombre: 'Usuarios', permiso: 'usr.lista', oculta: true }
];
// Criterio de orden de todo el panel:
//  · Productos: por sección (sopas → botanas → dulces → helados → bebidas) y de la A a la Z.
//  · Personas: de la A a la Z.   · Deudas: la más grande primero.   · Movimientos y pagos: lo más nuevo primero.
const ORDEN_CATS = ['Sopas', 'Snacks', 'Dulces', 'Helados', 'Bebidas'];
const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
const rangoCat = (c) => { const i = ORDEN_CATS.indexOf(c); return i >= 0 ? i : (c ? ORDEN_CATS.length : ORDEN_CATS.length + 1); };
const porSeccion = (a, b) => (rangoCat(a.categoria) - rangoCat(b.categoria)) || (a.categoria || '').localeCompare(b.categoria || '', 'es') || porNombre(a, b);
const porDeuda = (a, b) => (b.deuda - a.deuda) || porNombre(a, b);
const agrupar = (lista) => { const g = []; lista.forEach((p) => { const c = p.categoria || 'Otros'; let x = g[g.length - 1]; if (!x || x.cat !== c) { x = { cat: c, items: [] }; g.push(x); } x.items.push(p); }); return g; };
// <option> agrupadas por sección, para los menús de elegir producto
const opcionesProd = (prods, texto, sel) => agrupar(prods.slice().sort(porSeccion)).map((g) => html`<optgroup label="${g.cat}">${g.items.map((p) => html`<option value="${p.sku}" ${p.sku === sel ? raw('selected') : ''}>${texto(p)}</option>`)}</optgroup>`);
const cargando = (t = 'Cargando…') => html`<div class="cargando">${t}</div>`;
let recargar = () => {};
// Lista de productos en memoria: los formularios se abren al instante.
let cacheProds = null;
async function listaProds() {
  if (cacheProds) return { ok: true, productos: cacheProds };
  const r = await api('inv.lista');
  if (r.ok) cacheProds = r.productos;
  return r;
}
function precargar() { listaProds().catch(() => {}); }

export async function renderAdmin(root, sub) {
  root = reiniciarRaiz(root);
  const subs = SUBS.filter((s) => puede(s.permiso));
  if (!subs.find((s) => s.id === sub)) sub = subs[0].id;
  mount(root, html`
  <nav class="subnav" aria-label="Panel">
      ${subs.filter((s) => !s.oculta).map((s) => html`<a href="#/admin/${s.id}" ${s.id === sub || (sub === 'productos' && s.id === 'inventario') ? raw('aria-current="page"') : ''}>${s.nombre}</a>`)}
      ${subs.find((s) => s.id === 'usuarios') ? html`<a class="subnav__aparte" href="#/admin/usuarios" ${sub === 'usuarios' ? raw('aria-current="page"') : ''}>Usuarios</a>` : ''}
    </nav>
    <div class="titulo"><h1>${(TITULOS[sub] || TITULOS.resumen)[0]}</h1><span>${(TITULOS[sub] || TITULOS.resumen)[1]}</span></div>
    <div id="admin-cuerpo"></div>`);
  const cuerpo = $('#admin-cuerpo', root);
  const vistas = { resumen: vResumen, inventario: vInventario, productos: vInventario, cobros: vCobros, reportes: vReportes, corte: vCorte, usuarios: vUsuarios };
  recargar = () => { cacheProds = null; precargar(); return renderAdmin($('#vista'), sub); };
  precargar();
  activarPlegado(root, cuerpo);
  const actual = $('.subnav [aria-current="page"]', root);
  if (actual && actual.scrollIntoView) actual.scrollIntoView({ inline: 'center', block: 'nearest' });
  await vistas[sub](cuerpo);
}

// ====================== RESUMEN ======================

async function vResumen(c) {
  mount(c, cargando());
  const r = await api('admin.resumen');
  if (!r.ok) { mount(c, errorCaja(r.error)); return; }
  const max = Math.max(1, ...r.dias.map((d) => d.monto));
  mount(c, html`
    <div class="caja">
      <div><strong class="num">${money(r.ventasHoy)}</strong><span>Ventas de hoy · ${r.unidadesHoy} piezas</span></div>
      <div><strong class="num">${money(r.ventasSemana)}</strong><span>Últimos 7 días</span></div>
      <div class="destacada"><strong class="num">${money(r.deudaTotal)}</strong><span>Por cobrar</span></div>
      <div><strong class="num">${money(r.valorInventarioCosto)}</strong><span>Mercancía en la tienda (a costo)</span></div>
    </div>

    <div class="dos-col">
      <section>
        <h2>Ventas de la semana</h2>
        <div class="barras" role="img" aria-label="Ventas por día">
          ${r.dias.map((d) => html`<div><b class="num">${d.monto ? moneyShort(d.monto) : ''}</b><i style="height:${Math.round((d.monto / max) * 84)}px"></i><span>${d.etiqueta}</span></div>`)}
        </div>
        <p class="suave num">Ganancia estimada de 30 días: <strong>${money(r.ganancia30)}</strong> sobre ${money(r.ventas30)} vendidos.</p>
      </section>

      <section>
        <div class="encabezado-sec"><h2>Por resurtir (${r.stockBajo.length})</h2>${r.stockBajo.length > 6 ? html`<a class="ver-mas" href="#/admin/inventario">Ver todo</a>` : ''}</div>
        ${r.stockBajo.length === 0 ? vacio('Todo abastecido', 'Nada está por debajo del mínimo.') : r.stockBajo.slice().sort((a, b) => (a.stock - b.stock) || porNombre(a, b)).slice(0, 6).map((p) => html`
          <div class="fila-admin">
            <div><div class="fila-admin__nombre">${p.nombre}</div><div class="fila-admin__meta">${p.stock === 0 ? 'Agotado' : 'Quedan pocas'} · mínimo ${p.stockMinimo}</div></div>
            <div class="fila-admin__acc"><span class="stock-grande ${p.stock === 0 ? 'stock-grande--cero' : 'stock-grande--bajo'}">${p.stock}</span>
              <button class="btn btn--suave btn--chico" data-a="entrada" data-sku="${p.sku}">+ Sumar</button></div>
          </div>`)}
        
      </section>

      <section>
        <div class="encabezado-sec"><h2>Quién debe (${r.deudores.length})</h2>${r.deudores.length > 6 ? html`<a class="ver-mas" href="#/admin/cobros">Ver todos</a>` : ''}</div>
        ${r.deudores.length === 0 ? vacio('Nadie debe nada') : r.deudores.slice().sort(porDeuda).slice(0, 6).map((d) => html`
          <div class="fila-admin">
            <div><div class="fila-admin__nombre">${d.nombre}</div><div class="fila-admin__meta">${d.correo}</div></div>
            <div class="fila-admin__acc"><strong class="num">${money(d.deuda)}</strong>
              <button class="btn btn--suave btn--chico" data-a="cobrar" data-correo="${d.correo}" data-nombre="${d.nombre}" data-deuda="${d.deuda}">Cobrar</button></div>
          </div>`)}
      </section>

      <section>
        <h2>Lo que piden</h2>
        ${r.sugerencias.length === 0 ? vacio('Sin mensajes todavía') : r.sugerencias.slice(0, 5).map((s) => html`
          <div class="renglon">
            <div>${s.mensaje}<br><small>${s.correo} · ${s.fecha}</small></div>
            <span class="sello ${s.tipo === 'queja' ? 'sello--rojo' : ''}">${s.tipo}</span>
          </div>`)}
      </section>
    </div>`);

  on(c, 'click', '[data-a="entrada"]', (b) => abrirEntrada({ sku: b.dataset.sku }));
  on(c, 'click', '[data-a="cobrar"]', (b) => abrirCobro(b.dataset));
}

// ====================== INVENTARIO ======================

let invFiltro = '';
let invVista = 'venta'; // 'venta' | 'archivados'

async function vInventario(c) {
  mount(c, cargando());
  const r = await api('inv.lista');
  if (!r.ok) { mount(c, errorCaja(r.error)); return; }
  const prods = r.productos;
  cacheProds = prods;
  const cats = Array.from(new Set(prods.map((p) => p.categoria).filter(Boolean))).sort();
  mount(c, html`
    <div class="barra-productos">
      <input id="inv-q" type="search" placeholder="Buscar producto…" aria-label="Buscar producto" value="${invFiltro}" autocomplete="off">
      <button class="btn btn--rojo" data-a="entrada">Registrar compra</button>
      ${puede('prod.guardar') ? html`<button class="btn btn--suave" data-a="nuevo-prod">Nuevo producto</button>` : ''}
    </div>
    <div class="acciones-barra" id="inv-vistas"></div>
    <div id="inv-lista"></div>
    <p class="pie-lista"><a class="link" href="#/admin/corte">Hacer una auditoría de inventario</a></p>`);
  const nVenta = prods.filter((p) => p.activo).length, nArch = prods.length - nVenta;
  const pintarProductos = () => {
    const q = invFiltro.trim().toLowerCase();
    const archivados = invVista === 'archivados';
    mount($('#inv-vistas', c), html`
      <button class="btn ${archivados ? 'btn--suave' : 'btn--rojo'} btn--chico" data-vista="venta">En venta (${nVenta})</button>
      <button class="btn ${archivados ? 'btn--rojo' : 'btn--suave'} btn--chico" data-vista="archivados">Archivados (${nArch})</button>`);
    const visibles = prods.filter((p) => (!q || (p.nombre + p.categoria + p.sku).toLowerCase().includes(q)) && (archivados ? !p.activo : p.activo));
    const grupos = agrupar(visibles.sort(porSeccion));
    const fila = (p) => {
      const bajo = p.stock <= p.stockMinimo;
      return html`
        <div class="fila-admin">
          <span class="stock-grande ${p.stock === 0 ? 'stock-grande--cero' : bajo && p.activo ? 'stock-grande--bajo' : ''}" aria-label="Hay ${p.stock}">${p.stock}</span>
          <div class="fila-admin__texto">
            <div class="fila-admin__nombre">${p.nombre} ${p.activo ? (p.stock === 0 ? html`<span class="sello sello--rojo">Agotado</span>` : bajo ? html`<span class="sello">Quedan pocos</span>` : '') : html`<span class="sello">Archivado</span>`}</div>
            <div class="fila-admin__meta num">${p.categoria} · precio ${money(p.precio)}<span class="solo-pc"> · costo ${money(p.costo)} · vendió ${p.vendido30} en 30 días</span></div>
          </div>
          <div class="fila-admin__acc">
            ${p.activo ? html`<button class="btn btn--suave btn--chico" data-a="entrada" data-sku="${p.sku}">Sumar</button>` : (puede('prod.guardar') ? html`<button class="btn btn--rojo btn--chico" data-a="desarchivar" data-sku="${p.sku}">Sacar del archivo</button>` : '')}
            ${puede('prod.guardar') ? html`<button class="btn btn--suave btn--chico" data-a="editar" data-sku="${p.sku}">Editar</button>` : ''}
          </div>
        </div>`;
    };
    mount($('#inv-lista', c), grupos.length === 0
      ? (archivados ? vacio('No hay productos archivados', 'Archiva los que no vas a vender por un tiempo desde Editar.') : vacio('Sin resultados'))
      : html`${grupos.map((g) => html`
      <section class="seccion-admin"><h2 class="seccion-admin__titulo">${g.cat} <small>${g.items.length}</small></h2>${g.items.map(fila)}</section>`)}`);
  };
  pintarProductos();
  $('#inv-q', c).addEventListener('input', (e) => { invFiltro = e.target.value; pintarProductos(); });
  on(c, 'click', '[data-a="entrada"]', (b) => abrirEntrada({ sku: b.dataset.sku }));
  on(c, 'click', '[data-vista]', (b) => { invVista = b.dataset.vista; pintarProductos(); });
  on(c, 'click', '[data-a="desarchivar"]', (b) => cambiarArchivo(prods.find((p) => p.sku === b.dataset.sku), false));
  on(c, 'click', '[data-a="editar"]', (b) => formProducto(prods.find((p) => p.sku === b.dataset.sku), cats));
  on(c, 'click', '[data-a="nuevo-prod"]', () => nuevoProducto());
}

// Archivar = dejar de venderlo sin perder su historial. Sacar del archivo = volver a ponerlo en venta.
async function cambiarArchivo(p, archivar) {
  const ok = await confirmar(archivar
    ? { titulo: 'Archivar producto', mensaje: p.nombre + ' dejará de aparecer en la tienda y en tus listas. ' + (p.stock > 0 ? 'Todavía tiene ' + p.stock + ' piezas; se quedan registradas. ' : '') + 'Lo encuentras en Archivados.', si: 'Archivar' }
    : { titulo: 'Sacar del archivo', mensaje: p.nombre + ' vuelve a la lista de productos. En la tienda aparece cuando tenga piezas.', si: 'Sacar del archivo' });
  if (!ok) return false;
  const res = await api('prod.guardar', { sku: p.sku, nombre: p.nombre, categoria: p.categoria, precio: p.precio, stockMinimo: p.stockMinimo, costo: p.costo, codigoBarras: p.codigoBarras, imagenUrl: p.imagenUrl, activo: !archivar });
  if (!res.ok) { toast(res.error, 'error'); return false; }
  toast(archivar ? 'Producto archivado.' : 'Producto de vuelta en venta.');
  recargar();
  return true;
}

function listaMovimientos(movs) {
  if (movs.length === 0) return vacio('Todavía no hay movimientos');
  const clase = { ENTRADA: 'sello--ok', VENTA: '', AJUSTE: 'sello--rojo', CONTEO: 'sello--tinta', CORTE: 'sello--tinta', INICIAL: '' };
  return html`${movs.map((m) => html`
    <div class="renglon">
      <div><strong>${m.producto}</strong><br><small>${m.fecha}${m.usuario ? ' · ' + m.usuario : ''}${m.notas ? ' · ' + m.notas : ''}${m.proveedor ? ' · ' + m.proveedor : ''}</small></div>
      <div style="text-align:right"><span class="sello ${clase[m.tipo] || ''}">${m.tipo}</span><br>
        <strong class="num">${m.cantidad > 0 ? '+' : ''}${m.cantidad}</strong> <small class="num">→ ${m.stockDespues}</small></div>
    </div>`)}`;
}

// ---- registrar compra al proveedor ----
const PROVEEDORES = ['ZORRO ABARROTERO', 'OXXO', "SAM'S CLUB", 'Costco', 'Walmart'];

async function abrirEntrada({ sku } = {}) {
  const r = await listaProds();
  if (!r.ok) { toast(r.error, 'error'); return; }
  const prods = r.productos.filter((p) => p.activo || p.sku === sku).sort(porNombre);
  const reqId = newReqId();
  const opciones = (sel) => html`<option value="">Elige un producto…</option>${opcionesProd(prods, (p) => p.nombre, sel)}`;
  const linea = (sel) => html`
    <div class="linea-entrada" data-linea>
      <div class="campo" style="margin:0"><select aria-label="Producto" data-f="sku">${opciones(sel)}</select></div>
      <div class="campo" style="margin:0"><input aria-label="Piezas" data-f="piezas" type="number" inputmode="numeric" min="1" step="1" placeholder="Piezas"></div>
      <div class="campo" style="margin:0"><input aria-label="Costo" data-f="costo" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Costo"></div>
      <button class="icono-btn" data-quitar aria-label="Quitar línea" type="button">✕</button>
    </div>`;
  const h = abrirHoja({
    titulo: 'Registrar compra', ancho: 'ancha',
    cuerpo: html`
      <form id="form-entrada" novalidate>
        <div class="error-form" id="entrada-error" role="alert"></div>
        <div class="fila-campos">
          <div class="campo"><label for="prov">¿Dónde compraste?</label>
            <input id="prov" list="lista-prov" placeholder="OXXO, Sam's, proveedor…" autocomplete="off">
            <datalist id="lista-prov">${PROVEEDORES.map((p) => html`<option value="${p}">`)}</datalist></div>
          <div class="campo"><label for="modo">El costo que pones es</label>
            <select id="modo"><option value="unit">Por pieza</option><option value="total">Total de la línea</option></select></div>
        </div>
        <div id="lineas">${linea(sku)}</div>
        <div class="acciones-barra" style="margin:8px 0">
          <button class="btn btn--suave btn--chico" type="button" id="mas-linea">+ Agregar otro producto</button>
          ${puede('prod.guardar') ? html`<button class="btn btn--suave btn--chico" type="button" id="prod-nuevo">¿No está? Crear producto nuevo</button>` : ''}
        </div>
        <div class="total-fila"><span>Total de la compra</span><span class="num" id="total-entrada">$0.00</span></div>
        <div class="acciones"><button class="btn btn--rojo" type="submit">Guardar compra</button></div>
      </form>`
  });
  const lineasEl = $('#lineas', h.el);
  const total = () => {
    const modo = $('#modo', h.el).value; let t = 0;
    $$('[data-linea]', h.el).forEach((l) => {
      const n = Number($('[data-f="piezas"]', l).value) || 0, cst = Number($('[data-f="costo"]', l).value) || 0;
      t += modo === 'total' ? cst : n * cst;
    });
    $('#total-entrada', h.el).textContent = money(t);
  };
  h.el.addEventListener('input', total);
  $('#modo', h.el).addEventListener('change', total);
  const btnNuevo = $('#prod-nuevo', h.el);
  if (btnNuevo) btnNuevo.addEventListener('click', () => {
    const cats = Array.from(new Set(prods.map((x) => x.categoria).filter(Boolean))).sort();
    h.cerrar(); formProducto(null, cats, () => abrirEntrada());
  });
  $('#mas-linea', h.el).addEventListener('click', () => lineasEl.insertAdjacentHTML('beforeend', linea('').s));
  on(h.el, 'click', '[data-quitar]', (b) => { if ($$('[data-linea]', h.el).length > 1) { b.closest('[data-linea]').remove(); total(); } });

  $('#form-entrada', h.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const caja = $('#entrada-error', h.el); caja.textContent = '';
    const modo = $('#modo', h.el).value;
    const lineas = [];
    for (const l of $$('[data-linea]', h.el)) {
      const s = $('[data-f="sku"]', l).value, piezas = $('[data-f="piezas"]', l).value, costo = $('[data-f="costo"]', l).value;
      if (!s && !piezas && !costo) continue;
      if (!s) { caja.textContent = 'Elige el producto en cada línea.'; return; }
      if (!(Number(piezas) >= 1)) { caja.textContent = 'Pon cuántas piezas compraste de cada producto.'; return; }
      if (costo === '' || !(Number(costo) >= 0)) { caja.textContent = 'Pon el costo de cada producto.'; return; }
      lineas.push(modo === 'total' ? { sku: s, piezas: Number(piezas), costoTotal: Number(costo) } : { sku: s, piezas: Number(piezas), costoUnit: Number(costo) });
    }
    if (lineas.length === 0) { caja.textContent = 'Agrega al menos un producto.'; return; }
    const btn = e.submitter || $('button[type=submit]', h.el);
    const res = await ocupado(btn, 'Guardando…', () => api('inv.entrada', { lineas, proveedor: $('#prov', h.el).value, reqId }));
    if (!res.ok) { caja.textContent = res.error; return; }
    h.cerrar(); toast(res.mensaje); recargar();
  });
}

// ---- ajuste (merma, regalo, correccion) ----
const MOTIVOS = ['Se caducó', 'Se cayó o se dañó', 'Lo regalé', 'Lo consumí yo', 'Corrección de conteo'];

function abrirAjuste(p) {
  const reqId = newReqId();
  const h = abrirHoja({
    titulo: 'Existencia · ' + p.nombre, ancho: 'media',
    cuerpo: html`
      <form id="form-ajuste" novalidate>
        <p class="texto">Ahora hay <strong class="num">${p.stock}</strong> en el sistema.</p>
        <div class="error-form" id="ajuste-error" role="alert"></div>
        <div class="campo"><label for="aj-modo">¿Qué quieres hacer?</label>
          <select id="aj-modo">
            <option value="quitar">Quitar piezas (se caducó, se cayó, lo regalé…)</option>
            <option value="agregar">Agregar piezas (sin registrar una compra)</option>
            <option value="exacto">Dejar la existencia en un número exacto (conteo)</option>
          </select></div>
        <div class="fila-campos">
          <div class="campo"><label for="aj-n" id="aj-n-et">¿Cuántas piezas quitas?</label><input id="aj-n" type="number" inputmode="numeric" min="0" step="1"></div>
          <div class="campo" id="aj-motivo-caja"><label for="aj-motivo">Motivo</label>
            <select id="aj-motivo">${MOTIVOS.map((m) => html`<option>${m}</option>`)}<option value="otro">Otro…</option></select></div>
        </div>
        <div class="campo oculto" id="aj-otro-caja"><label for="aj-otro">Escribe el motivo</label><input id="aj-otro" maxlength="100"></div>
        <p class="suave" id="aj-resultado" style="margin:0 0 12px"></p>
        <div class="acciones"><button class="btn btn--suave" type="button" data-cerrar>Cancelar</button><button class="btn btn--rojo" type="submit">Guardar</button></div>
      </form>`
  });
  const modo = () => $('#aj-modo', h.el).value;
  const refrescar = () => {
    const m = modo(), n = Number($('#aj-n', h.el).value) || 0;
    $('#aj-n-et', h.el).textContent = m === 'quitar' ? '¿Cuántas piezas quitas?' : m === 'agregar' ? '¿Cuántas piezas agregas?' : '¿Cuántas hay en realidad?';
    $('#aj-motivo-caja', h.el).classList.toggle('oculto', m === 'exacto');
    $('#aj-otro-caja', h.el).classList.toggle('oculto', m === 'exacto' || $('#aj-motivo', h.el).value !== 'otro');
    const despues = m === 'quitar' ? p.stock - n : m === 'agregar' ? p.stock + n : n;
    $('#aj-resultado', h.el).textContent = $('#aj-n', h.el).value === '' ? '' : 'Quedarían ' + despues + ' en existencia.';
  };
  h.el.addEventListener('input', refrescar); h.el.addEventListener('change', refrescar); refrescar();
  $('#form-ajuste', h.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const caja = $('#ajuste-error', h.el); caja.textContent = '';
    const m = modo(), n = Number($('#aj-n', h.el).value);
    if ($('#aj-n', h.el).value === '' || !(n >= 0) || Math.floor(n) !== n || (m !== 'exacto' && n < 1)) { caja.textContent = 'Pon cuántas piezas son.'; return; }
    if (m === 'quitar' && n > p.stock) { caja.textContent = 'Solo hay ' + p.stock + ' en el sistema; no puedes quitar más.'; return; }
    const btn = e.submitter || $('button[type=submit]', h.el);
    let res;
    if (m === 'exacto') {
      res = await ocupado(btn, 'Guardando…', () => api('inv.conteo', { conteos: [{ sku: p.sku, real: n }], reqId }));
    } else {
      const sel = $('#aj-motivo', h.el).value;
      const motivo = sel === 'otro' ? $('#aj-otro', h.el).value.trim() : (m === 'agregar' && sel === MOTIVOS[0] ? 'Corrección de conteo' : sel);
      if (motivo.length < 3) { caja.textContent = 'Escribe el motivo.'; return; }
      res = await ocupado(btn, 'Guardando…', () => api('inv.ajuste', { sku: p.sku, delta: (m === 'quitar' ? -1 : 1) * n, motivo, reqId }));
    }
    if (!res.ok) { caja.textContent = res.error; return; }
    h.cerrar(); toast(res.mensaje || 'Existencia guardada.'); recargar();
  });
}

// ---- conteo fisico ----
function abrirConteo(prods) {
  const reqId = newReqId();
  const lista = prods.slice().sort(porNombre);
  const h = abrirHoja({
    titulo: 'Contar la tienda', ancho: 'ancha',
    cuerpo: html`
      <form id="form-conteo" novalidate>
        <p class="texto">Cuenta lo que hay en el estante y escríbelo. Lo que dejes vacío no se toca. Solo se guardan las diferencias.</p>
        <div class="error-form" id="conteo-error" role="alert"></div>
        ${lista.map((p) => html`
          <div class="fila-admin">
            <div><div class="fila-admin__nombre">${p.nombre}</div><div class="fila-admin__meta num">Sistema: ${p.stock}</div></div>
            <div class="fila-admin__acc tabla-conteo"><label class="solo-lector" for="c-${p.sku}">Cuántos hay de ${p.nombre}</label>
              <input id="c-${p.sku}" data-sku="${p.sku}" data-sis="${p.stock}" type="number" inputmode="numeric" min="0" step="1" placeholder="—">
              <span class="sello" data-dif></span></div>
          </div>`)}
        <div class="acciones"><button class="btn btn--rojo" type="submit">Guardar conteo</button></div>
      </form>`
  });
  h.el.addEventListener('input', (e) => {
    const i = e.target.closest('[data-sku]'); if (!i) return;
    const tag = i.parentElement.querySelector('[data-dif]');
    if (i.value === '') { tag.textContent = ''; tag.className = 'sello'; return; }
    const d = Number(i.value) - Number(i.dataset.sis);
    tag.textContent = d === 0 ? 'igual' : (d > 0 ? '+' : '') + d;
    tag.className = 'sello ' + (d === 0 ? 'sello--ok' : 'sello--rojo');
  });
  $('#form-conteo', h.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const conteos = $$('[data-sku]', h.el).filter((i) => i.value !== '').map((i) => ({ sku: i.dataset.sku, real: Number(i.value) }));
    const caja = $('#conteo-error', h.el);
    if (conteos.length === 0) { caja.textContent = 'No escribiste ningún conteo.'; return; }
    if (conteos.some((x) => !(x.real >= 0) || Math.floor(x.real) !== x.real)) { caja.textContent = 'Los conteos deben ser números enteros.'; return; }
    const btn = e.submitter || $('button[type=submit]', h.el);
    const res = await ocupado(btn, 'Guardando…', () => api('inv.conteo', { conteos, reqId }));
    if (!res.ok) { caja.textContent = res.error; return; }
    mount(h.cuerpo, html`
      <p class="texto"><strong>${res.mensaje}</strong> Revisaste ${res.revisados} productos.</p>
      ${res.diferencias.map((d) => html`<div class="renglon"><div>${d.nombre}</div><div class="num">${d.antes} → <strong>${d.real}</strong></div></div>`)}
      <div class="acciones"><button class="btn btn--rojo" data-cerrar>Listo</button></div>`);
    recargar();
  });
}

// ====================== COBROS ======================

async function vCobros(c) {
  mount(c, cargando());
  const r = await api('cobros.lista');
  if (!r.ok) { mount(c, errorCaja(r.error)); return; }
  mount(c, html`
    <div class="caja">
      <div class="destacada"><strong class="num">${money(r.total)}</strong><span>Por cobrar a ${r.deudores.length} personas</span></div>
    </div>
    <div class="acciones-barra">
      ${puede('venta.admin') ? html`<button class="btn btn--rojo" data-a="venta">Anotar venta a un cliente</button>` : ''}
      ${puede('cobros.corte') ? html`<button class="btn btn--tinta" data-a="corte">Generar corte de la quincena</button>` : ''}
    </div>
    <div class="dos-col">
      <section>
        <h2>Quién debe</h2>
        ${r.deudores.length === 0 ? vacio('Nadie debe nada', 'Todo está al corriente.') : r.deudores.slice().sort(porDeuda).map((d) => html`
          <div class="fila-admin">
            <div><div class="fila-admin__nombre">${d.nombre}</div>
              <div class="fila-admin__meta num">${d.pendientes} compras${d.desde ? ' desde ' + d.desde : ''} · límite ${money(d.limite)}</div></div>
            <div class="fila-admin__acc"><strong class="num">${money(d.deuda)}</strong>
              <button class="btn btn--suave btn--chico" data-a="venta-a" data-correo="${d.correo}">+ Anotar</button>
              <button class="btn btn--rojo btn--chico" data-a="cobrar" data-correo="${d.correo}" data-nombre="${d.nombre}" data-deuda="${d.deuda}">Cobrar</button></div>
          </div>`)}
      </section>
      <section>
        <h2>Pagos recientes</h2>
        ${r.pagos.length === 0 ? vacio('Aún no hay pagos registrados') : r.pagos.map((p) => html`
          <div class="renglon"><div>${p.correo}<br><small>${p.fecha} · ${p.metodo}${p.recibidoPor ? ' · recibió ' + p.recibidoPor.split('@')[0] : ''}</small></div>
            <div class="num"><strong>${money(p.monto)}</strong></div></div>`)}
      </section>
    </div>`);
  on(c, 'click', '[data-a="cobrar"]', (b) => abrirCobro(b.dataset));
  on(c, 'click', '[data-a="venta"]', () => abrirVenta());
  on(c, 'click', '[data-a="venta-a"]', (b) => abrirVenta({ correo: b.dataset.correo }));
  on(c, 'click', '[data-a="corte"]', async (b) => {
    const ok = await confirmar({ titulo: 'Generar corte', mensaje: 'Esto guarda una foto de lo que debe cada persona hoy. No cambia las deudas. ¿Continuar?', si: 'Generar corte' });
    if (!ok) return;
    const res = await ocupado(b, 'Generando…', () => api('cobros.corte'));
    toast(res.ok ? res.mensaje : res.error, res.ok ? 'ok' : 'error');
  });
}

function abrirCobro({ correo, nombre, deuda }) {
  const reqId = newReqId();
  const debe = Number(deuda);
  const h = abrirHoja({
    titulo: 'Cobrar a ' + nombre, ancho: 'chica',
    cuerpo: html`
      <form id="form-cobro" novalidate>
        <p class="texto">Debe <strong class="num">${money(debe)}</strong>. Si paga solo una parte, lo demás queda pendiente.</p>
        <div class="error-form" id="cobro-error" role="alert"></div>
        ${campo({ id: 'cb-monto', etiqueta: 'Monto que pagó', tipo: 'number', valor: debe.toFixed(2), attrs: 'inputmode="decimal" min="0.5" step="0.01"' })}
        <div class="campo"><label for="cb-metodo">¿Cómo pagó?</label>
          <select id="cb-metodo"><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="otro">Otro</option></select></div>
        ${campo({ id: 'cb-notas', etiqueta: 'Nota (opcional)', attrs: 'maxlength="100"' })}
        <div class="acciones"><button class="btn btn--rojo" type="submit">Registrar pago</button></div>
      </form>`
  });
  $('#form-cobro', h.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const monto = Number($('#cb-monto', h.el).value);
    const caja = $('#cobro-error', h.el);
    if (!(monto >= 0.5)) { caja.textContent = 'Pon el monto.'; return; }
    if (monto > debe + 0.001) { caja.textContent = 'El pago es mayor que la deuda.'; return; }
    const btn = e.submitter || $('button[type=submit]', h.el);
    const res = await ocupado(btn, 'Guardando…', () => api('cobros.pago', { correo, monto, metodo: $('#cb-metodo', h.el).value, notas: $('#cb-notas', h.el).value, reqId }));
    if (!res.ok) { caja.textContent = res.error; return; }
    h.cerrar(); toast(res.mensaje); recargar();
  });
}

// ====================== PRODUCTOS ======================

// Abre el formulario de producto nuevo con las categorías que ya existen.
async function nuevoProducto() {
  const r = await listaProds();
  const cats = r.ok ? Array.from(new Set(r.productos.map((p) => p.categoria).filter(Boolean))).sort() : [];
  formProducto(null, cats);
}

function formProducto(p, cats, alGuardar) {
  const nuevo = !p;
  const reqId = newReqId();
  p = p || { nombre: '', categoria: '', precio: '', stockMinimo: 2, costo: '', codigoBarras: '', imagenUrl: '', activo: true };
  const h = abrirHoja({
    titulo: nuevo ? 'Producto nuevo' : 'Editar producto', ancho: 'media',
    cuerpo: html`
      <form id="form-prod" novalidate>
        <div class="error-form" id="prod-error" role="alert"></div>
        <div class="fila-campos">
          ${campo({ id: 'pr-nombre', etiqueta: 'Nombre', valor: p.nombre, attrs: 'maxlength="80" autocomplete="off"' })}
          <div class="campo"><label for="pr-cat">Categoría</label>
            <input id="pr-cat" list="lista-cat" value="${p.categoria}" maxlength="30" autocomplete="off" placeholder="Bebidas, Dulces, Snacks…"><datalist id="lista-cat">${cats.map((x) => html`<option value="${x}">`)}</datalist></div>
        </div>
        <div class="fila-campos fila-campos--3">
          ${campo({ id: 'pr-precio', etiqueta: 'Precio de venta', tipo: 'number', valor: p.precio, attrs: 'inputmode="decimal" min="0.5" step="0.5"' })}
          ${campo({ id: 'pr-costo', etiqueta: 'Costo por pieza', tipo: 'number', valor: p.costo, attrs: 'inputmode="decimal" min="0" step="0.01"' })}
          ${campo({ id: 'pr-min', etiqueta: 'Avisar cuando queden', tipo: 'number', valor: p.stockMinimo, attrs: 'inputmode="numeric" min="0" step="1"' })}
        </div>
        ${nuevo ? campo({ id: 'pr-stock', etiqueta: 'Piezas que tienes ahora', tipo: 'number', valor: '', ayuda: 'Quedan registradas como una entrada. Si todavía no llega, déjalo vacío y registra una compra después.', attrs: 'inputmode="numeric" min="0" step="1" placeholder="0"' })
                : campo({ id: 'pr-stock', etiqueta: 'Piezas existentes', tipo: 'number', valor: p.stock, ayuda: 'Puedes poner cualquier número, incluso 0. Si lo cambias, queda como un ajuste de inventario en el historial (no es una compra). Para una compra usa + Sumar.', attrs: 'inputmode="numeric" min="0" step="1"' })}
        <div class="fila-campos">
          <div class="campo">
            <label for="pr-codigo">Código de barras (opcional)</label>
            <input id="pr-codigo" name="pr-codigo" type="text" value="${p.codigoBarras}" inputmode="numeric" maxlength="40">
            <button class="btn btn--suave btn--chico" type="button" id="pr-escanear" style="margin-top:8px">Escanear con la cámara</button>
          </div>
          ${campo({ id: 'pr-img', etiqueta: 'Enlace de la foto (opcional)', tipo: 'url', valor: p.imagenUrl, attrs: 'maxlength="300" placeholder="https://…"' })}
        </div>
        ${nuevo ? '' : html`<div class="campo"><label>${p.activo ? 'En venta' : 'Archivado'}</label>
          <button class="btn btn--suave btn--chico" type="button" data-archivo>${p.activo ? 'Archivar producto' : 'Sacar del archivo'}</button>
          <p class="suave" style="margin:4px 0 0">${p.activo ? 'Si no lo vas a vender en un buen tiempo, archívalo. Se oculta sin perder su historial.' : 'Ahora no aparece en la tienda ni en tus listas.'}</p></div>`}
        <div class="acciones"><button class="btn btn--suave" type="button" data-cerrar>Cancelar</button><button class="btn btn--rojo" type="submit">${nuevo ? 'Crear producto' : 'Guardar cambios'}</button></div>
      </form>`
  });
  const ar = $('[data-archivo]', h.el);
  if (ar) ar.addEventListener('click', async () => { if (await cambiarArchivo(p, p.activo)) h.cerrar(); });
  $('#pr-escanear', h.el).addEventListener('click', () => {
    if (!window.tiendita_escaner) { toast('El lector de códigos no está disponible. Recarga la página.', 'error'); return; }
    const nombreProd = $('#pr-nombre', h.el).value.trim() || 'Producto nuevo';
    window.tiendita_escaner.abrir({
      nombre: nombreProd, dialogo: true,
      alLeer: (codigo) => { $('#pr-codigo', h.el).value = codigo; toast('Código leído: ' + codigo); }
    });
  });
  $('#form-prod', h.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const caja = $('#prod-error', h.el);
    const nombre = $('#pr-nombre', h.el).value.trim();
    const precio = Number($('#pr-precio', h.el).value);
    if (nombre.length < 2) { caja.textContent = 'Escribe el nombre.'; return; }
    if (!(precio >= 0.5)) { caja.textContent = 'Pon el precio de venta.'; return; }
    const img = $('#pr-img', h.el).value.trim();
    if (img && !/^https:\/\//i.test(img)) { caja.textContent = 'El enlace de la foto debe empezar con https://'; return; }
    const datos = {
      sku: nuevo ? '' : p.sku, nombre, categoria: $('#pr-cat', h.el).value.trim(), precio,
      stockMinimo: Number($('#pr-min', h.el).value || 0), costo: $('#pr-costo', h.el).value,
      codigoBarras: $('#pr-codigo', h.el).value.trim(), imagenUrl: img, activo: p.activo
    };
    const crudo = $('#pr-stock', h.el).value.trim();
    if (nuevo) datos.stockInicial = crudo;
    else if (crudo !== String(p.stock)) {
      if (!/^\d+$/.test(crudo)) { caja.textContent = 'Las piezas existentes deben ser un número entero, desde 0.'; return; }
      datos.stock = crudo; datos.stockAntes = p.stock;
    }
    datos.reqId = reqId;
    const btn = e.submitter || $('button[type=submit]', h.el);
    const res = await ocupado(btn, 'Guardando…', () => api('prod.guardar', datos));
    if (!res.ok) { caja.textContent = res.error; return; }
    h.cerrar(); toast(res.mensaje);
    if (alGuardar) alGuardar(); else recargar();
  });
}

// ---- anotar lo que se llevó un cliente ----
async function abrirVenta({ correo: correoIni } = {}) {
  const [ri, ru] = await Promise.all([listaProds(), puede('usr.lista') ? api('usr.lista') : Promise.resolve({ ok: false })]);
  if (!ri.ok) { toast(ri.error, 'error'); return; }
  const prods = ri.productos.filter((x) => x.activo && x.stock > 0).sort(porNombre);
  const clientes = ru.ok ? ru.usuarios.filter((x) => x.activo).sort(porNombre) : [];
  const reqId = newReqId();
  const linea = () => html`
    <div class="linea-venta" data-linea>
      <div class="campo" style="margin:0"><select aria-label="Producto" data-f="sku"><option value="">Elige un producto…</option>${opcionesProd(prods, (x) => x.nombre + ' (' + x.stock + ') · ' + money(x.precio), '')}</select></div>
      <div class="campo" style="margin:0"><input aria-label="Piezas" data-f="cant" type="number" inputmode="numeric" min="1" step="1" value="1"></div>
      <button class="icono-btn" data-quitar aria-label="Quitar línea" type="button">✕</button>
    </div>`;
  const h = abrirHoja({
    titulo: 'Anotar venta a un cliente', ancho: 'media',
    cuerpo: html`
      <form id="form-venta" novalidate>
        <p class="suave" style="margin:0 0 12px">Para cuando alguien se llevó algo y se le olvidó registrarlo. Baja el inventario y suma a su deuda.</p>
        <div class="error-form" id="venta-error" role="alert"></div>
        <div class="campo"><label for="vta-cli">¿Quién se lo llevó?</label>
          ${clientes.length ? html`<select id="vta-cli"><option value="">Elige a la persona…</option>${clientes.map((x) => html`<option value="${x.correo}" ${x.correo === correoIni ? raw('selected') : ''}>${x.nombre} · debe ${money(x.deuda)}</option>`)}</select>`
                            : html`<input id="vta-cli" type="email" placeholder="correo@ejemplo.com">`}</div>
        <div id="vta-lineas">${linea()}</div>
        <div class="acciones-barra" style="margin:8px 0"><button class="btn btn--suave btn--chico" type="button" id="vta-mas">+ Agregar otro producto</button></div>
        <div class="total-fila"><span>Se suma a su deuda</span><span class="num" id="vta-total">$0.00</span></div>
        <div class="acciones"><button class="btn btn--suave" type="button" data-cerrar>Cancelar</button><button class="btn btn--rojo" type="submit">Anotar venta</button></div>
      </form>`
  });
  const totalVenta = () => {
    let t = 0;
    $$('[data-linea]', h.el).forEach((l) => {
      const x = prods.find((q) => q.sku === $('[data-f="sku"]', l).value);
      if (x) t += x.precio * (Number($('[data-f="cant"]', l).value) || 0);
    });
    $('#vta-total', h.el).textContent = money(t);
  };
  h.el.addEventListener('input', totalVenta); h.el.addEventListener('change', totalVenta);
  $('#vta-mas', h.el).addEventListener('click', () => $('#vta-lineas', h.el).insertAdjacentHTML('beforeend', linea().s));
  on(h.el, 'click', '[data-quitar]', (b) => { if ($$('[data-linea]', h.el).length > 1) { b.closest('[data-linea]').remove(); totalVenta(); } });
  $('#form-venta', h.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const caja = $('#venta-error', h.el); caja.textContent = '';
    const correo = $('#vta-cli', h.el).value.trim();
    if (!correo) { caja.textContent = 'Elige quién se lo llevó.'; return; }
    const items = [];
    for (const l of $$('[data-linea]', h.el)) {
      const sku = $('[data-f="sku"]', l).value, cantidad = Number($('[data-f="cant"]', l).value);
      if (!sku) continue;
      if (!(cantidad >= 1)) { caja.textContent = 'Pon cuántas piezas fueron.'; return; }
      items.push({ sku, cantidad });
    }
    if (items.length === 0) { caja.textContent = 'Agrega al menos un producto.'; return; }
    const btn = e.submitter || $('button[type=submit]', h.el);
    const res = await ocupado(btn, 'Anotando…', () => api('venta.admin', { correo, items, reqId }));
    if (!res.ok) { caja.textContent = res.error; return; }
    h.cerrar(); toast('Venta anotada. Nueva deuda: ' + money(res.deudaNueva)); recargar();
  });
}

// ====================== REPORTES ======================

let repMes = '';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const nombreMes = (m) => { const [a, n] = m.split('-'); return MESES[Number(n) - 1] + ' ' + a; };

async function vReportes(c) {
  mount(c, cargando());
  const r = await api('reporte.mes', repMes ? { mes: repMes } : {});
  if (!r.ok) { mount(c, errorCaja(r.error)); return; }
  repMes = r.mes;
  const max = Math.max(1, ...r.porDia);
  const dif = r.ventasMesAnterior > 0 ? Math.round(((r.ventas - r.ventasMesAnterior) / r.ventasMesAnterior) * 100) : null;
  mount(c, html`
    <div class="acciones-barra">
      <div class="campo" style="margin:0;max-width:260px"><label for="rep-mes" class="solo-lector">Mes</label>
        <select id="rep-mes">${r.meses.map((m) => html`<option value="${m}" ${m === r.mes ? raw('selected') : ''}>${nombreMes(m)}</option>`)}</select></div>
      ${puede('reporte.enviar') ? html`<button class="btn btn--suave" data-a="reporte">Enviar reporte del día</button>` : ''}
    </div>
    <div class="caja">
      <div><strong class="num">${money(r.ventas)}</strong><span>Vendido en ${nombreMes(r.mes)}${dif === null ? '' : ' · ' + (dif >= 0 ? '+' : '') + dif + '% vs. mes anterior'}</span></div>
      <div class="destacada"><strong class="num">${money(r.ganancia)}</strong><span>Ganancia estimada · ${r.margen}% de margen</span></div>
      <div><strong class="num">${money(r.cobrado)}</strong><span>Cobrado en el mes</span></div>
      <div><strong class="num">${money(r.porCobrarHoy)}</strong><span>Por cobrar hoy</span></div>
    </div>
    <p class="suave num" style="margin:-8px 0 24px">${r.piezas} piezas en ${r.tickets} compras. ${r.nota}</p>
    <section class="bloque" style="margin-bottom:32px">
      <h2>Ventas por día</h2>
      <div class="barras barras--mes" role="img" aria-label="Ventas por día del mes">
        ${r.porDia.map((m, i) => html`<div title="Día ${i + 1}: ${money(m)}"><i style="height:${Math.round((m / max) * 100)}px"></i><span>${(i + 1) % 5 === 0 || i === 0 ? i + 1 : ''}</span></div>`)}
      </div>
    </section>
    <div class="dos-col">
      <section>
        <h2>Lo que más se vendió</h2>
        ${r.topProductos.length === 0 ? vacio('Sin ventas en este mes') : r.topProductos.map((x) => html`
          <div class="renglon"><div>${x.nombre}<br><small>${x.piezas} piezas</small></div><div class="num"><strong>${money(x.monto)}</strong></div></div>`)}
      </section>
      <section>
        <h2>Quién compró más</h2>
        ${r.topClientes.length === 0 ? vacio('Sin ventas en este mes') : r.topClientes.map((x) => html`
          <div class="renglon"><div>${x.nombre}<br><small>${x.piezas} piezas</small></div><div class="num"><strong>${money(x.monto)}</strong></div></div>`)}
      </section>
    </div>
    <section class="bloque" style="margin-bottom:32px">
      <div class="encabezado-sec">
        <h2>Compras al proveedor</h2>
      </div>
      <div class="caja" style="margin-bottom:8px">
        <div><strong class="num">${money(r.compras.gastado)}</strong><span>Gastado en compras</span></div>
        <div><strong class="num">${r.compras.piezas}</strong><span>Piezas que entraron</span></div>
        <div class="destacada"><strong class="num">${money(r.ventas - r.compras.gastado)}</strong><span>Vendido menos comprado</span></div>
      </div>
      ${r.compras.detalle.length === 0 ? vacio('Sin compras en este mes. Se registran desde Productos.') : html`
        <div class="dos-col" style="margin:8px 0 0">
          <section>
            <h2>Por proveedor</h2>
            ${r.compras.porProveedor.map((x) => html`<div class="renglon"><div>${x.proveedor}</div><div class="num"><strong>${money(x.total)}</strong></div></div>`)}
          </section>
          <section>
            <h2>Cada compra</h2>
            ${r.compras.detalle.map((g) => html`
              <div class="renglon"><div>${g.fecha} · ${g.proveedor}<br><small>${g.lineas.map((l) => l.piezas + ' × ' + l.producto).join(', ')}</small></div><div class="num"><strong>${money(g.total)}</strong></div></div>`)}
          </section>
        </div>`}
    </section>
    <div id="rep-extra"></div>`);
  Promise.all([api('inv.compras'), api('inv.movimientos', { limite: 30 })]).then(([k, m]) => {
    const extra = $('#rep-extra', c); if (!extra) return;
    mount(extra, html`
      <div class="dos-col">
        <section>
          <h2>Qué conviene comprar</h2>
          ${!k.ok ? errorCaja(k.error) : k.lista.length === 0 ? vacio('Nada urgente por comprar') : html`
            <p class="suave">Alcanza para unas 2 semanas de venta.</p>
            ${k.lista.map((x) => html`<div class="renglon"><div>${x.nombre}<br><small class="num">hay ${x.stock} · se vende ${x.vendidoSemana} por semana</small></div><div class="num"><strong>Comprar ${x.sugerido}</strong><br><small>≈ ${money(x.costoEstimado)}</small></div></div>`)}
            <div class="total-fila"><span>Estimado</span><span class="num">${money(k.total)}</span></div>
            <button class="btn btn--rojo" id="copiar-lista">Copiar lista para WhatsApp</button>`}
        </section>
        <section>
          <h2>Últimos movimientos</h2>
          ${!m.ok ? errorCaja(m.error) : listaMovimientos(m.movimientos)}
        </section>
      </div>`);
    const btn = $('#copiar-lista', c);
    if (btn && k.ok) btn.addEventListener('click', async () => {
      const texto = 'Lista de compras Tiendita:\n' + k.lista.map((x) => '• ' + x.nombre + ': ' + x.sugerido).join('\n');
      try { await copiarTexto(texto); toast('Lista copiada.'); } catch (_) { toast('No se pudo copiar. Selecciona y copia a mano.', 'error'); }
    });
  });
  $('#rep-mes', c).addEventListener('change', (e) => { repMes = e.target.value; vReportes(c); });
  on(c, 'click', '[data-a="reporte"]', async (b) => {
    const res = await ocupado(b, 'Enviando…', () => api('reporte.enviar'));
    toast(res.ok ? res.mensaje : res.error, res.ok ? 'ok' : 'error');
  });
}

// ====================== USUARIOS ======================

const ROL_TXT = { admin: 'Admin', operador: 'Operador', cliente: 'Cliente' };

async function vUsuarios(c) {
  mount(c, cargando());
  const r = await api('usr.lista');
  if (!r.ok) { mount(c, errorCaja(r.error)); return; }
  const us = r.usuarios.slice().sort((a, b) => (b.activo - a.activo) || porNombre(a, b));
  mount(c, html`
    <div class="acciones-barra"><button class="btn btn--rojo" data-a="nuevo">Nuevo usuario</button></div>
    <details class="ayuda"><summary>¿Qué hace cada rol?</summary><p class="suave"><strong>Cliente</strong> compra y ve su cuenta. <strong>Operador</strong> además maneja inventario y cobros. <strong>Admin</strong> puede todo.</p></details>
    ${us.map((u) => html`
      <div class="fila-admin fila-admin--apilada" ${u.activo ? '' : raw('style="opacity:.55"')}>
        <div>
          <div class="fila-admin__nombre">${u.nombre} <span class="sello ${u.rol === 'admin' ? 'sello--tinta' : u.rol === 'operador' ? 'sello--ok' : ''}">${ROL_TXT[u.rol]}</span>
            ${u.activo ? '' : html`<span class="sello">Desactivado</span>`}</div>
          <div class="fila-admin__meta num">${u.correo} · debe ${money(u.deuda)} de ${money(u.limite)}${u.rol === 'cliente' ? '' : !u.tienePin ? ' · sin PIN' : u.debeCambiarPin ? ' · PIN temporal' : ''}</div>
        </div>
        <div class="fila-admin__acc">
          <button class="btn btn--suave btn--chico" data-a="editar" data-correo="${u.correo}">Editar</button>
          ${u.rol === 'cliente' ? '' : html`<button class="btn btn--suave btn--chico" data-a="pin" data-correo="${u.correo}" data-nombre="${u.nombre}">Nuevo PIN</button>`}
        </div>
      </div>`)}`);
  on(c, 'click', '[data-a="nuevo"]', () => formUsuario(null));
  on(c, 'click', '[data-a="editar"]', (b) => formUsuario(us.find((u) => u.correo === b.dataset.correo)));
  on(c, 'click', '[data-a="pin"]', async (b) => {
    const ok = await confirmar({ titulo: 'Nuevo PIN', mensaje: 'Se le da un PIN temporal a ' + b.dataset.nombre + ' y se cierra su sesión actual. ¿Continuar?', si: 'Dar PIN nuevo' });
    if (!ok) return;
    const res = await api('usr.resetPin', { correo: b.dataset.correo });
    if (!res.ok) { toast(res.error, 'error'); return; }
    mostrarPin(b.dataset.nombre, res.pinTemporal); recargar();
  });
}

function mostrarPin(nombre, pin) {
  const h = abrirHoja({
    titulo: 'PIN de ' + nombre, ancho: 'chica',
    cuerpo: html`
      <div class="pin-grande" aria-label="PIN temporal">${pin}</div>
      <p class="texto">Dáselo en persona. Al entrar tiene que elegir uno propio. <strong>Este número no se vuelve a mostrar.</strong></p>
      <div class="acciones"><button class="btn btn--suave" id="copiar-pin">Copiar</button><button class="btn btn--rojo" data-cerrar>Listo</button></div>`
  });
  $('#copiar-pin', h.el).addEventListener('click', async () => {
    try { await copiarTexto(pin); toast('PIN copiado.'); } catch (_) { toast('Cópialo a mano.', 'error'); }
  });
}

function formUsuario(u) {
  const nuevo = !u;
  u = u || { correo: '', nombre: '', limite: 500, rol: 'cliente', activo: true };
  const h = abrirHoja({
    titulo: nuevo ? 'Nuevo usuario' : 'Editar usuario', ancho: 'chica',
    cuerpo: html`
      <form id="form-usr" novalidate>
        <div class="error-form" id="usr-error" role="alert"></div>
        ${campo({ id: 'us-correo', etiqueta: 'Correo', tipo: 'email', valor: u.correo, attrs: (nuevo ? '' : 'readonly ') + 'inputmode="email" autocapitalize="off" maxlength="120"' })}
        ${campo({ id: 'us-nombre', etiqueta: 'Nombre', valor: u.nombre, attrs: 'maxlength="60"' })}
        <div class="fila-campos">
          ${campo({ id: 'us-limite', etiqueta: 'Límite de crédito', tipo: 'number', valor: u.limite, attrs: 'inputmode="decimal" min="0" step="50"' })}
          <div class="campo"><label for="us-rol">Rol</label>
            <select id="us-rol">${['cliente', 'operador', 'admin'].map((r) => html`<option value="${r}" ${r === u.rol ? raw('selected') : ''}>${ROL_TXT[r]}</option>`)}</select></div>
        </div>
        <div class="campo campo--fila"><input id="us-activo" type="checkbox" ${u.activo ? raw('checked') : ''}><label for="us-activo">Puede entrar y comprar</label></div>
        <div class="acciones"><button class="btn btn--rojo" type="submit">${nuevo ? 'Crear usuario' : 'Guardar'}</button></div>
      </form>`
  });
  $('#form-usr', h.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const caja = $('#usr-error', h.el);
    const correo = $('#us-correo', h.el).value.trim().toLowerCase();
    const nombre = $('#us-nombre', h.el).value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { caja.textContent = 'Ese correo no es válido.'; return; }
    if (nombre.length < 2) { caja.textContent = 'Escribe el nombre.'; return; }
    const btn = e.submitter || $('button[type=submit]', h.el);
    const res = await ocupado(btn, 'Guardando…', () => api('usr.guardar', {
      correo, nombre, limite: Number($('#us-limite', h.el).value || 0), rol: $('#us-rol', h.el).value, activo: $('#us-activo', h.el).checked
    }));
    if (!res.ok) { caja.textContent = res.error; return; }
    h.cerrar(); recargar();
    if (res.pinTemporal) mostrarPin(nombre, res.pinTemporal); else toast(res.mensaje);
  });
}


// ====================== ACCIONES PLEGADAS (celular) ======================
// En cada fila con varios botones, el principal se queda a la vista y el resto pasa al menú ⋯.
// En computadora todo se ve igual que siempre (el CSS solo esconde los secundarios en celular).
function plegarAcciones(root) {
  $$('.fila-admin__acc:not([data-mas])', root).forEach((acc) => {
    acc.setAttribute('data-mas', '1');
    const bs = $$(':scope > button', acc);
    if (bs.length < 3) return; // con dos botones se ven los dos
    const prim = bs.find((b) => b.classList.contains('btn--rojo')) || bs[0];
    bs.forEach((b) => { if (b !== prim) b.classList.add('sec'); });
    const m = document.createElement('button');
    m.type = 'button'; m.className = 'btn btn--suave btn--chico mas-btn';
    m.setAttribute('aria-label', 'Más acciones'); m.textContent = '⋯';
    acc.appendChild(m);
  });
}
function activarPlegado(root, cuerpo) {
  let pendiente = false;
  new MutationObserver(() => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; plegarAcciones(cuerpo); });
  }).observe(cuerpo, { childList: true, subtree: true });
  on(root, 'click', '.mas-btn', (b) => {
    const acc = b.parentElement;
    const sec = $$(':scope > .sec', acc);
    const nombre = b.closest('.fila-admin').querySelector('.fila-admin__nombre');
    const h = abrirHoja({
      titulo: nombre ? (nombre.firstChild ? nombre.firstChild.textContent.trim() : 'Acciones') || 'Acciones' : 'Acciones', ancho: 'chica',
      cuerpo: html`<div class="menu-acc">${sec.map((x, i) => html`<button class="btn btn--suave" data-i="${i}">${x.textContent}</button>`)}</div>`
    });
    on(h.cuerpo, 'click', '[data-i]', (x) => { h.cerrar(); sec[Number(x.dataset.i)].click(); });
  });
}

// ====================== CORTE DE INVENTARIO ======================

async function vCorte(c) {
  mount(c, cargando());
  const r = await api('corte.lista');
  if (!r.ok) { mount(c, errorCaja(r.error)); return; }
  mount(c, html`
    <div class="acciones-barra"><button class="btn btn--rojo" data-a="nuevo-corte">Nueva auditoría</button></div>
    <details class="ayuda"><summary>¿Cómo funciona?</summary>
      <ol class="pasos">
        <li>Cuentas lo que hay de verdad en la tienda y lo escribes aquí.</li>
        <li>El inventario queda igual a lo que contaste. La tienda sigue desde ahí.</li>
        <li>En el Sheet se guarda lo que había contra lo que hay (hojas Cortes_Inventario y Corte_Detalle).</li>
        <li>Lo que faltó lo cobras a una persona o lo absorbe la tienda.</li>
      </ol></details>
    ${r.cortes.length === 0 ? vacio('Aún no hay auditorías', 'Cuando hagas el primero, aquí verás lo que faltó y a quién se le cobró.') : r.cortes.map((k) => html`
      <div class="fila-admin">
        <div>
          <div class="fila-admin__nombre">${k.fecha} ${k.pendientePiezas > 0 ? html`<span class="sello sello--rojo">Por repartir ${k.pendientePiezas}</span>` : html`<span class="sello sello--ok">Repartido</span>`}</div>
          <div class="fila-admin__meta num">Revisó ${k.revisados} · faltaron ${k.faltantePiezas} (${money(k.faltanteCosto)} al costo) · sobraron ${k.sobrantePiezas}</div>
        </div>
        <div class="fila-admin__acc"><button class="btn btn--suave btn--chico" data-a="ver-corte" data-id="${k.id}">Ver</button></div>
      </div>`)}`);
  on(c, 'click', '[data-a="nuevo-corte"]', async (b) => {
    const p = await ocupado(b, 'Cargando…', () => api('inv.lista'));
    if (!p.ok) { toast(p.error, 'error'); return; }
    abrirCorte(p.productos.filter((x) => x.activo));
  });
  on(c, 'click', '[data-a="ver-corte"]', (b) => verCorte(r.cortes.find((k) => k.id === b.dataset.id)));
}

function abrirCorte(prods) {
  const reqId = newReqId();
  const lista = prods.slice().sort(porSeccion);
  const h = abrirHoja({
    titulo: 'Nueva auditoría', ancho: 'ancha',
    cuerpo: html`
      <form id="form-corte" novalidate>
        <p class="texto">Escribe cuántas piezas hay de verdad. Lo que dejes vacío no se toca.</p>
        <div class="barra-corte">
          <span class="sello" id="corte-prog"></span>
          <button class="btn btn--suave btn--chico" type="button" id="corte-igual">Lo vacío está bien</button>
        </div>
        <div class="error-form" id="corte-error" role="alert"></div>
        ${agrupar(lista).map((g) => html`
          <h3 class="seccion-corte">${glifo(g.cat)} ${g.cat}</h3>
          ${g.items.map((p) => html`
            <div class="fila-admin fila-admin--corte">
              <div><div class="fila-admin__nombre">${p.nombre}</div><div class="fila-admin__meta num">En el sistema: ${p.stock}</div></div>
              <div class="fila-admin__acc tabla-conteo"><label class="solo-lector" for="k-${p.sku}">Cuántos hay de ${p.nombre}</label>
                <input id="k-${p.sku}" data-sku="${p.sku}" data-sis="${p.stock}" type="number" inputmode="numeric" min="0" step="1" placeholder="—">
                <span class="sello" data-dif></span></div>
            </div>`)}`)}
        <div class="campo"><label for="corte-notas">Nota (opcional)</label><input id="corte-notas" maxlength="200" placeholder="Por ejemplo: auditoría de fin de mes"></div>
        <div class="acciones"><button class="btn btn--suave" type="button" data-cerrar>Cancelar</button><button class="btn btn--rojo" type="submit">Revisar y cerrar</button></div>
      </form>`
  });
  const entradas = () => $$('[data-sku]', h.el);
  const progreso = () => {
    const n = entradas().filter((i) => i.value !== '').length;
    $('#corte-prog', h.el).textContent = 'Contados ' + n + ' de ' + lista.length;
  };
  progreso();
  h.el.addEventListener('input', (e) => {
    const i = e.target.closest('[data-sku]'); if (!i) return;
    const tag = i.parentElement.querySelector('[data-dif]');
    if (i.value === '') { tag.textContent = ''; tag.className = 'sello'; }
    else {
      const d = Number(i.value) - Number(i.dataset.sis);
      tag.textContent = d === 0 ? 'igual' : (d > 0 ? '+' : '') + d;
      tag.className = 'sello ' + (d === 0 ? 'sello--ok' : 'sello--rojo');
    }
    progreso();
  });
  $('#corte-igual', h.el).addEventListener('click', () => {
    entradas().forEach((i) => { if (i.value === '') { i.value = i.dataset.sis; i.dispatchEvent(new Event('input', { bubbles: true })); } });
  });
  $('#form-corte', h.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const caja = $('#corte-error', h.el); caja.textContent = '';
    const conteos = entradas().filter((i) => i.value !== '').map((i) => ({ sku: i.dataset.sku, real: Number(i.value), sis: Number(i.dataset.sis) }));
    if (conteos.length === 0) { caja.textContent = 'No escribiste ningún conteo.'; return; }
    if (conteos.some((x) => !(x.real >= 0) || Math.floor(x.real) !== x.real)) { caja.textContent = 'Los conteos deben ser números enteros.'; return; }
    const falta = conteos.filter((x) => x.real < x.sis).reduce((t, x) => t + x.sis - x.real, 0);
    const sobra = conteos.filter((x) => x.real > x.sis).reduce((t, x) => t + x.real - x.sis, 0);
    const vacios = lista.length - conteos.length;
    const ok = await confirmar({
      titulo: 'Cerrar la auditoría',
      mensaje: 'Contaste ' + conteos.length + ' de ' + lista.length + ' productos' + (vacios ? ' (' + vacios + ' sin contar no se tocan)' : '') + '. ' +
        'Faltan ' + falta + ' piezas y sobran ' + sobra + '. El inventario quedará igual a lo que contaste y no se puede deshacer.',
      si: 'Cerrar auditoría'
    });
    if (!ok) return;
    const btn = e.submitter || $('button[type=submit]', h.el);
    const notas = $('#corte-notas', h.el).value.trim();
    const res = await ocupado(btn, 'Guardando…', () => api('corte.cerrar', { conteos: conteos.map((x) => ({ sku: x.sku, real: x.real })), notas, reqId }));
    if (!res.ok) { caja.textContent = res.error; return; }
    h.cerrar(); toast(res.mensaje);
    recargar();
    if (res.faltantePiezas > 0) verCorte({ id: res.id, fecha: 'Corte de hoy', faltantePiezas: res.faltantePiezas, sobrantePiezas: res.sobrantePiezas, faltanteCosto: res.faltanteCosto });
  });
}

// Detalle de un corte: lo que faltó y a quién se le cobra.
async function verCorte(k) {
  const h = abrirHoja({ titulo: k.fecha || 'Corte', ancho: 'ancha', cuerpo: cargando() });
  let usuarios = null;
  let filasActuales = [];
  const pintar = async () => {
    const r = await api('corte.detalle', { id: k.id });
    if (!r.ok) { mount(h.cuerpo, errorCaja(r.error)); return; }
    filasActuales = r.filas;
    const falt = r.filas.filter((f) => f.diff < 0).sort(porSeccion2);
    const sobr = r.filas.filter((f) => f.diff > 0).sort(porSeccion2);
    mount(h.cuerpo, html`
      ${falt.length === 0 ? vacio('No faltó nada', 'Todo lo contado coincide o sobró.') : html`
        <h3 class="seccion-corte">Lo que faltó</h3>
        ${falt.map((f) => html`
          <div class="fila-admin">
            <div>
              <div class="fila-admin__nombre">${f.producto} ${f.pendiente > 0 ? html`<span class="sello sello--rojo">Falta repartir ${f.pendiente}</span>` : html`<span class="sello sello--ok">Repartido</span>`}</div>
              <div class="fila-admin__meta num">Había ${f.sistema}, hay ${f.real} · faltaron ${-f.diff} (${money(-f.diff * f.precio)} a precio de venta)${f.cobradoA ? ' · cobrado a ' + f.cobradoA : ''}${f.absorbida ? ' · tienda absorbió ' + f.absorbida : ''}</div>
            </div>
            ${f.pendiente > 0 ? html`<div class="fila-admin__acc">
              <button class="btn btn--rojo btn--chico" data-a="cobrar-f" data-sku="${f.sku}">Cobrar a…</button>
              <button class="btn btn--suave btn--chico" data-a="absorber-f" data-sku="${f.sku}">La tienda lo absorbe</button></div>` : ''}
          </div>`)}`}
      ${sobr.length ? html`<h3 class="seccion-corte">Lo que sobró</h3>${sobr.map((f) => html`
        <div class="renglon"><div>${f.producto}</div><div class="num">${f.sistema} → <strong>${f.real}</strong> (+${f.diff})</div></div>`)}` : ''}
      <div class="acciones"><button class="btn btn--rojo" data-cerrar>Listo</button></div>`);
  };
  on(h.cuerpo, 'click', '[data-a="cobrar-f"]', async (b) => {
    if (!usuarios) { const u = await api('usr.lista'); if (!u.ok) { toast(u.error, 'error'); return; } usuarios = u.usuarios.filter((x) => x.activo).sort(porNombre); }
    cobrarFaltante(k.id, filasActuales.find((f) => f.sku === b.dataset.sku), usuarios, pintar);
  });
  on(h.cuerpo, 'click', '[data-a="absorber-f"]', async (b) => {
    const f = filasActuales.find((x) => x.sku === b.dataset.sku);
    const cant = f.pendiente;
    const ok = await confirmar({ titulo: 'La tienda lo absorbe', mensaje: 'Se quedan como pérdida de la tienda ' + cant + ' de ' + f.producto + '. No se le cobra a nadie.', si: 'Sí, absorber' });
    if (!ok) return;
    const res = await api('corte.asignar', { idCorte: k.id, sku: f.sku, modo: 'absorber', cantidad: cant, reqId: newReqId() });
    if (!res.ok) { toast(res.error, 'error'); return; }
    toast(res.mensaje); pintar(); recargar();
  });
  pintar();
}
const porSeccion2 = (a, b) => (rangoCat(a.categoria) - rangoCat(b.categoria)) || a.producto.localeCompare(b.producto, 'es');

function cobrarFaltante(idCorte, f, usuarios, alTerminar) {
  const reqId = newReqId();
  const h = abrirHoja({
    titulo: 'Cobrar ' + f.producto, ancho: 'chica',
    cuerpo: html`
      <form id="form-falt" novalidate>
        <p class="texto">Faltan por repartir <strong class="num">${f.pendiente}</strong>. Cada una se cobra a <strong class="num">${money(f.precio)}</strong> y se suma a la deuda de la persona.</p>
        <div class="error-form" id="falt-error" role="alert"></div>
        <div class="campo"><label for="falt-quien">¿A quién se le cobra?</label>
          <select id="falt-quien"><option value="">Elige a una persona…</option>
            ${usuarios.map((u) => html`<option value="${u.correo}">${u.nombre} · debe ${money(u.deuda)}</option>`)}</select></div>
        <div class="campo"><label for="falt-n">¿Cuántas piezas?</label>
          <input id="falt-n" type="number" inputmode="numeric" min="1" max="${f.pendiente}" step="1" value="${f.pendiente}"></div>
        <p class="suave" id="falt-total" style="margin:0 0 12px"></p>
        <div class="acciones"><button class="btn btn--suave" type="button" data-cerrar>Cancelar</button><button class="btn btn--rojo" type="submit">Cobrar</button></div>
      </form>`
  });
  const total = () => { const n = Number($('#falt-n', h.el).value) || 0; $('#falt-total', h.el).textContent = n > 0 ? 'Se cobran ' + money(n * f.precio) + '.' : ''; };
  h.el.addEventListener('input', total); total();
  $('#form-falt', h.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const caja = $('#falt-error', h.el); caja.textContent = '';
    const correo = $('#falt-quien', h.el).value, n = Number($('#falt-n', h.el).value);
    if (!correo) { caja.textContent = 'Elige a quién se le cobra.'; return; }
    if (!(n >= 1) || Math.floor(n) !== n || n > f.pendiente) { caja.textContent = 'Pon un número entre 1 y ' + f.pendiente + '.'; return; }
    const btn = e.submitter || $('button[type=submit]', h.el);
    const res = await ocupado(btn, 'Guardando…', () => api('corte.asignar', { idCorte, sku: f.sku, modo: 'cobrar', correo, cantidad: n, reqId }));
    if (!res.ok) { caja.textContent = res.error; return; }
    h.cerrar(); toast(res.mensaje); alTerminar(); recargar();
  });
}
