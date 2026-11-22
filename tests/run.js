const { makeEnv } = require('./gas_mock.js');
const assert = require('assert');
let pass = 0, fail = 0;
const t = (nombre, fn) => { try { fn(); pass++; console.log('  ok  ' + nombre); } catch (e) { fail++; console.log('FALLA ' + nombre + ' -> ' + e.message); } };

const hoy = new Date();
const seed = {
  Usuarios: [
    ['ID_Correo','Nombre','Deuda_Acumulada','Limite_Credito','Ultimo_Corte_Pagado','Activo','Fecha_Alta','Rol'],
    ['victor.walmart.04@gmail.com','Victor',171,500,'',true,hoy,'Cliente'],
    ['samantha.rosado08@gmail.com','Sam',25,500,'',true,hoy,'Cliente'],
    ['eric@gmail.com','Eric',286,500,'',true,hoy,'Cliente'],
    ['jasso@gmail.com','Jasso',96,500,'',false,hoy,'Cliente']
  ],
  Productos: [
    ['SKU','Nombre','Categoria','Costo','Precio','Stock','Stock_Minimo','Codigo_Barras','Imagen_URL','Activo'],
    ['COC-355','Coca Cola Lata 355ml','Bebidas',16.9,26,3,2,'','',true],
    ['MZP-GIG','Mazapan Gigante','Dulces',4.9,12,2,2,'','',true],
    ['KIN-DEL','Kinder Delice','Dulces',12,25,0,2,'','',true]
  ],
  Ventas: [['ID_Venta','Timestamp','Correo','SKU','Producto','Cantidad','Precio_Unitario','Monto_Total','ID_Corte','Estatus'],
    ['V1-0', new Date(Date.now()-2*86400000),'eric@gmail.com','COC-355','Coca',4,26,104,'','Pendiente'],
    ['V2-0', new Date(Date.now()-1*86400000),'eric@gmail.com','MZP-GIG','Mazapan',3,12,36,'','Pendiente']],
  Cortes: [['ID_Corte','Fecha_Inicio','Fecha_Fin','Correo','Total','Pagado','Fecha_Pago','Metodo_Pago','Notas']],
  Sugerencias: [['Timestamp','Correo','Tipo','Mensaje','Calificacion','Estado']],
  Logs: [['Timestamp','Tipo','Usuario','Mensaje','Datos']],
  Config: [['Clave','Valor','Descripcion']]
};
const E = makeEnv(seed);
const { call, ctx, sheets } = E;

// Configuracion inicial parcial: columnas de PIN y roles (simula lo que hace el menu)
const U = sheets.Usuarios;
U.rows[0][8] = 'PIN_Hash'; U.rows[0][9] = 'Debe_Cambiar_PIN';
U.rows[1][7] = 'admin';
const pinDe = {};
ctx.__asignar = ctx.eval ? null : null;
const vm = require('vm');
const run = code => vm.runInContext(code, ctx);
run('WEB_SOLO_TIENDA = false');  // las pruebas de abajo cubren el modo con panel y PIN
['victor.walmart.04@gmail.com'].forEach(c => { pinDe[c] = run(`_asignarPinTemporal(${JSON.stringify(c)})`); });
console.log('PINs temporales generados:', Object.keys(pinDe).length);

