import { api, newReqId } from './api.js';
import { S, puede } from './state.js';
import { html, raw, mount, on, $, $$, reiniciarRaiz, toast, ocupado, abrirHoja, confirmar, money, moneyShort, campo, errorCaja, vacio, copiarTexto, esc } from './ui.js';

const SUBS = [
  { id: 'resumen', nombre: 'Resumen', permiso: 'admin.resumen' },
  { id: 'inventario', nombre: 'Inventario', permiso: 'inv.lista' },
  { id: 'cobros', nombre: 'Cobros', permiso: 'cobros.lista' },
  { id: 'productos', nombre: 'Productos', permiso: 'prod.guardar' },
  { id: 'usuarios', nombre: 'Usuarios', permiso: 'usr.lista' }
];
const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
const cargando = (t = 'Cargando…') => html`<div class="cargando">${t}</div>`;
let recargar = () => {};

export async function renderAdmin(root, sub) {
  root = reiniciarRaiz(root);
  const subs = SUBS.filter((s) => puede(s.permiso));
  if (!subs.find((s) => s.id === sub)) sub = subs[0].id;
  mount(root, html`
    <h1 class="solo-lector">Panel</h1>
    <nav class="subnav" aria-label="Panel">
      ${subs.map((s) => html`<a href="#/admin/${s.id}" ${s.id === sub ? raw('aria-current="page"') : ''}>${s.nombre}</a>`)}
    </nav>
    <div id="admin-cuerpo"></div>`);
  const cuerpo = $('#admin-cuerpo', root);
  const vistas = { resumen: vResumen, inventario: vInventario, cobros: vCobros, productos: vProductos, usuarios: vUsuarios };
  recargar = () => renderAdmin($('#vista'), sub);
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
      <div><strong class="num">${money(r.deudaTotal)}</strong><span>Por cobrar</span></div>
      <div><strong class="num">${money(r.valorInventarioCosto)}</strong><span>Mercancía en la tienda (a costo)</span></div>
    </div>

    <div class="acciones-barra">
      <button class="btn btn--rojo" data-a="entrada">Registrar compra</button>
      ${puede('reporte.enviar') ? html`<button class="btn btn--suave" data-a="reporte">Enviar reporte del día</button>` : ''}
    </div>

    <div class="dos-col">
      <section>
        <h2>Ventas de la semana</h2>
        <div class="barras" role="img" aria-label="Ventas por día">
          ${r.dias.map((d) => html`<div><b class="num">${d.monto ? moneyShort(d.monto) : ''}</b><i style="height:${Math.round((d.monto / max) * 84)}px"></i><span>${d.etiqueta}</span></div>`)}
        </div>
        <p class="suave num" style="margin-top:12px">Ganancia estimada de 30 días: <strong>${money(r.ganancia30)}</strong> sobre ${money(r.ventas30)} vendidos.</p>
      </section>

      <section>
        <h2>Por resurtir (${r.stockBajo.length})</h2>
        ${r.stockBajo.length === 0 ? vacio('Todo abastecido', 'Nada está por debajo del mínimo.') : r.stockBajo.slice(0, 12).map((p) => html`
          <div class="fila-admin">
            <div><div class="fila-admin__nombre">${p.nombre}</div><div class="fila-admin__meta">mínimo ${p.stockMinimo}</div></div>
            <div class="fila-admin__acc"><span class="stock-grande ${p.stock === 0 ? 'stock-grande--cero' : 'stock-grande--bajo'}">${p.stock}</span>
              <button class="btn btn--suave btn--chico" data-a="entrada" data-sku="${p.sku}">Entrada</button></div>
          </div>`)}
        ${r.stockBajo.length > 12 ? html`<p class="suave" style="margin-top:8px">Y ${r.stockBajo.length - 12} más en Inventario.</p>` : ''}
      </section>

      <section>
        <h2>Quién debe (${r.deudores.length})</h2>
        ${r.deudores.length === 0 ? vacio('Nadie debe nada') : r.deudores.slice(0, 10).map((d) => html`
          <div class="fila-admin">
            <div><div class="fila-admin__nombre">${d.nombre}</div><div class="fila-admin__meta">${d.correo}</div></div>
            <div class="fila-admin__acc"><strong class="num">${money(d.deuda)}</strong>
              <button class="btn btn--suave btn--chico" data-a="cobrar" data-correo="${d.correo}" data-nombre="${d.nombre}" data-deuda="${d.deuda}">Cobrar</button></div>
          </div>`)}
      </section>

      <section>
        <h2>Lo que piden</h2>
        ${r.sugerencias.length === 0 ? vacio('Sin mensajes todavía') : r.sugerencias.map((s) => html`
          <div class="renglon">
            <div>${s.mensaje}<br><small>${s.correo} · ${s.fecha}</small></div>
            <span class="sello ${s.tipo === 'queja' ? 'sello--rojo' : ''}">${s.tipo}</span>
          </div>`)}
      </section>
    </div>`);

  on(c, 'click', '[data-a="entrada"]', (b) => abrirEntrada({ sku: b.dataset.sku }));
  on(c, 'click', '[data-a="cobrar"]', (b) => abrirCobro(b.dataset));
  on(c, 'click', '[data-a="reporte"]', async (b) => {
    const res = await ocupado(b, 'Enviando…', () => api('reporte.enviar'));
    toast(res.ok ? res.mensaje : res.error, res.ok ? 'ok' : 'error');
  });
}

// ====================== INVENTARIO ======================

let invTab = 'productos';
let invFiltro = '';

async function vInventario(c) {
  mount(c, cargando());
  const r = await api('inv.lista');
  if (!r.ok) { mount(c, errorCaja(r.error)); return; }
  const prods = r.productos;
  mount(c, html`
    <div class="acciones-barra">
      <button class="btn btn--rojo" data-a="entrada">Registrar compra</button>
      <button class="btn btn--suave" data-a="conteo">Contar todo</button>
    </div>
    <div class="chips" id="inv-tabs">
      <button class="chip" data-tab="productos" aria-pressed="${invTab === 'productos'}">Productos</button>
      <button class="chip" data-tab="compras" aria-pressed="${invTab === 'compras'}">Lista de compras</button>
      <button class="chip" data-tab="movimientos" aria-pressed="${invTab === 'movimientos'}">Movimientos</button>
    </div>
    <div id="inv-cuerpo"></div>`);

  const cuerpo = $('#inv-cuerpo', c);
  const pintarProductos = () => {
    const q = invFiltro.trim().toLowerCase();
    const lista = prods.filter((p) => !q || (p.nombre + p.categoria + p.sku).toLowerCase().includes(q))
      .sort((a, b) => (b.activo - a.activo) || ((a.stock <= a.stockMinimo ? 0 : 1) - (b.stock <= b.stockMinimo ? 0 : 1)) || porNombre(a, b));
    mount($('#inv-lista', c), lista.length === 0 ? vacio('Sin resultados') : html`${lista.map((p) => {
      const bajo = p.stock <= p.stockMinimo;
      const margen = p.precio > 0 ? Math.round(((p.precio - p.costo) / p.precio) * 100) : 0;
      return html`
        <div class="fila-admin fila-admin--apilada" ${p.activo ? '' : raw('style="opacity:.55"')}>
          <div>
            <div class="fila-admin__nombre">${p.nombre} ${p.activo ? '' : html`<span class="sello">Inactivo</span>`}</div>
            <div class="fila-admin__meta num">${p.categoria} · costo ${money(p.costo)} · precio ${money(p.precio)} · margen ${margen}% · vendió ${p.vendido30} en 30 días · mínimo ${p.stockMinimo}</div>
          </div>
          <div class="fila-admin__acc">
            <span class="stock-grande ${p.stock === 0 ? 'stock-grande--cero' : bajo ? 'stock-grande--bajo' : ''}" aria-label="Stock ${p.stock}">${p.stock}</span>
            <button class="btn btn--suave btn--chico" data-a="entrada" data-sku="${p.sku}">Entrada</button>
            <button class="btn btn--suave btn--chico" data-a="ajuste" data-sku="${p.sku}">Ajustar</button>
            <button class="btn btn--suave btn--chico" data-a="historial" data-sku="${p.sku}">Historial</button>
          </div>
        </div>`;
    })}`);
  };

  const pintarTab = async () => {
    $$('#inv-tabs .chip', c).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === invTab)));
    if (invTab === 'productos') {
      mount(cuerpo, html`
        <label class="solo-lector" for="inv-q">Buscar</label>
        <input id="inv-q" type="search" placeholder="Buscar producto…" value="${invFiltro}" autocomplete="off" style="margin-bottom:8px">
        <div id="inv-lista"></div>`);
      pintarProductos();
      $('#inv-q', c).addEventListener('input', (e) => { invFiltro = e.target.value; pintarProductos(); });
    } else if (invTab === 'compras') {
      mount(cuerpo, cargando());
      const k = await api('inv.compras');
      if (!k.ok) { mount(cuerpo, errorCaja(k.error)); return; }
      mount(cuerpo, k.lista.length === 0 ? vacio('Nada urgente por comprar', 'Cuando algo baje del mínimo o se venda rápido, aparece aquí.') : html`
        <p class="suave" style="margin-bottom:6px">Alcanza para unas 2 semanas de venta, según lo que se vendió en 30 días.</p>
        ${k.lista.map((x) => html`
          <div class="fila-admin">
            <div><div class="fila-admin__nombre">${x.nombre}</div>
              <div class="fila-admin__meta num">hay ${x.stock} · se vende ${x.vendidoSemana} por semana${x.dias != null ? ' · alcanza ' + x.dias + ' días' : ''}</div></div>
            <div class="fila-admin__acc"><strong class="num">Comprar ${x.sugerido}</strong><span class="suave num">≈ ${money(x.costoEstimado)}</span></div>
          </div>`)}
        <div class="total-fila"><span>Estimado</span><span class="num">${money(k.total)}</span></div>
        <button class="btn btn--tinta" id="copiar-lista">Copiar lista para WhatsApp</button>`);
      const btn = $('#copiar-lista', c);
      if (btn) btn.addEventListener('click', async () => {
        const texto = 'Lista de compras Tiendita:\n' + k.lista.map((x) => '• ' + x.nombre + ': ' + x.sugerido).join('\n');
        try { await copiarTexto(texto); toast('Lista copiada.'); } catch (_) { toast('No se pudo copiar. Selecciona y copia a mano.', 'error'); }
      });
    } else {
      mount(cuerpo, cargando());
      const m = await api('inv.movimientos', { limite: 150 });
      if (!m.ok) { mount(cuerpo, errorCaja(m.error)); return; }
      mount(cuerpo, listaMovimientos(m.movimientos));
    }
  };

  on(c, 'click', '[data-tab]', (b) => { invTab = b.dataset.tab; pintarTab(); });
  on(c, 'click', '[data-a="entrada"]', (b) => abrirEntrada({ sku: b.dataset.sku }));
  on(c, 'click', '[data-a="ajuste"]', (b) => abrirAjuste(prods.find((p) => p.sku === b.dataset.sku)));
  on(c, 'click', '[data-a="conteo"]', () => abrirConteo(prods.filter((p) => p.activo)));
  on(c, 'click', '[data-a="historial"]', async (b) => {
    const p = prods.find((x) => x.sku === b.dataset.sku);
    const h = abrirHoja({ titulo: 'Historial · ' + p.nombre, ancho: 'ancha', cuerpo: cargando() });
    const m = await api('inv.movimientos', { sku: p.sku, limite: 100 });
    mount(h.cuerpo, m.ok ? listaMovimientos(m.movimientos) : errorCaja(m.error));
  });
  await pintarTab();
}

function listaMovimientos(movs) {
  if (movs.length === 0) return vacio('Todavía no hay movimientos');
  const clase = { ENTRADA: 'sello--ok', VENTA: '', AJUSTE: 'sello--rojo', CONTEO: 'sello--tinta', INICIAL: '' };
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
  const r = await api('inv.lista');
  if (!r.ok) { toast(r.error, 'error'); return; }
  const prods = r.productos.filter((p) => p.activo || p.sku === sku).sort(porNombre);
  const reqId = newReqId();
  const opciones = (sel) => html`<option value="">Elige un producto…</option>${prods.map((p) => html`<option value="${p.sku}" ${p.sku === sel ? raw('selected') : ''}>${p.nombre}</option>`)}`;
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
        <button class="btn btn--suave btn--chico" type="button" id="mas-linea">+ Agregar otro producto</button>
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
    titulo: 'Ajustar · ' + p.nombre, ancho: 'chica',
    cuerpo: html`
      <form id="form-ajuste" novalidate>
        <p class="texto">Hay <strong class="num">${p.stock}</strong> en el sistema.</p>
        <div class="error-form" id="ajuste-error" role="alert"></div>
        <div class="fila-campos">
          <div class="campo"><label for="aj-signo">¿Qué pasó?</label>
            <select id="aj-signo"><option value="-1">Salieron piezas</option><option value="1">Sobraron piezas</option></select></div>
          <div class="campo"><label for="aj-n">¿Cuántas?</label><input id="aj-n" type="number" inputmode="numeric" min="1" step="1"></div>
        </div>
        <div class="campo"><label for="aj-motivo">Motivo</label>
          <select id="aj-motivo">${MOTIVOS.map((m) => html`<option>${m}</option>`)}<option value="otro">Otro…</option></select></div>
        <div class="campo oculto" id="aj-otro-caja"><label for="aj-otro">Escribe el motivo</label><input id="aj-otro" maxlength="100"></div>
        <div class="acciones"><button class="btn btn--rojo" type="submit">Guardar ajuste</button></div>
      </form>`
  });
  $('#aj-motivo', h.el).addEventListener('change', (e) => $('#aj-otro-caja', h.el).classList.toggle('oculto', e.target.value !== 'otro'));
  $('#form-ajuste', h.el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const caja = $('#ajuste-error', h.el);
    const n = Number($('#aj-n', h.el).value);
    if (!(n >= 1) || Math.floor(n) !== n) { caja.textContent = 'Pon cuántas piezas son.'; return; }
    const sel = $('#aj-motivo', h.el).value;
    const motivo = sel === 'otro' ? $('#aj-otro', h.el).value.trim() : sel;
    if (motivo.length < 3) { caja.textContent = 'Escribe el motivo.'; return; }
    const btn = e.submitter || $('button[type=submit]', h.el);
    const res = await ocupado(btn, 'Guardando…', () => api('inv.ajuste', { sku: p.sku, delta: Number($('#aj-signo', h.el).value) * n, motivo, reqId }));
    if (!res.ok) { caja.textContent = res.error; return; }
    h.cerrar(); toast(res.mensaje); recargar();
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
    <div class="caja" style="grid-template-columns:1fr">
      <div style="border-bottom:0"><strong class="num">${money(r.total)}</strong><span>Por cobrar a ${r.deudores.length} personas</span></div>
    </div>
    ${puede('cobros.corte') ? html`<div class="acciones-barra"><button class="btn btn--tinta" data-a="corte">Generar corte de la quincena</button></div>` : ''}
    <div class="dos-col">
      <section>
        <h2>Quién debe</h2>
        ${r.deudores.length === 0 ? vacio('Nadie debe nada', 'Todo está al corriente.') : r.deudores.map((d) => html`
          <div class="fila-admin">
            <div><div class="fila-admin__nombre">${d.nombre}</div>
              <div class="fila-admin__meta num">${d.pendientes} compras${d.desde ? ' desde ' + d.desde : ''} · límite ${money(d.limite)}</div></div>
            <div class="fila-admin__acc"><strong class="num">${money(d.deuda)}</strong>
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

async function vProductos(c) {
  mount(c, cargando());
  const r = await api('inv.lista');
  if (!r.ok) { mount(c, errorCaja(r.error)); return; }
  const prods = r.productos.slice().sort((a, b) => (b.activo - a.activo) || porNombre(a, b));
  const cats = Array.from(new Set(prods.map((p) => p.categoria).filter(Boolean))).sort();
  mount(c, html`
    <div class="acciones-barra"><button class="btn btn--rojo" data-a="nuevo">Nuevo producto</button></div>
    ${prods.map((p) => html`
      <div class="fila-admin" ${p.activo ? '' : raw('style="opacity:.55"')}>
        <div><div class="fila-admin__nombre">${p.nombre} ${p.activo ? '' : html`<span class="sello">Inactivo</span>`}</div>
          <div class="fila-admin__meta num">${p.sku} · ${p.categoria} · costo ${money(p.costo)}</div></div>
        <div class="fila-admin__acc"><strong class="num">${money(p.precio)}</strong>
          <button class="btn btn--suave btn--chico" data-a="editar" data-sku="${p.sku}">Editar</button></div>
      </div>`)}`);
  on(c, 'click', '[data-a="nuevo"]', () => formProducto(null, cats));
  on(c, 'click', '[data-a="editar"]', (b) => formProducto(prods.find((p) => p.sku === b.dataset.sku), cats));
}

function formProducto(p, cats) {
  const nuevo = !p;
  p = p || { nombre: '', categoria: '', precio: '', stockMinimo: 2, costo: '', codigoBarras: '', imagenUrl: '', activo: true };
  const h = abrirHoja({
    titulo: nuevo ? 'Nuevo producto' : 'Editar producto', ancho: 'chica',
    cuerpo: html`
      <form id="form-prod" novalidate>
        <div class="error-form" id="prod-error" role="alert"></div>
        ${campo({ id: 'pr-nombre', etiqueta: 'Nombre', valor: p.nombre, attrs: 'maxlength="80"' })}
        <div class="campo"><label for="pr-cat">Categoría</label>
          <input id="pr-cat" list="lista-cat" value="${p.categoria}" maxlength="30"><datalist id="lista-cat">${cats.map((x) => html`<option value="${x}">`)}</datalist></div>
        <div class="fila-campos">
          ${campo({ id: 'pr-precio', etiqueta: 'Precio de venta', tipo: 'number', valor: p.precio, attrs: 'inputmode="decimal" min="0.5" step="0.5"' })}
          ${campo({ id: 'pr-min', etiqueta: 'Avisar cuando queden', tipo: 'number', valor: p.stockMinimo, attrs: 'inputmode="numeric" min="0" step="1"' })}
        </div>
        ${campo({ id: 'pr-costo', etiqueta: 'Costo por pieza', tipo: 'number', valor: p.costo, ayuda: nuevo ? 'Si no lo sabes, déjalo vacío: se calcula al registrar compras.' : 'Se actualiza solo con cada compra. Cámbialo solo para corregirlo.', attrs: 'inputmode="decimal" min="0" step="0.01"' })}
        ${campo({ id: 'pr-codigo', etiqueta: 'Código de barras (opcional)', valor: p.codigoBarras, attrs: 'inputmode="numeric" maxlength="40"' })}
        ${campo({ id: 'pr-img', etiqueta: 'Enlace de la foto (opcional)', tipo: 'url', valor: p.imagenUrl, ayuda: 'Tiene que empezar con https://', attrs: 'maxlength="300"' })}
        <div class="campo campo--fila"><input id="pr-activo" type="checkbox" ${p.activo ? raw('checked') : ''}><label for="pr-activo">Disponible en la tienda</label></div>
        <div class="acciones"><button class="btn btn--rojo" type="submit">Guardar</button></div>
      </form>`
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
      codigoBarras: $('#pr-codigo', h.el).value.trim(), imagenUrl: img, activo: $('#pr-activo', h.el).checked
    };
    const btn = e.submitter || $('button[type=submit]', h.el);
    const res = await ocupado(btn, 'Guardando…', () => api('prod.guardar', datos));
    if (!res.ok) { caja.textContent = res.error; return; }
    h.cerrar(); toast(res.mensaje); recargar();
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
    <p class="suave" style="margin-bottom:6px"><strong>Cliente</strong> compra y ve su cuenta. <strong>Operador</strong> además maneja inventario y cobros. <strong>Admin</strong> puede todo.</p>
    ${us.map((u) => html`
      <div class="fila-admin fila-admin--apilada" ${u.activo ? '' : raw('style="opacity:.55"')}>
        <div>
          <div class="fila-admin__nombre">${u.nombre} <span class="sello ${u.rol === 'admin' ? 'sello--tinta' : u.rol === 'operador' ? 'sello--ok' : ''}">${ROL_TXT[u.rol]}</span>
            ${u.activo ? '' : html`<span class="sello">Desactivado</span>`}</div>
          <div class="fila-admin__meta num">${u.correo} · debe ${money(u.deuda)} de ${money(u.limite)}${!u.tienePin ? ' · sin PIN' : u.debeCambiarPin ? ' · PIN temporal' : ''}</div>
        </div>
        <div class="fila-admin__acc">
          <button class="btn btn--suave btn--chico" data-a="editar" data-correo="${u.correo}">Editar</button>
          <button class="btn btn--suave btn--chico" data-a="pin" data-correo="${u.correo}" data-nombre="${u.nombre}">Nuevo PIN</button>
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
    if (res.nuevo) mostrarPin(nombre, res.pinTemporal); else toast(res.mensaje);
  });
}