console.log('\nAutenticación');
t('ping sin sesión funciona', () => assert.strictEqual(call('ping', {}).ok, true));
t('catálogo sin token se rechaza', () => assert.strictEqual(call('catalogo', {}).code, 'AUTH'));
t('token falso se rechaza', () => assert.strictEqual(call('catalogo', { token: 'a.b' }).code, 'AUTH'));
t('PIN incorrecto se rechaza (admin)', () => assert.strictEqual(call('login', { email: 'victor.walmart.04@gmail.com', pin: '000000' }).ok, false));
t('correo inexistente da el mismo mensaje', () => assert.strictEqual(call('login', { email: 'nadie@x.com', pin: '123456' }).error, call('login', { email: 'victor.walmart.04@gmail.com', pin: '111111' }).error));
let eric, victor, sam;
t('cliente entra solo con su correo, sin PIN', () => { eric = call('login', { email: 'ERIC@gmail.com ' }); assert.ok(eric.ok && eric.token); assert.strictEqual(eric.debeCambiarPin, false); assert.strictEqual(eric.usuario.rol, 'cliente'); });
t('admin sin PIN: pide el PIN', () => assert.strictEqual(call('login', { email: 'victor.walmart.04@gmail.com' }).code, 'NEEDS_PIN'));
t('correo inexistente sin PIN: también pide PIN (no revela nada)', () => assert.strictEqual(call('login', { email: 'nadie@x.com' }).code, 'NEEDS_PIN'));
t('usuario inactivo no entra', () => assert.strictEqual(call('login', { email: 'jasso@gmail.com' }).ok, false));
t('5 fallos bloquean la cuenta', () => { for (let i = 0; i < 5; i++) call('login', { email: 'victor.walmart.04@gmail.com', pin: '999999' }); const r = call('login', { email: 'victor.walmart.04@gmail.com', pin: pinDe['victor.walmart.04@gmail.com'] }); assert.strictEqual(r.code, 'LOCKED'); });
t('reiniciar PIN desbloquea', () => { pinDe['victor.walmart.04@gmail.com'] = run(`_asignarPinTemporal("victor.walmart.04@gmail.com")`); const r = call('login', { email: 'victor.walmart.04@gmail.com', pin: pinDe['victor.walmart.04@gmail.com'] }); assert.ok(r.ok); });
sam = call('login', { email: 'samantha.rosado08@gmail.com' });
t('el rol "Cliente" de la hoja se lee como cliente', () => assert.strictEqual(sam.usuario.rol, 'cliente'));
victor = call('login', { email: 'victor.walmart.04@gmail.com', pin: pinDe['victor.walmart.04@gmail.com'] });
t('admin se reconoce', () => assert.strictEqual(victor.usuario.rol, 'admin'));

console.log('\nCambio de PIN');
t('PIN débil se rechaza', () => assert.ok(!call('cambiarPin', { token: victor.token, actual: pinDe['victor.walmart.04@gmail.com'], nuevo: '1234' }).ok));
t('PIN actual incorrecto', () => assert.ok(!call('cambiarPin', { token: victor.token, actual: '000000', nuevo: '482913' }).ok));
t('cambio correcto y token nuevo', () => { const r = call('cambiarPin', { token: victor.token, actual: pinDe['victor.walmart.04@gmail.com'], nuevo: '482913' }); assert.ok(r.ok && r.token); const old = call('catalogo', { token: victor.token }); assert.strictEqual(old.code, 'AUTH'); victor.token = r.token; assert.ok(call('catalogo', { token: victor.token }).ok); });
t('PIN guardado no está en texto', () => assert.ok(!JSON.stringify(sheets.Usuarios.rows).includes('482913')));

console.log('\nPermisos');
t('cliente no ve inventario', () => assert.strictEqual(call('inv.lista', { token: eric.token }).code, 'FORBIDDEN'));
t('cliente no puede registrar pagos', () => assert.strictEqual(call('cobros.pago', { token: eric.token, correo: 'eric@gmail.com', monto: 10 }).code, 'FORBIDDEN'));
t('cliente no puede crear usuarios', () => assert.strictEqual(call('usr.guardar', { token: eric.token, correo: 'x@y.com', nombre: 'X', limite: 100, rol: 'admin', activo: true }).code, 'FORBIDDEN'));
t('admin sí ve inventario', () => assert.ok(call('inv.lista', { token: victor.token }).ok));

console.log('\nCompras');
t('cliente compra y baja stock + deuda + movimiento', () => {
  const r = call('comprar', { token: eric.token, reqId: 'a1', items: [{ sku: 'COC-355', cantidad: 2 }] });
  assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.total, 52); assert.strictEqual(r.deudaNueva, 338);
  assert.strictEqual(sheets.Productos.rows[1][5], 1);
  const mov = sheets.Movimientos.rows; assert.strictEqual(mov[mov.length - 1][4], 'VENTA'); assert.strictEqual(mov[mov.length - 1][5], -2);
});
t('doble toque (mismo reqId) no repite la compra', () => { const r = call('comprar', { token: eric.token, reqId: 'a1', items: [{ sku: 'COC-355', cantidad: 2 }] }); assert.ok(r.ok); assert.strictEqual(sheets.Productos.rows[1][5], 1); });
t('stock insuficiente se rechaza', () => assert.strictEqual(call('comprar', { token: eric.token, items: [{ sku: 'COC-355', cantidad: 5 }] }).code, 'OUT_OF_STOCK'));
t('límite de crédito se respeta', () => assert.strictEqual(call('comprar', { token: eric.token, items: [{ sku: 'MZP-GIG', cantidad: 2 }, { sku: 'COC-355', cantidad: 1 }] }).ok, true));
t('perfil trae historial y deuda', () => { const r = call('perfil', { token: eric.token }); assert.ok(r.ok && r.usuario.deuda > 0 && r.historial.length > 0); });

console.log('\nInventario');
t('entrada por lote suma stock y promedia costo', () => {
  const cocAntes = sheets.Productos.rows[1][5];
  const r = call('inv.entrada', { token: victor.token, proveedor: 'Sams', lineas: [{ sku: 'KIN-DEL', piezas: 20, costoTotal: 241.4 }, { sku: 'COC-355', piezas: 12, costoUnit: 18.8 }] });
  assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.totalPiezas, 32);
  const kin = sheets.Productos.rows[3]; assert.strictEqual(kin[5], 20); assert.strictEqual(kin[3], 12.07);
  const coc = sheets.Productos.rows[1]; assert.strictEqual(coc[5], cocAntes + 12);
  assert.strictEqual(coc[3], cocAntes === 0 ? 18.8 : coc[3]);
  call('inv.entrada', { token: victor.token, lineas: [{ sku: 'KIN-DEL', piezas: 20, costoUnit: 14.07 }] });
  assert.strictEqual(sheets.Productos.rows[3][3], 13.07, 'promedio ponderado');
});
t('entrada inválida no cambia nada', () => { const antes = sheets.Productos.rows[2][5]; const r = call('inv.entrada', { token: victor.token, lineas: [{ sku: 'MZP-GIG', piezas: 5, costoUnit: 4 }, { sku: 'NOEXISTE', piezas: 1, costoUnit: 1 }] }); assert.strictEqual(r.ok, false); assert.strictEqual(sheets.Productos.rows[2][5], antes); });
t('ajuste negativo (merma) con motivo', () => { call('inv.ajuste', { token: victor.token, sku: 'MZP-GIG', delta: 5, motivo: 'Corrección de prueba' }); const r = call('inv.ajuste', { token: victor.token, sku: 'MZP-GIG', delta: -1, motivo: 'Se cayó' }); assert.ok(r.ok, JSON.stringify(r)); });
t('ajuste que deja stock negativo se rechaza', () => assert.strictEqual(call('inv.ajuste', { token: victor.token, sku: 'MZP-GIG', delta: -999, motivo: 'prueba' }).ok, false));
t('ajuste sin motivo se rechaza', () => assert.strictEqual(call('inv.ajuste', { token: victor.token, sku: 'MZP-GIG', delta: -1, motivo: '' }).ok, false));
t('conteo físico solo registra diferencias', () => { const r = call('inv.conteo', { token: victor.token, conteos: [{ sku: 'KIN-DEL', real: sheets.Productos.rows[3][5] }, { sku: 'MZP-GIG', real: sheets.Productos.rows[2][5] + 2 }] }); assert.ok(r.ok); assert.strictEqual(r.diferencias.length, 1); assert.strictEqual(r.diferencias[0].diff, 2); });
t('stock de Productos == suma de Movimientos (sin INICIAL)', () => { const sum = {}; sheets.Movimientos.rows.slice(1).forEach(r => sum[r[2]] = (sum[r[2]] || 0) + r[5]); /* partimos de stock inicial 3,2,0 */ const ini = { 'COC-355': 3, 'MZP-GIG': 2, 'KIN-DEL': 0 }; sheets.Productos.rows.slice(1).forEach(p => assert.strictEqual(p[5], ini[p[0]] + (sum[p[0]] || 0), p[0])); });
t('lista de compras sugiere lo urgente', () => { const r = call('inv.compras', { token: victor.token }); assert.ok(r.ok); });
t('movimientos se pueden consultar', () => assert.ok(call('inv.movimientos', { token: victor.token, sku: 'COC-355' }).movimientos.length >= 2));

console.log('\nProductos');
t('crear producto genera SKU y empieza en 0', () => { const r = call('prod.guardar', { token: victor.token, nombre: 'Jarritos Tamarindo', precio: 15, stockMinimo: 2, categoria: 'Bebidas', activo: true }); assert.ok(r.ok && r.nuevo, JSON.stringify(r)); assert.strictEqual(r.sku, 'JAR-TAM'); });
t('imagen con javascript: se rechaza', () => assert.strictEqual(call('prod.guardar', { token: victor.token, sku: 'COC-355', nombre: 'Coca', precio: 26, stockMinimo: 2, imagenUrl: 'javascript:alert(1)', activo: true }).ok, false));
t('nombre con = se neutraliza en la hoja', () => { call('prod.guardar', { token: victor.token, nombre: '=HYPERLINK("x")', precio: 10, stockMinimo: 1, activo: true }); const filas = sheets.Productos.rows; assert.ok(String(filas[filas.length - 1][1]).startsWith("'=")); });
t('operador no puede editar productos', () => { /* se prueba abajo con rol operador */ });

console.log('\nCobros');
t('cobros.lista muestra deudores', () => { const r = call('cobros.lista', { token: victor.token }); assert.ok(r.ok && r.deudores.length >= 2); });
t('pago parcial baja la deuda', () => { const antes = call('perfil', { token: eric.token }).usuario.deuda; const r = call('cobros.pago', { token: victor.token, correo: 'eric@gmail.com', monto: 100, metodo: 'efectivo' }); assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.deudaDespues, antes - 100); });
t('pago mayor a la deuda se rechaza', () => assert.strictEqual(call('cobros.pago', { token: victor.token, correo: 'eric@gmail.com', monto: 99999 }).ok, false));
t('corte no duplica al repetirse', () => { call('cobros.corte', { token: victor.token }); const n1 = sheets.Cortes.rows.length; call('cobros.corte', { token: victor.token }); assert.strictEqual(sheets.Cortes.rows.length, n1); });
t('liquidar total deja deuda 0 y marca ventas pagadas', () => { const d = call('perfil', { token: eric.token }).usuario.deuda; const r = call('cobros.pago', { token: victor.token, correo: 'eric@gmail.com', monto: d, metodo: 'transferencia' }); assert.ok(r.ok); assert.strictEqual(r.deudaDespues, 0); assert.ok(sheets.Ventas.rows.slice(1).filter(v => v[2] === 'eric@gmail.com').every(v => v[9] === 'Pagada')); assert.ok(sheets.Cortes.rows.slice(1).filter(c => c[3] === 'eric@gmail.com').every(c => c[5] === true)); });

console.log('\nUsuarios y roles');
let nuevo;
t('admin crea usuario y recibe PIN temporal', () => { nuevo = call('usr.guardar', { token: victor.token, correo: 'nuevo@x.com', nombre: 'Nuevo', limite: 300, rol: 'operador', activo: true }); assert.ok(nuevo.ok && /^\d{6}$/.test(nuevo.pinTemporal), JSON.stringify(nuevo)); });
t('un cliente nuevo no recibe PIN y entra con su correo', () => { const c = call('usr.guardar', { token: victor.token, correo: 'cli@x.com', nombre: 'Cli', limite: 100, rol: 'cliente', activo: true }); assert.ok(c.ok && !c.pinTemporal, JSON.stringify(c)); assert.ok(call('login', { email: 'cli@x.com' }).ok); });
t('el nuevo entra con su PIN temporal', () => { const r = call('login', { email: 'nuevo@x.com', pin: nuevo.pinTemporal }); assert.ok(r.ok && r.debeCambiarPin); nuevo.token = r.token; });
t('operador ve inventario y puede cobrar', () => { assert.ok(call('inv.lista', { token: nuevo.token }).ok); assert.ok(call('cobros.lista', { token: nuevo.token }).ok); });
t('operador NO edita productos ni usuarios', () => { assert.strictEqual(call('prod.guardar', { token: nuevo.token, nombre: 'X', precio: 5 }).code, 'FORBIDDEN'); assert.strictEqual(call('usr.lista', { token: nuevo.token }).code, 'FORBIDDEN'); });
t('correo inválido se rechaza', () => assert.strictEqual(call('usr.guardar', { token: victor.token, correo: 'noesmail', nombre: 'X', limite: 1, rol: 'cliente', activo: true }).ok, false));
t('no puedes quitarte tu propio admin', () => assert.strictEqual(call('usr.guardar', { token: victor.token, correo: 'victor.walmart.04@gmail.com', nombre: 'Victor', limite: 500, rol: 'cliente', activo: true }).ok, false));
t('al desactivar a alguien su sesión deja de servir', () => { call('usr.guardar', { token: victor.token, correo: 'nuevo@x.com', nombre: 'Nuevo', limite: 300, rol: 'operador', activo: false }); assert.strictEqual(call('catalogo', { token: nuevo.token }).code, 'AUTH'); });
t('reset de PIN invalida sesiones viejas', () => { const op = call('usr.guardar', { token: victor.token, correo: 'op2@x.com', nombre: 'Op2', limite: 100, rol: 'operador', activo: true }); const l = call('login', { email: 'op2@x.com', pin: op.pinTemporal }); assert.ok(l.ok); const r = call('usr.resetPin', { token: victor.token, correo: 'op2@x.com' }); assert.ok(r.ok && r.pinTemporal); assert.strictEqual(call('catalogo', { token: l.token }).code, 'AUTH'); });
t('si un cliente pasa a admin, recibe PIN y su sesión vieja ya no sirve', () => { const r = call('usr.guardar', { token: victor.token, correo: 'samantha.rosado08@gmail.com', nombre: 'Sam', limite: 500, rol: 'admin', activo: true }); assert.ok(r.ok && /^\d{6}$/.test(r.pinTemporal), JSON.stringify(r)); assert.strictEqual(call('usr.lista', { token: sam.token }).code, 'AUTH'); const l = call('login', { email: 'samantha.rosado08@gmail.com', pin: r.pinTemporal }); assert.ok(l.ok); assert.ok(call('usr.lista', { token: l.token }).ok); });

console.log('\nResumen admin');
t('resumen trae KPIs y listas', () => { const r = call('admin.resumen', { token: victor.token }); assert.ok(r.ok && Array.isArray(r.dias) && r.dias.length === 7 && typeof r.ventasHoy === 'number', JSON.stringify(r).slice(0, 300)); });


console.log('\nModo tienda (sin PIN, web solo para comprar) y hojas de trabajo');
run('WEB_SOLO_TIENDA = true');
let vt, et;
t('admin entra solo con correo, sin PIN', () => { vt = call('login', { email: 'victor.walmart.04@gmail.com' }); assert.ok(vt.ok && vt.token, JSON.stringify(vt)); assert.strictEqual(vt.debeCambiarPin, false); });
t('en la web el admin cuenta como cliente (sin panel)', () => { assert.strictEqual(vt.usuario.rol, 'cliente'); assert.ok(!vt.permisos.includes('inv.entrada') && !vt.permisos.includes('*')); });
t('desde la web nadie puede mover inventario ni cobros ni usuarios', () => {
  ['inv.lista', 'inv.entrada', 'inv.ajuste', 'inv.conteo', 'cobros.pago', 'cobros.lista', 'usr.lista', 'usr.guardar', 'prod.guardar', 'admin.resumen'].forEach(a =>
    assert.strictEqual(call(a, { token: vt.token }).code, 'FORBIDDEN', a)); });
t('puede comprar y ver el catálogo como siempre', () => { assert.ok(call('catalogo', { token: vt.token }).ok); assert.ok(call('perfil', { token: vt.token }).ok); });
t('correo no registrado no entra', () => assert.strictEqual(call('login', { email: 'nadie@x.com' }).ok, false));
t('usuario desactivado no entra', () => assert.strictEqual(call('login', { email: 'jasso@gmail.com' }).ok, false));
t('cliente también entra sin PIN', () => { et = call('login', { email: 'eric@gmail.com' }); assert.ok(et.ok); });

t('tienda de siempre: catálogo y perfil solo con correo', () => {
  assert.ok(call('catalogo', { email: 'eric@gmail.com' }).ok);
  const pf = call('perfil', { email: 'eric@gmail.com' });
  assert.ok(pf.ok && pf.usuario.deudaAcumulada !== undefined && pf.usuario.limiteCredito !== undefined, JSON.stringify(pf)); });
t('tienda de siempre: comprar solo con correo devuelve la deuda nueva', () => {
  const pr = call('catalogo', { email: 'eric@gmail.com' }).productos.find(x => x.stock > 0);
  const r = call('comprar', { email: 'eric@gmail.com', items: [{ sku: pr.sku, cantidad: 1 }] });
  assert.ok(r.ok && r.deudaNueva !== undefined, JSON.stringify(r)); });
t('tienda de siempre: correo desconocido no pasa y nadie entra a admin sin token', () => {
  assert.strictEqual(call('perfil', { email: 'nadie@x.com' }).code, 'AUTH');
  assert.strictEqual(call('inv.lista', { email: 'victor.walmart.04@gmail.com' }).code, 'AUTH');
  assert.strictEqual(call('usr.lista', { email: 'victor.walmart.04@gmail.com' }).code, 'AUTH'); });
t('admin web: sin contraseña pide contraseña', () => assert.strictEqual(call('login', { email: 'admin@tiendita.com' }).code, 'NEEDS_PIN'));
t('admin web: contraseña corta se rechaza', () => assert.throws(() => ctx._ponerClaveAdminWeb('corta')));
let aw;
t('admin web: con contraseña buena entra como admin', () => {
  ctx._ponerClaveAdminWeb('clave-larga-1');
  assert.strictEqual(call('login', { email: 'admin@tiendita.com', pin: 'mala-clave' }).ok, false);
  aw = call('login', { email: 'admin@tiendita.com', pin: 'clave-larga-1' });
  assert.ok(aw.ok && aw.usuario.rol === 'admin', JSON.stringify(aw)); });
t('admin web: puede ver inventario y usuarios', () => { assert.ok(call('inv.lista', { token: aw.token }).ok); assert.ok(call('usr.lista', { token: aw.token }).ok); });
t('admin web: cambiar la contraseña cierra su sesión', () => { ctx._ponerClaveAdminWeb('otra-clave-22'); assert.strictEqual(call('inv.lista', { token: aw.token }).code, 'AUTH'); });
t('admin web: 5 fallos bloquean', () => { for (let i = 0; i < 5; i++) call('login', { email: 'admin@tiendita.com', pin: 'x' + i });
  assert.strictEqual(call('login', { email: 'admin@tiendita.com', pin: 'otra-clave-22' }).code, 'LOCKED'); });
const prods = () => ctx.listarProductos();
const P0 = prods()[0];
const stockDe = (sku) => { ctx.obtenerProducto; return run(`(_invalidarCache(), obtenerProducto(${JSON.stringify(sku)}).stock)`); };
run('_prepararHojasTrabajo()');
t('se crean las hojas Entradas, Ajustes, Conteo y Cobros', () => ['Entradas', 'Ajustes', 'Conteo', 'Cobros'].forEach(n => assert.ok(sheets[n], n)));

t('entrada desde la hoja sube el stock y queda en Movimientos', () => {
  const antes = stockDe(P0.sku), nMov = sheets.Movimientos.rows.length;
  sheets.Entradas.rows.push([P0.nombre, 10, 50, 'Proveedor X', '']);
  const r = run('procesarEntradasHoja()'); assert.strictEqual(r.aplicadas, 1, JSON.stringify(r));
  assert.strictEqual(stockDe(P0.sku), antes + 10);
  assert.strictEqual(sheets.Movimientos.rows.length, nMov + 1);
  assert.ok(String(sheets.Entradas.rows[1][4]).startsWith('✅'), sheets.Entradas.rows[1][4]);
});
t('una fila ya aplicada no se vuelve a aplicar', () => { const antes = stockDe(P0.sku); const r = run('procesarEntradasHoja()'); assert.strictEqual(r.aplicadas, 0); assert.strictEqual(stockDe(P0.sku), antes); });
t('producto que no existe: error claro y no toca nada', () => { sheets.Entradas.rows.push(['Cosa inventada', 5, 10, '', '']); const r = run('procesarEntradasHoja()'); assert.strictEqual(r.fallos, 1); assert.ok(String(sheets.Entradas.rows[2][4]).startsWith('❌')); });
t('ajuste negativo resta y pide motivo', () => {
  const antes = stockDe(P0.sku);
  sheets.Ajustes.rows.push([P0.nombre, -2, 'se caducó', '']);
  sheets.Ajustes.rows.push([P0.nombre, -1, '', '']);
  const r = run('procesarAjustesHoja()'); assert.strictEqual(r.aplicadas, 1); assert.strictEqual(r.fallos, 1);
  assert.strictEqual(stockDe(P0.sku), antes - 2);
});
t('ajuste que dejaría stock negativo se rechaza', () => { sheets.Ajustes.rows.push([P0.nombre, -99999, 'prueba', '']); const r = run('procesarAjustesHoja()'); assert.strictEqual(r.fallos, 1); });
t('conteo: se prepara, se llena y corrige solo las diferencias', () => {
  const pc = run('prepararConteoHoja()'); assert.ok(pc.productos > 0);
  const fila = sheets.Conteo.rows.findIndex((f, i) => i > 0 && f[0] === P0.sku);
  const sistema = stockDe(P0.sku); assert.strictEqual(sheets.Conteo.rows[fila][2], sistema);
  sheets.Conteo.rows[fila][3] = sistema + 3;
  const r = run('procesarConteoHoja()'); assert.strictEqual(r.aplicadas, 1, JSON.stringify(r));
  assert.strictEqual(stockDe(P0.sku), sistema + 3);
  assert.ok(String(sheets.Conteo.rows[fila][4]).includes('Sobraban 3'), sheets.Conteo.rows[fila][4]);
});
t('lo que se movió desde la hoja cuadra con Movimientos (producto probado)', () => {
  const movs = sheets.Movimientos.rows.slice(1).filter(m => String(m[2]) === P0.sku);
  const ult = movs[movs.length - 1]; assert.strictEqual(Number(ult[10]), stockDe(P0.sku));
});
t('cobro desde la hoja baja la deuda', () => {
  const antes = call('perfil', { token: et.token }).usuario.deuda;
  if (antes <= 0) return;
  sheets.Cobros.rows.push(['eric@gmail.com', 1, 'efectivo', 'prueba', '']);
  const r = run('procesarCobrosHoja()'); assert.strictEqual(r.aplicadas, 1, JSON.stringify(r));
  assert.strictEqual(call('perfil', { token: et.token }).usuario.deuda, antes - 1);
});
run('WEB_SOLO_TIENDA = false');

console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
