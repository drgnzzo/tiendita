/**
 * ============================================================
 *  🏪 TIENDITA - Backend v2.0.0
 * ============================================================
 *  Modelo: Honor System + Crédito Quincenal
 *  Sheet:  1nw7xBxq5JTHPhFuSiSL8BZZ-Or7hYX9oUMJkWORvf-8
 *
 *  NOVEDADES v2.0.0
 *  ────────────────
 *  • Acceso con correo + PIN (hash con sal) y sesiones firmadas.
 *  • Roles: admin, operador, cliente. Permisos por accion (§4).
 *  • Inventario con libro de movimientos: entradas, ajustes, conteo fisico (§10).
 *  • Cobros con pagos parciales y corte quincenal sin duplicados (§11).
 *  • Panel admin: resumen, productos, usuarios, lista de compras (§12).
 *  • Configuracion inicial segura desde el menu 🏪 TIENDITA (§13).
 *  • Eliminado el bloque de "alias" que llamaba funciones inexistentes.
 *  • "Inicializar Base de Datos" ya no esta en el menu (borraba datos).
 *
 *  SECCIONES
 *  §1 Config · §2 Helpers · §3 Menu · §4 Router y permisos · §5 Productos
 *  §6 Usuarios · §7 Ventas · §8 Reportes y bot · §9 Seguridad
 *  §10 Inventario · §11 Cobros · §12 Admin · §13 Configuracion inicial
 */


// ============================================================
// §1  CONFIGURACION
// ============================================================

const CONFIG = {
  VERSION: '2.0.0',
  TZ:      'America/Mexico_City',
  ADMIN_EMAIL: 'victor.walmart.04@gmail.com',
  HOJAS: {
    USUARIOS:    'Usuarios',
    PRODUCTOS:   'Productos',
    VENTAS:      'Ventas',
    CORTES:      'Cortes',
    SUGERENCIAS: 'Sugerencias',
    LOGS:        'Logs',
    CONFIG_:     'Config',
    MOVIMIENTOS: 'Movimientos',
    PAGOS:       'Pagos'
  },
  COLORES: {
    HEADER:      '#0F172A',
    HEADER_TEXT: '#FFFFFF'
  },
  LIMITE_CREDITO_DEFAULT: 500,
  HORA_REPORTE_DIARIO:    20,
  HORA_ALERTA_STOCK:      8
};


// ============================================================
// §2  HELPERS
// ============================================================

const _cacheRequest = {};

function _memoSS(nombreHoja) {
  if (!_cacheRequest[nombreHoja]) {
    const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
    _cacheRequest[nombreHoja] = s ? s.getDataRange().getValues() : [];
  }
  return _cacheRequest[nombreHoja];
}

function _invalidarCache() {
  Object.keys(_cacheRequest).forEach(k => delete _cacheRequest[k]);
}

function _log(tipo, usuario, mensaje, datos) {
  try {
    const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.HOJAS.LOGS);
    if (!s) return;
    s.appendRow([
      new Date(),
      String(tipo),
      String(usuario || ''),
      String(mensaje || ''),
      String(datos || '')
    ]);
  } catch (e) {
    Logger.log('Error guardando log: ' + e.message);
  }
}

/**
 * Limpia un texto:
 *  • Quita acentos (NFD + diacriticos)
 *  • Reemplaza signos de puntuacion (¿ ? ¡ ! . , ; : ( ) " ') por espacios
 *  • Colapsa espacios multiples a uno
 *  • Pasa a minusculas y recorta
 */
function _normalizar(texto) {
  if (!texto) return '';
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()\[\]{}"'`´]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/**
 * Distancia Damerau-Levenshtein:
 * cuenta insercion, borrado, sustitucion y transposicion de letras adyacentes
 * como un solo error cada una. Sirve para tolerar typos del tipo "cunato"->"cuanto".
 */
function _distanciaPalabras(a, b) {
  if (a === b) return 0;
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;
  const m = a.length, n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) {
    dp.push(new Array(n + 1).fill(0));
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j]     + 1,    // borrar
        dp[i][j - 1]     + 1,    // insertar
        dp[i - 1][j - 1] + cost  // sustituir
      );
      // transposicion (Damerau)
      if (i > 1 && j > 1 &&
          a.charAt(i - 1) === b.charAt(j - 2) &&
          a.charAt(i - 2) === b.charAt(j - 1)) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}

/**
 * Umbral de tolerancia segun la palabra mas larga.
 * - 1-3 letras: solo coincidencia exacta o substring
 * - 4-5 letras: 1 error
 * - 6-8 letras: 2 errores
 * - 9+ letras:  3 errores
 */
function _umbralTypo(len) {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 8) return 2;
  return 3;
}

/**
 * True si dos palabras se consideran "iguales" con tolerancia a typos.
 * Incluye: igualdad exacta, substring (cualquier direccion), y distancia <= umbral.
 */
function _palabraSimilar(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 3 && b.includes(a)) return true;
  if (b.length >= 3 && a.includes(b)) return true;
  const umbral = _umbralTypo(Math.max(a.length, b.length));
  if (umbral === 0) return false;
  return _distanciaPalabras(a, b) <= umbral;
}

/**
 * True si alguna palabra de "qNorm" coincide (con tolerancia) con alguna keyword.
 */
function _contieneKeyword(qNorm, keywords) {
  if (!qNorm) return false;
  const palabras = qNorm.split(' ').filter(p => p.length > 0);
  for (let i = 0; i < palabras.length; i++) {
    for (let j = 0; j < keywords.length; j++) {
      if (_palabraSimilar(palabras[i], keywords[j])) return true;
    }
  }
  return false;
}

/**
 * Devuelve la query con las palabras-keyword removidas
 * (tambien con tolerancia a typos). Sirve para extraer el "producto" de la pregunta.
 */
function _quitarKeywords(qNorm, keywords) {
  if (!qNorm) return '';
  return qNorm.split(' ')
    .filter(p => {
      if (!p) return false;
      for (let j = 0; j < keywords.length; j++) {
        if (_palabraSimilar(p, keywords[j])) return false;
      }
      return true;
    })
    .join(' ')
    .trim();
}

function _generarId(prefijo) {
  return (prefijo || '') + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
}

function _round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function _money(n) {
  return '$' + _round2(n).toFixed(2);
}

function _fechaCortaMx(fecha) {
  return Utilities.formatDate(fecha || new Date(), CONFIG.TZ, 'dd/MM/yyyy');
}

function _fechaLargaMx(fecha) {
  return Utilities.formatDate(fecha || new Date(), CONFIG.TZ, 'dd/MM/yyyy HH:mm');
}

function _fechaIsoMx(fecha) {
  return Utilities.formatDate(fecha || new Date(), CONFIG.TZ, 'yyyy-MM-dd');
}

function _mismoDiaMx(fecha1, fecha2) {
  if (!(fecha1 instanceof Date) || !(fecha2 instanceof Date)) return false;
  return _fechaIsoMx(fecha1) === _fechaIsoMx(fecha2);
}


// ============================================================
// §3  MENU & INICIALIZACION DE BD
// ============================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏪 TIENDITA')
    .addItem('▶️ Configuración inicial v2 (una vez)', 'configuracionInicialV2')
    .addSeparator()
    .addSubMenu(ui.createMenu('🗒️ Trabajo diario')
      .addItem('📥 Aplicar ENTRADAS (llegó mercancía)', 'menuAplicarEntradas')
      .addItem('✏️ Aplicar AJUSTES (merma o error)', 'menuAplicarAjustes')
      .addItem('💵 Aplicar COBROS (me pagaron)', 'menuAplicarCobros')
      .addSeparator()
      .addItem('📋 Preparar CONTEO físico', 'menuPrepararConteo')
      .addItem('✅ Aplicar CONTEO', 'menuAplicarConteo')
      .addSeparator()
      .addItem('🧰 Preparar las hojas de trabajo', 'menuPrepararHojasTrabajo'))
    .addSubMenu(ui.createMenu('👥 Usuarios')
      .addItem('➕ Agregar usuario', 'menuAgregarUsuario')
      .addItem('🔑 Contraseña del admin web', 'menuClaveAdminWeb')
      .addItem('🔑 Reiniciar PIN de alguien', 'menuReiniciarPin')
      .addItem('🚫 Desactivar usuario', 'menuDesactivarUsuario')
      .addItem('💸 Liquidar deuda de usuario', 'menuLiquidarDeuda'))
    .addSubMenu(ui.createMenu('📦 Inventario')
      .addItem('✅ Verificar stock contra movimientos', 'menuVerificarStock')
      .addItem('🚨 Ver productos con stock bajo', 'menuStockBajo')
      .addItem('📧 Enviar alerta de stock ahora', 'enviarAlertaStockBajo'))
    .addSubMenu(ui.createMenu('💰 Finanzas')
      .addItem('📊 Ver dashboard', 'menuDashboard')
      .addItem('✂️ Generar corte quincenal', 'menuGenerarCorte')
      .addItem('📧 Enviar reporte diario (prueba)', 'enviarReporteDiario'))
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Sistema')
      .addItem('🔔 Instalar triggers automaticos', 'instalarTriggersAuto')
      .addItem('🗑️ Quitar todos los triggers', 'quitarTriggers')
      .addItem('🔗 Ver info del sistema', 'menuInfoSistema'))
    .addToUi();
}

function inicializarBD() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    'Inicializar Base de Datos',
    'Esto va a:\n\n' +
    '• Crear/limpiar las hojas: Usuarios, Productos, Ventas, Cortes, Sugerencias, Logs, Config\n' +
    '• Precargar al admin (' + CONFIG.ADMIN_EMAIL + ')\n' +
    '• Precargar los 9 productos del lote ZORRO ABARROTERO 7-jun\n\n' +
    'NO toca las hojas ZORRO ABARROTERO ni RESUMEN.\n\n' +
    '¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  _crearHojaUsuarios(ss);
  _crearHojaProductos(ss);
  _crearHojaVentas(ss);
  _crearHojaCortes(ss);
  _crearHojaSugerencias(ss);
  _crearHojaLogs(ss);
  _crearHojaConfig(ss);

  _precargarAdmin(ss);
  _precargarProductos(ss);

  _invalidarCache();
  _log('INIT', CONFIG.ADMIN_EMAIL, 'Base de datos inicializada');

  ui.alert(
    '✅ Listo',
    'Base de datos inicializada con:\n' +
    '• Admin: ' + CONFIG.ADMIN_EMAIL + '\n' +
    '• 9 productos del lote ZORRO ABARROTERO\n' +
    '• 7 hojas del sistema\n\n' +
    'Siguiente: Desplegar → Nueva implementación → Aplicación web.',
    ui.ButtonSet.OK
  );
}

function _crearHojaUsuarios(ss) {
  const s = _abrirOCrearLimpia(ss, CONFIG.HOJAS.USUARIOS);
  const headers = ['ID_Correo', 'Nombre', 'Deuda_Acumulada', 'Limite_Credito', 'Ultimo_Corte_Pagado', 'Activo', 'Fecha_Alta', 'Rol'];
  s.getRange(1, 1, 1, headers.length).setValues([headers]);
  _formatoEncabezado(s, headers.length);
  s.setColumnWidth(1, 240);
  s.setColumnWidth(2, 180);
  s.setColumnWidths(3, headers.length - 2, 130);
}

function _crearHojaProductos(ss) {
  const s = _abrirOCrearLimpia(ss, CONFIG.HOJAS.PRODUCTOS);
  const headers = ['SKU', 'Nombre', 'Categoria', 'Costo', 'Precio', 'Stock', 'Stock_Minimo', 'Codigo_Barras', 'Imagen_URL', 'Activo'];
  s.getRange(1, 1, 1, headers.length).setValues([headers]);
  _formatoEncabezado(s, headers.length);
  s.setColumnWidth(1, 100);
  s.setColumnWidth(2, 260);
  s.setColumnWidth(3, 110);
  s.setColumnWidths(4, 4, 90);
  s.setColumnWidth(8, 140);
  s.setColumnWidth(9, 240);
  s.setColumnWidth(10, 80);
}

function _crearHojaVentas(ss) {
  const s = _abrirOCrearLimpia(ss, CONFIG.HOJAS.VENTAS);
  const headers = ['ID_Venta', 'Timestamp', 'Correo', 'SKU', 'Producto', 'Cantidad', 'Precio_Unitario', 'Monto_Total', 'ID_Corte', 'Estatus'];
  s.getRange(1, 1, 1, headers.length).setValues([headers]);
  _formatoEncabezado(s, headers.length);
  s.setColumnWidth(1, 160);
  s.setColumnWidth(2, 150);
  s.setColumnWidth(3, 230);
  s.setColumnWidth(4, 100);
  s.setColumnWidth(5, 260);
  s.setColumnWidths(6, 5, 110);
}

function _crearHojaCortes(ss) {
  const s = _abrirOCrearLimpia(ss, CONFIG.HOJAS.CORTES);
  const headers = ['ID_Corte', 'Fecha_Inicio', 'Fecha_Fin', 'Correo', 'Total', 'Pagado', 'Fecha_Pago', 'Metodo_Pago', 'Notas'];
  s.getRange(1, 1, 1, headers.length).setValues([headers]);
  _formatoEncabezado(s, headers.length);
  s.setColumnWidth(1, 160);
  s.setColumnWidths(2, 2, 130);
  s.setColumnWidth(4, 230);
  s.setColumnWidths(5, 5, 120);
}

function _crearHojaSugerencias(ss) {
  const s = _abrirOCrearLimpia(ss, CONFIG.HOJAS.SUGERENCIAS);
  const headers = ['Timestamp', 'Correo', 'Tipo', 'Mensaje', 'Calificacion', 'Estado'];
  s.getRange(1, 1, 1, headers.length).setValues([headers]);
  _formatoEncabezado(s, headers.length);
  s.setColumnWidth(1, 150);
  s.setColumnWidth(2, 230);
  s.setColumnWidth(3, 130);
  s.setColumnWidth(4, 360);
  s.setColumnWidth(5, 110);
  s.setColumnWidth(6, 110);
}

function _crearHojaLogs(ss) {
  const s = _abrirOCrearLimpia(ss, CONFIG.HOJAS.LOGS);
  const headers = ['Timestamp', 'Tipo', 'Usuario', 'Mensaje', 'Datos'];
  s.getRange(1, 1, 1, headers.length).setValues([headers]);
  _formatoEncabezado(s, headers.length);
  s.setColumnWidth(1, 150);
  s.setColumnWidth(2, 110);
  s.setColumnWidth(3, 230);
  s.setColumnWidth(4, 360);
  s.setColumnWidth(5, 260);
  s.hideSheet();
}

function _crearHojaConfig(ss) {
  const s = _abrirOCrearLimpia(ss, CONFIG.HOJAS.CONFIG_);
  const headers = ['Clave', 'Valor', 'Descripcion'];
  s.getRange(1, 1, 1, 3).setValues([headers]);
  _formatoEncabezado(s, 3);
  s.setColumnWidth(1, 220);
  s.setColumnWidth(2, 160);
  s.setColumnWidth(3, 400);

  const valores = [
    ['ADMIN_EMAIL',            CONFIG.ADMIN_EMAIL,                  'Correo que recibe reportes diarios y alertas'],
    ['TIMEZONE',               CONFIG.TZ,                           'Zona horaria del sistema'],
    ['LIMITE_CREDITO_DEFAULT', String(CONFIG.LIMITE_CREDITO_DEFAULT),'Limite de credito en MXN para nuevos usuarios'],
    ['HORA_REPORTE_DIARIO',    String(CONFIG.HORA_REPORTE_DIARIO),  'Hora (24h CDMX) para enviar reporte diario'],
    ['HORA_ALERTA_STOCK',      String(CONFIG.HORA_ALERTA_STOCK),    'Hora (24h CDMX) para revisar stock y avisar reabasto'],
    ['STOCK_MINIMO_DEFAULT',   '3',                                 'Stock minimo default antes de alertar reabasto'],
    ['NOMBRE_TIENDA',          'Tiendita',                          'Nombre que aparece en la app'],
    ['MENSAJE_BIENVENIDA',     'Bienvenida a la Tiendita 💕',       'Saludo que ve el usuario al entrar']
  ];
  s.getRange(2, 1, valores.length, 3).setValues(valores);
}

function _precargarAdmin(ss) {
  const s = ss.getSheetByName(CONFIG.HOJAS.USUARIOS);
  s.appendRow([
    CONFIG.ADMIN_EMAIL,
    'Victor (Admin)',
    0,
    99999,
    new Date(),
    true,
    new Date(),
    'admin'
  ]);
}

function _precargarProductos(ss) {
  const s = ss.getSheetByName(CONFIG.HOJAS.PRODUCTOS);
  const productos = [
    ['ACTM-PAL', 'ACTUM de Mantequilla Palomitas',     'Snacks',  11.07, 22.00, 14, 3, '', '', true],
    ['SKW-SAL',  'Skwinkles SalsaGueti',                'Dulces',   7.59, 18.00, 12, 3, '', '', true],
    ['COC-355',  'Coca Cola Lata 355ml',                'Bebidas', 16.90, 26.00, 12, 3, '', '', true],
    ['PIC-FRE',  'Pica Fresa Gigante',                  'Dulces',   1.48,  3.50, 60, 10,'', '', true],
    ['MZP-GIG',  'Mazapan Gigante',                     'Dulces',   4.90, 10.00, 40, 5, '', '', true],
    ['MRC-CAM',  'Sopa Maruchan Camaron Chile Piquin',  'Sopas',   12.29, 25.00, 12, 3, '', '', true],
    ['BON-DOB',  'BonIce Doble Surtido',                'Helados',  6.28, 15.00,  8, 2, '', '', true],
    ['CHU-CHO',  'Chocolate Chutazo',                   'Dulces',   4.23, 10.00, 20, 4, '', '', true],
    ['BNG-MIX',  'Boing Mix',                           'Bebidas', 12.88, 20.00, 24, 4, '', '', true]
  ];
  s.getRange(2, 1, productos.length, productos[0].length).setValues(productos);
  s.getRange(2, 4, productos.length, 2).setNumberFormat('$#,##0.00');
}

function _abrirOCrearLimpia(ss, nombre) {
  let s = ss.getSheetByName(nombre);
  if (!s) s = ss.insertSheet(nombre);
  else    s.clear();
  return s;
}

function _formatoEncabezado(sheet, numCols) {
  sheet.getRange(1, 1, 1, numCols)
    .setBackground(CONFIG.COLORES.HEADER)
    .setFontColor(CONFIG.COLORES.HEADER_TEXT)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

function menuInfoSistema() {
  let url = '(aun no se ha implementado como Web App)';
  try { url = ScriptApp.getService().getUrl() || url; } catch(_) {}
  const triggers = ScriptApp.getProjectTriggers();
  let triggerInfo = triggers.length + ' triggers activos';
  if (triggers.length > 0) {
    triggerInfo += ':\n' + triggers.map(t => '  • ' + t.getHandlerFunction()).join('\n');
  }
  SpreadsheetApp.getUi().alert(
    'INFO DEL SISTEMA\n\n' +
    'Version: ' + CONFIG.VERSION + '\n' +
    'Zona:    ' + CONFIG.TZ + '\n' +
    'Ahora:   ' + _fechaLargaMx() + '\n' +
    'Admin:   ' + CONFIG.ADMIN_EMAIL + '\n' +
    triggerInfo + '\n\n' +
    'URL Web App:\n' + url
  );
}


// ============================================================
// §4  API ROUTER (doGet/doPost) + PERMISOS
// ============================================================
//  Toda accion (menos ping y login) exige un token de sesion.
//  El correo SIEMPRE sale del token, nunca de lo que mande el navegador.
//  Cada accion declara que permiso necesita; el rol decide si lo tiene.

// MODO TIENDA: la pagina web solo sirve para comprar y ver tu cuenta. Entra cualquiera
// registrado con su correo, sin PIN, y nadie puede cambiar inventario ni cobros desde
// la web: eso se hace en la hoja de Google (menu TIENDITA > Trabajo diario).
// Poner en false solo si algun dia se quiere un panel de administracion web con PIN.
var WEB_SOLO_TIENDA = true;

const ROLES = { ADMIN: 'admin', OPERADOR: 'operador', CLIENTE: 'cliente' };
// Usuario especial para administrar desde la web. Entra con contraseña (se pone desde el menu del Sheet).
const ADMIN_WEB = 'admin@tiendita.com';
function _esAdminWeb(u) { return !!u && String(u.correo).toLowerCase() === ADMIN_WEB; }

// Permisos por rol. '*' = todo. El operador ayuda con inventario y cobros
// pero no cambia precios, usuarios ni roles.
const PERMISOS = {
  admin: ['*'],
  operador: [
    'catalogo', 'buscar', 'comprar', 'perfil', 'historial', 'sugerir', 'bot', 'cambiarPin',
    'admin.resumen', 'inv.lista', 'inv.entrada', 'inv.ajuste', 'inv.conteo',
    'inv.movimientos', 'inv.compras', 'cobros.lista', 'cobros.pago'
  ],
  cliente: ['catalogo', 'buscar', 'comprar', 'perfil', 'historial', 'sugerir', 'bot', 'cambiarPin']
};

function _puede(rol, accion) {
  const lista = PERMISOS[rol] || [];
  return lista.indexOf('*') >= 0 || lista.indexOf(accion) >= 0;
}

function _permisosDe(rol) {
  return PERMISOS[rol] || [];
}

// accion -> funcion(usuarioDeSesion, parametros)
const API_RUTAS = {
  catalogo:         (u, p) => apiCatalogo(),
  buscar:           (u, p) => apiBuscar(p.q),
  comprar:          (u, p) => apiComprar(u, p),
  perfil:           (u, p) => apiPerfil(u),
  historial:        (u, p) => ({ ok: true, historial: historialUsuario(u.correo, 100) }),
  sugerir:          (u, p) => apiSugerir(u, p),
  bot:              (u, p) => procesarBot(u.correo, p.query),
  cambiarPin:       (u, p) => apiCambiarPin(u, p),

  'admin.resumen':  (u, p) => apiAdminResumen(),
  'inv.lista':      (u, p) => apiInvLista(),
  'inv.entrada':    (u, p) => apiInvEntrada(u, p),
  'inv.ajuste':     (u, p) => apiInvAjuste(u, p),
  'inv.conteo':     (u, p) => apiInvConteo(u, p),
  'inv.movimientos':(u, p) => apiInvMovimientos(p),
  'inv.compras':    (u, p) => apiInvCompras(),
  'cobros.lista':   (u, p) => apiCobrosLista(),
  'cobros.pago':    (u, p) => apiCobrosPago(u, p),
  'cobros.corte':   (u, p) => apiCobrosCorte(u),
  'prod.guardar':   (u, p) => apiProdGuardar(u, p),
  'usr.lista':      (u, p) => apiUsrLista(),
  'usr.guardar':    (u, p) => apiUsrGuardar(u, p),
  'usr.resetPin':   (u, p) => apiUsrResetPin(u, p),
  'reporte.enviar': (u, p) => apiReporteEnviar(u)
};

// Acciones que la tienda de siempre llama solo con el correo del cliente.
const LEGACY_CLIENTE = { catalogo: 1, buscar: 1, perfil: 1, historial: 1, comprar: 1, sugerir: 1, bot: 1 };

function doGet(e)  { return _handleRequest(e, 'GET'); }
function doPost(e) { return _handleRequest(e, 'POST'); }

function _handleRequest(e, method) {
  try {
    const params = Object.assign({}, (e && e.parameter) || {});
    if (method === 'POST' && e && e.postData && e.postData.contents) {
      try { Object.assign(params, JSON.parse(e.postData.contents)); } catch (_) {}
    }
    const action = String(params.action || 'ping');

    if (action === 'ping') {
      return _jsonResponse({ ok: true, version: CONFIG.VERSION, tz: CONFIG.TZ, ahora: _fechaLargaMx() });
    }
    if (action === 'login') {
      return _jsonResponse(apiLogin(params.email, params.pin));
    }

    // El catalogo se puede ver sin entrar (como siempre).
    if (WEB_SOLO_TIENDA && !params.token && (action === 'catalogo' || action === 'buscar')) {
      return _jsonResponse(API_RUTAS[action](null, params));
    }
    let usuario = _usuarioDeToken(params.token);
    // Tienda de siempre: los clientes mandan su correo (sin token) en estas acciones.
    if (!usuario && WEB_SOLO_TIENDA && !params.token && LEGACY_CLIENTE[action]) {
      const c = params.email ? obtenerUsuario(params.email) : null;
      if (c && c.activo) usuario = Object.assign({}, c, { rol: ROLES.CLIENTE });
    }
    if (!usuario) {
      return _jsonResponse({ ok: false, error: 'Tu sesión expiró. Entra de nuevo.', code: 'AUTH' });
    }
    // En modo tienda, desde la web todos cuentan como clientes.
    if (WEB_SOLO_TIENDA && !_esAdminWeb(usuario)) usuario = Object.assign({}, usuario, { rol: ROLES.CLIENTE });
    const ruta = API_RUTAS[action];
    if (!ruta) {
      return _jsonResponse({ ok: false, error: 'Acción no reconocida: ' + action, code: 'UNKNOWN_ACTION' });
    }
    if (!_puede(usuario.rol, action)) {
      _log('FORBIDDEN', usuario.correo, 'Intento sin permiso: ' + action);
      return _jsonResponse({ ok: false, error: 'No tienes permiso para esto.', code: 'FORBIDDEN' });
    }
    return _jsonResponse(ruta(usuario, params));

  } catch (err) {
    _log('API_ERROR', '', err.message, (err.stack || ''));
    return _jsonResponse({ ok: false, error: err.message, code: 'INTERNAL' });
  }
}

function _jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Ejecuta fn con el candado del script. Evita que dos personas muevan stock a la vez.
function _conCandado(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { ok: false, error: 'Sistema ocupado, intenta de nuevo en un momento.', code: 'LOCK_TIMEOUT' };
  }
  try {
    _invalidarCache();
    const r = fn();
    _invalidarCache();
    return r;
  } catch (err) {
    _log('ERROR', '', err.message, (err.stack || ''));
    return { ok: false, error: err.message, code: 'ERROR' };
  } finally {
    lock.releaseLock();
  }
}

// Guarda el resultado de una accion por reqId para que un doble toque no la repita.
function _idempotente(reqId, fn) {
  if (!reqId) return fn();
  const cache = CacheService.getScriptCache();
  const key = 'req:' + String(reqId).substring(0, 60);
  const previo = cache.get(key);
  if (previo) {
    try { return JSON.parse(previo); } catch (_) {}
  }
  const r = fn();
  if (r && r.ok) {
    try { cache.put(key, JSON.stringify(r), 600); } catch (_) {}
  }
  return r;
}

function _entero(v, min, max, nombre) {
  const n = Number(v);
  if (!isFinite(n) || Math.floor(n) !== n) throw new Error(nombre + ' debe ser un número entero.');
  if (n < min || n > max) throw new Error(nombre + ' debe estar entre ' + min + ' y ' + max + '.');
  return n;
}

function _decimal(v, min, max, nombre) {
  const n = Number(v);
  if (!isFinite(n)) throw new Error(nombre + ' no es un número válido.');
  if (n < min || n > max) throw new Error(nombre + ' debe estar entre ' + min + ' y ' + max + '.');
  return _round2(n);
}

function _texto(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().substring(0, max || 200);
}

// Evita que una celda empiece con = + - @ y se ejecute como formula en la hoja.
function _seguroCelda(v) {
  const s = _texto(v, 300);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}


// ---------- Endpoints de clientes ----------

function apiCatalogo() {
  return { ok: true, productos: listarProductos() };
}

function apiBuscar(q) {
  const productos = listarProductos();
  const palabra = _normalizar(q);
  if (!palabra) return { ok: true, productos: productos };
  return {
    ok: true,
    productos: productos.filter(p =>
      _normalizar(p.nombre).includes(palabra) || _normalizar(p.categoria).includes(palabra))
  };
}

function apiPerfil(u) {
  const fresco = obtenerUsuario(u.correo);
  return {
    ok: true,
    usuario: _usuarioPublico(fresco),
    historial: historialUsuario(u.correo, 60),
    pagos: _pagosDe(u.correo, 15)
  };
}

function apiComprar(u, p) {
  const items = p.items;
  if (!items || !Array.isArray(items) || items.length === 0) return { ok: false, error: 'Tu carrito está vacío.' };
  if (items.length > 30) return { ok: false, error: 'Demasiados productos en una sola compra.' };
  return _idempotente(p.reqId, () => registrarCompra(u.correo, items));
}

function apiSugerir(u, p) {
  return guardarSugerencia(u.correo, _texto(p.tipo, 30), _texto(p.mensaje, 500), p.calificacion);
}

function apiReporteEnviar(u) {
  enviarReporteDiario();
  return { ok: true, mensaje: 'Reporte enviado a ' + CONFIG.ADMIN_EMAIL };
}


// ============================================================
// §5  PRODUCTOS (incluye busqueda y alertas)
// ============================================================

function listarProductos() {
  const data = _memoSS(CONFIG.HOJAS.PRODUCTOS);
  if (data.length < 2) return [];
  const productos = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (!r[0]) continue;
    const activo = (r[9] === true || r[9] === 'TRUE' || r[9] === 'true');
    if (!activo) continue;
    productos.push({
      sku:          String(r[0]),
      nombre:       String(r[1]),
      categoria:    String(r[2] || ''),
      costo:        _round2(r[3]),
      precio:       _round2(r[4]),
      stock:        Number(r[5]) || 0,
      stockMinimo:  Number(r[6]) || 0,
      codigoBarras: String(r[7] || ''),
      imagenUrl:    String(r[8] || ''),
      disponible:   (Number(r[5]) || 0) > 0
    });
  }
  return productos;
}

function obtenerProducto(sku) {
  const data = _memoSS(CONFIG.HOJAS.PRODUCTOS);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(sku)) {
      return {
        fila:         i + 1,
        sku:          String(data[i][0]),
        nombre:       String(data[i][1]),
        categoria:    String(data[i][2] || ''),
        costo:        _round2(data[i][3]),
        precio:       _round2(data[i][4]),
        stock:        Number(data[i][5]) || 0,
        stockMinimo:  Number(data[i][6]) || 0,
        codigoBarras: String(data[i][7] || ''),
        imagenUrl:    String(data[i][8] || ''),
        activo:       (data[i][9] === true || data[i][9] === 'TRUE' || data[i][9] === 'true')
      };
    }
  }
  return null;
}

function productosStockBajo() {
  const productos = listarProductos();
  return productos.filter(p => p.stock <= p.stockMinimo);
}

function menuStockBajo() {
  const ui = SpreadsheetApp.getUi();
  const bajos = productosStockBajo();
  if (bajos.length === 0) {
    ui.alert('✅ Todos los productos tienen stock arriba del minimo.');
    return;
  }
  let msg = '🚨 Productos con stock bajo:\n\n';
  bajos.forEach(p => {
    msg += '• ' + p.nombre + ' — ' + p.stock + ' uds (min: ' + p.stockMinimo + ')\n';
  });
  ui.alert(msg);
}


// ============================================================
// §6  USUARIOS (whitelist, deuda, cortes)
// ============================================================

function obtenerUsuario(correo) {
  const data = _memoSS(CONFIG.HOJAS.USUARIOS);
  const c = String(correo).toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === c) {
      return {
        fila:           i + 1,
        correo:         String(data[i][0]),
        nombre:         String(data[i][1]),
        deudaAcumulada: _round2(data[i][2]),
        limiteCredito:  _round2(data[i][3]),
        ultimoCorte:    data[i][4],
        activo:         (data[i][5] === true || data[i][5] === 'TRUE' || data[i][5] === 'true'),
        fechaAlta:      data[i][6],
        rol:            _normRol(data[i][7]),
        pinHash:        String(data[i][8] || ''),
        debeCambiarPin: (data[i][9] === true || data[i][9] === 'TRUE' || data[i][9] === 'true')
      };
    }
  }
  return null;
}

function listarUsuarios() {
  const data = _memoSS(CONFIG.HOJAS.USUARIOS);
  const usuarios = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    usuarios.push({
      correo: String(data[i][0]),
      nombre: String(data[i][1]),
      deuda:  _round2(data[i][2]),
      limite: _round2(data[i][3]),
      activo: (data[i][5] === true || data[i][5] === 'TRUE' || data[i][5] === 'true'),
      rol:    _normRol(data[i][7])
    });
  }
  return usuarios;
}

function actualizarDeuda(correo, monto) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s  = ss.getSheetByName(CONFIG.HOJAS.USUARIOS);
  const data = s.getDataRange().getValues();
  const c = String(correo).toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === c) {
      const deudaActual = Number(data[i][2]) || 0;
      const nueva = _round2(deudaActual + monto);
      s.getRange(i + 1, 3).setValue(nueva);
      return nueva;
    }
  }
  return null;
}

function agregarUsuario(correo, nombre, limite) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s  = ss.getSheetByName(CONFIG.HOJAS.USUARIOS);
  if (obtenerUsuario(correo)) return { ok: false, error: 'Usuario ya existe' };
  s.appendRow([
    String(correo).toLowerCase().trim(),
    nombre || '',
    0,
    Number(limite) || CONFIG.LIMITE_CREDITO_DEFAULT,
    new Date(),
    true,
    new Date(),
    'cliente',
    '',
    true
  ]);
  _log('USER_ADD', CONFIG.ADMIN_EMAIL, 'Usuario agregado: ' + correo);
  _invalidarCache();
  return { ok: true, pinTemporal: _asignarPinTemporal(correo) };
}

function _marcarVentasConCorte(correo, idCorte) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s  = ss.getSheetByName(CONFIG.HOJAS.VENTAS);
  const data = s.getDataRange().getValues();
  const c = String(correo).toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]).toLowerCase().trim() === c && !data[i][8]) {
      s.getRange(i + 1, 9).setValue(idCorte);
    }
  }
}

function menuAgregarUsuario() {
  const ui = SpreadsheetApp.getUi();
  const r1 = ui.prompt('Agregar usuario (1/3)', 'Correo (Gmail):', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  const correo = r1.getResponseText().trim();
  if (!correo) { ui.alert('❌ Correo vacío'); return; }

  const r2 = ui.prompt('Agregar usuario (2/3)', 'Nombre:', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const nombre = r2.getResponseText().trim();

  const r3 = ui.prompt('Agregar usuario (3/3)',
    'Limite de credito en MXN (default ' + CONFIG.LIMITE_CREDITO_DEFAULT + '):',
    ui.ButtonSet.OK_CANCEL);
  if (r3.getSelectedButton() !== ui.Button.OK) return;
  const limite = parseFloat(r3.getResponseText()) || CONFIG.LIMITE_CREDITO_DEFAULT;

  const res = agregarUsuario(correo, nombre, limite);
  ui.alert(res.ok
    ? '✅ Usuario agregado:\n' + correo + '\nLimite: ' + _money(limite) + '\n\nPIN temporal: ' + res.pinTemporal + '\n(Dáselo en persona; lo cambia al entrar.)'
    : '❌ ' + res.error);
}

function menuDesactivarUsuario() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Desactivar usuario', 'Correo a desactivar:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const correo = r.getResponseText().trim().toLowerCase();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s  = ss.getSheetByName(CONFIG.HOJAS.USUARIOS);
  const data = s.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === correo) {
      s.getRange(i + 1, 6).setValue(false);
      ui.alert('✅ ' + correo + ' desactivado');
      _invalidarCache();
      return;
    }
  }
  ui.alert('❌ No se encontro: ' + correo);
}

function menuLiquidarDeuda() {
  const ui = SpreadsheetApp.getUi();
  const r1 = ui.prompt('Liquidar deuda (1/2)', 'Correo del usuario:', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  const correo = r1.getResponseText().trim();
  const u = obtenerUsuario(correo);
  if (!u) { ui.alert('❌ Usuario no encontrado'); return; }

  const conf = ui.alert(
    'Liquidar deuda',
    u.nombre + '\nDeuda actual: ' + _money(u.deudaAcumulada) + '\n\n¿Confirmas que pagó completo?',
    ui.ButtonSet.YES_NO
  );
  if (conf !== ui.Button.YES) return;

  const r2 = ui.prompt('Liquidar deuda (2/2)', 'Metodo (efectivo / transferencia / otro):', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const metodo = r2.getResponseText().trim() || 'efectivo';

  const res = liquidarDeuda(correo, metodo, '');
  ui.alert(res.ok
    ? '✅ Liquidado ' + _money(res.deudaLiquidada)
    : '❌ ' + res.error);
}

function menuGenerarCorte() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert(
    'Generar corte quincenal',
    'Esto crea un corte con todos los usuarios que tengan deuda > 0.\n\n' +
    'Las ventas pendientes se asocian al corte (para auditoría).\n' +
    'La deuda del usuario NO se borra automáticamente: cada pago se procesa con\n' +
    '"💸 Liquidar deuda de usuario" cuando confirmes el cobro.\n\n' +
    '¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  if (r !== ui.Button.YES) return;
  const res = generarCorte();
  ui.alert('✅ Corte generado.\n\nUsuarios con deuda: ' + res.usuarios +
           '\nTotal del corte: ' + _money(res.total));
}


// ============================================================
// §7  VENTAS (registrarCompra con LockService + alerta post-compra)
// ============================================================

function registrarCompra(correo, items) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { ok: false, error: 'Sistema ocupado, intenta de nuevo en un momento.', code: 'LOCK_TIMEOUT' };
  }

  try {
    _invalidarCache();

    const usuario = obtenerUsuario(correo);
    if (!usuario)        return { ok: false, error: 'Usuario no autorizado', code: 'NOT_WHITELISTED' };
    if (!usuario.activo) return { ok: false, error: 'Cuenta desactivada', code: 'INACTIVE' };

    const resumen = [];
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const sku = it.sku || it.SKU;
      const cantidad = Math.max(1, parseInt(it.cantidad || it.qty || 1, 10));
      const prod = obtenerProducto(sku);
      if (!prod)                  return { ok: false, error: 'Producto no existe: ' + sku, code: 'NO_SKU' };
      if (!prod.activo)           return { ok: false, error: 'Producto no disponible: ' + prod.nombre, code: 'INACTIVE_PRODUCT' };
      if (prod.stock < cantidad)  return { ok: false, error: 'Stock insuficiente de ' + prod.nombre + ' (quedan ' + prod.stock + ')', code: 'OUT_OF_STOCK' };
      const monto = _round2(prod.precio * cantidad);
      resumen.push({ sku: prod.sku, nombre: prod.nombre, precio: prod.precio, cantidad: cantidad, monto: monto });
      total += monto;
    }
    total = _round2(total);

    const nuevaDeuda = _round2(usuario.deudaAcumulada + total);
    if (nuevaDeuda > usuario.limiteCredito) {
      return {
        ok: false,
        code: 'OVER_LIMIT',
        error: 'Esta compra excede tu limite de credito (' + _money(usuario.limiteCredito) + ').\n' +
               'Deuda actual: ' + _money(usuario.deudaAcumulada) + '\n' +
               'Esta compra: ' + _money(total) + '\n\n' +
               'Liquida tu cuenta para poder seguir comprando.'
      };
    }

    // Registrar ventas + decrementar stock + detectar agotamientos
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const sVentas = ss.getSheetByName(CONFIG.HOJAS.VENTAS);
    const ts      = new Date();
    const stamp   = ts.getTime();
    const filas   = [];
    const cambiosStock = [];
    for (let i = 0; i < resumen.length; i++) {
      const r = resumen[i];
      const idVenta = 'V' + stamp + '-' + i;
      filas.push([idVenta, ts, correo, r.sku, r.nombre, r.cantidad, r.precio, r.monto, '', 'Pendiente']);
      const change = _moverStock(r.sku, -r.cantidad, 'VENTA', { usuario: correo, notas: idVenta });
      if (change) cambiosStock.push(change);
    }
    sVentas.getRange(sVentas.getLastRow() + 1, 1, filas.length, filas[0].length).setValues(filas);

    actualizarDeuda(correo, total);

    _log('COMPRA', correo, 'Compra registrada por ' + _money(total), JSON.stringify(resumen));
    _invalidarCache();

    // Aviso inmediato al admin si algun producto cruzo el umbral durante esta compra
    try {
      const cruzaron = cambiosStock.filter(c => c.antes > c.minimo && c.despues <= c.minimo);
      const agotados = cambiosStock.filter(c => c.despues === 0 && c.antes > 0);
      if (cruzaron.length > 0 || agotados.length > 0) {
        _avisarAdminAgotamiento(cruzaron, agotados);
      }
    } catch (e) {
      _log('STOCK_ALERT_ERROR', '', e.message);
    }

    return {
      ok: true,
      total:      total,
      items:      resumen,
      deudaNueva: nuevaDeuda,
      limite:     usuario.limiteCredito,
      mensaje:    'Compra registrada. Tu deuda quedó en ' + _money(nuevaDeuda) + '.'
    };

  } finally {
    lock.releaseLock();
  }
}

function _avisarAdminAgotamiento(cruzaron, agotados) {
  if (cruzaron.length === 0 && agotados.length === 0) return;
  let html = '<div style="font-family:system-ui,sans-serif;color:#1A1A1A">';
  html += '<h2 style="color:#E62027;margin:0 0 8px">🚨 Alerta de stock</h2>';
  html += '<div style="color:#6B7280;margin-bottom:20px">' + _fechaLargaMx() + ' CDMX</div>';

  if (agotados.length > 0) {
    html += '<h3 style="color:#E62027">Se agotaron:</h3><ul>';
    agotados.forEach(c => {
      html += '<li><strong>' + c.nombre + '</strong> — quedó en 0</li>';
    });
    html += '</ul>';
  }

  if (cruzaron.length > 0) {
    html += '<h3 style="color:#B45309">Cruzaron el minimo:</h3><ul>';
    cruzaron.forEach(c => {
      html += '<li><strong>' + c.nombre + '</strong> — ' + c.despues + ' uds (minimo ' + c.minimo + ')</li>';
    });
    html += '</ul>';
  }

  html += '<hr style="border:none;border-top:1px solid #E2E8F0;margin:20px 0">';
  html += '<p style="color:#94A3B8;font-size:11px">Aviso automatico de Tiendita v' + CONFIG.VERSION + '</p>';
  html += '</div>';

  MailApp.sendEmail({
    to:       CONFIG.ADMIN_EMAIL,
    subject:  '🚨 Tiendita — Reabasto necesario',
    htmlBody: html
  });
}

function historialUsuario(correo, limite) {
  const data = _memoSS(CONFIG.HOJAS.VENTAS);
  const ventas = [];
  const lim = limite || 50;
  const c = String(correo).toLowerCase().trim();
  for (let i = data.length - 1; i >= 1 && ventas.length < lim; i--) {
    if (String(data[i][2]).toLowerCase().trim() === c) {
      ventas.push({
        id:        String(data[i][0]),
        timestamp: data[i][1] instanceof Date ? data[i][1].toISOString() : String(data[i][1]),
        fechaMx:   data[i][1] instanceof Date ? _fechaLargaMx(data[i][1]) : '',
        sku:       String(data[i][3]),
        producto:  String(data[i][4]),
        cantidad:  Number(data[i][5]) || 0,
        precio:    _round2(data[i][6]),
        monto:     _round2(data[i][7]),
        idCorte:   String(data[i][8] || ''),
        estatus:   String(data[i][9] || '')
      });
    }
  }
  return ventas;
}


// ============================================================
// §8  REPORTES, ALERTAS, BOT, SUGERENCIAS, DASHBOARD
// ============================================================

function enviarReporteDiario() {
  const hoy = new Date();
  const hoyIso = _fechaIsoMx(hoy);

  const data = _memoSS(CONFIG.HOJAS.VENTAS);
  const ventasHoy = [];
  let montoTotal = 0;
  let unidades   = 0;

  for (let i = 1; i < data.length; i++) {
    const ts = data[i][1];
    if (!(ts instanceof Date)) continue;
    if (_fechaIsoMx(ts) === hoyIso) {
      ventasHoy.push({
        correo:   String(data[i][2]),
        producto: String(data[i][4]),
        cantidad: Number(data[i][5]) || 0,
        monto:    Number(data[i][7]) || 0
      });
      montoTotal += Number(data[i][7]) || 0;
      unidades   += Number(data[i][5]) || 0;
    }
  }

  const porProducto = {};
  const porUsuario  = {};
  ventasHoy.forEach(v => {
    if (!porProducto[v.producto]) porProducto[v.producto] = { unidades: 0, monto: 0 };
    porProducto[v.producto].unidades += v.cantidad;
    porProducto[v.producto].monto    += v.monto;

    if (!porUsuario[v.correo]) porUsuario[v.correo] = { unidades: 0, monto: 0 };
    porUsuario[v.correo].unidades += v.cantidad;
    porUsuario[v.correo].monto    += v.monto;
  });

  const bajos = productosStockBajo();
  const usuarios = listarUsuarios();
  const deudaTotal = usuarios.reduce((s, u) => s + (u.deuda || 0), 0);

  const fecha = _fechaCortaMx(hoy);

  let html = '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;color:#1A1A1A">';
  html += '<h2 style="margin:0 0 4px;color:#E62027">🏪 Tiendita</h2>';
  html += '<div style="color:#6B7280;font-size:14px;margin-bottom:16px">Reporte del ' + fecha + ' (CDMX)</div>';

  html += '<div style="display:flex;gap:8px;margin:16px 0">';
  html += _tarjeta('Ventas hoy',  _money(montoTotal),       '#FFF1F4', '#6B0F2A');
  html += _tarjeta('Unidades',    String(unidades),         '#FFF1F4', '#6B0F2A');
  html += _tarjeta('Deuda total', _money(deudaTotal),       '#FEF3C7', '#92400E');
  html += '</div>';

  if (Object.keys(porProducto).length > 0) {
    html += '<h3 style="margin:20px 0 8px">Por producto</h3>';
    html += _tabla(['Producto','Uds','Monto'],
      Object.keys(porProducto).map(p => [p, String(porProducto[p].unidades), _money(porProducto[p].monto)]));
  } else {
    html += '<p style="color:#6B7280"><em>Sin ventas hoy.</em></p>';
  }

  if (Object.keys(porUsuario).length > 0) {
    html += '<h3 style="margin:20px 0 8px">Por usuario</h3>';
    html += _tabla(['Usuario','Uds','Monto'],
      Object.keys(porUsuario).map(u => [u, String(porUsuario[u].unidades), _money(porUsuario[u].monto)]));
  }

  if (bajos.length > 0) {
    html += '<h3 style="margin:20px 0 8px;color:#DC2626">🚨 Reabasto necesario</h3><ul style="padding-left:20px">';
    bajos.forEach(p => {
      html += '<li>' + p.nombre + ' — <strong>' + p.stock + ' uds</strong> (min: ' + p.stockMinimo + ')</li>';
    });
    html += '</ul>';
  }

  html += '<hr style="border:none;border-top:1px solid #E2E8F0;margin:20px 0">';
  html += '<p style="color:#94A3B8;font-size:11px">Tiendita v' + CONFIG.VERSION + ' · ' + _fechaLargaMx() + ' CDMX</p>';
  html += '</div>';

  MailApp.sendEmail({
    to:       CONFIG.ADMIN_EMAIL,
    subject:  '🏪 Tiendita ' + fecha + ' — ' + _money(montoTotal) + ' (' + unidades + ' uds)',
    htmlBody: html
  });

  _log('REPORTE_DIARIO', CONFIG.ADMIN_EMAIL, 'Reporte enviado',
       JSON.stringify({ monto: montoTotal, unidades: unidades }));
}

function enviarAlertaStockBajo() {
  const bajos = productosStockBajo();
  if (bajos.length === 0) {
    _log('ALERTA_STOCK', CONFIG.ADMIN_EMAIL, 'Sin productos criticos, no se envia mail');
    return;
  }
  const agotados = bajos.filter(p => p.stock === 0);
  const criticos = bajos.filter(p => p.stock > 0);

  let html = '<div style="font-family:system-ui,sans-serif;max-width:640px;color:#1A1A1A">';
  html += '<h2 style="color:#E62027;margin:0 0 4px">📦 Hora de reabastecer</h2>';
  html += '<div style="color:#6B7280;font-size:14px;margin-bottom:16px">' + _fechaCortaMx() + '</div>';

  if (agotados.length > 0) {
    html += '<h3 style="color:#E62027;margin:20px 0 8px">😔 Agotados (' + agotados.length + ')</h3>';
    html += _tabla(['Producto','Costo c/u','Total a comprar (sugerido)'],
      agotados.map(p => [p.nombre, _money(p.costo), _money(p.costo * (p.stockMinimo * 4))]));
  }

  if (criticos.length > 0) {
    html += '<h3 style="color:#B45309;margin:20px 0 8px">⚠️ En riesgo (' + criticos.length + ')</h3>';
    html += _tabla(['Producto','Quedan','Minimo','Costo c/u'],
      criticos.map(p => [p.nombre, String(p.stock), String(p.stockMinimo), _money(p.costo)]));
  }

  html += '<hr style="border:none;border-top:1px solid #E2E8F0;margin:20px 0">';
  html += '<p style="color:#94A3B8;font-size:11px">Aviso automatico de Tiendita v' + CONFIG.VERSION + '</p>';
  html += '</div>';

  MailApp.sendEmail({
    to:       CONFIG.ADMIN_EMAIL,
    subject:  '📦 Tiendita — Reabasto sugerido (' + bajos.length + ' productos)',
    htmlBody: html
  });

  _log('ALERTA_STOCK', CONFIG.ADMIN_EMAIL, 'Mail de reabasto enviado', JSON.stringify({ agotados: agotados.length, criticos: criticos.length }));
}

function _tarjeta(titulo, valor, bg, fg) {
  return '<div style="flex:1;background:' + bg + ';padding:12px;border-radius:8px">' +
           '<div style="font-size:11px;color:' + fg + ';opacity:0.7;text-transform:uppercase;letter-spacing:0.5px">' + titulo + '</div>' +
           '<div style="font-size:22px;font-weight:700;color:' + fg + ';margin-top:4px">' + valor + '</div>' +
         '</div>';
}

function _tabla(headers, filas) {
  let h = '<table style="width:100%;border-collapse:collapse;font-size:13px">';
  h += '<tr style="background:#1A1A1A;color:white">';
  headers.forEach((c, i) => {
    h += '<th style="padding:8px;text-align:' + (i === 0 ? 'left' : 'right') + '">' + c + '</th>';
  });
  h += '</tr>';
  filas.forEach((fila, i) => {
    h += '<tr style="background:' + (i % 2 ? '#FFF1F4' : 'white') + '">';
    fila.forEach((celda, j) => {
      h += '<td style="padding:6px 8px;text-align:' + (j === 0 ? 'left' : 'right') + '">' + celda + '</td>';
    });
    h += '</tr>';
  });
  return h + '</table>';
}

function instalarTriggersAuto() {
  quitarTriggers();
  // Reporte diario a las 20:00 CDMX
  ScriptApp.newTrigger('enviarReporteDiario')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.HORA_REPORTE_DIARIO)
    .inTimezone(CONFIG.TZ)
    .create();
  // Alerta de stock a las 8:00 CDMX
  ScriptApp.newTrigger('enviarAlertaStockBajo')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.HORA_ALERTA_STOCK)
    .inTimezone(CONFIG.TZ)
    .create();
  SpreadsheetApp.getUi().alert(
    '✅ Triggers automaticos instalados:\n\n' +
    '• Alerta de stock — diaria a las ' + CONFIG.HORA_ALERTA_STOCK + ':00 CDMX\n' +
    '• Reporte de ventas — diario a las ' + CONFIG.HORA_REPORTE_DIARIO + ':00 CDMX\n\n' +
    'Adicional: cada vez que una compra deje algo en cero o por debajo del minimo, te llega un mail inmediato.'
  );
}

function quitarTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
}

/**
 * ============================================================
 * BOT — Reconocimiento de intenciones con tolerancia a typos
 * ============================================================
 *
 * Pipeline:
 *  1. _normalizar(query)  → quita acentos, signos de puntuacion (¿?¡!), colapsa espacios.
 *  2. Se evaluan las intenciones en orden de especificidad (deuda → limite → stock → precio → ayuda).
 *  3. _contieneKeyword() divide la query en palabras y compara cada palabra contra los keywords
 *     usando Damerau-Levenshtein con umbral por longitud — tolera typos y transposiciones.
 *  4. Para extraer el producto, _quitarKeywords() remueve las palabras-funcion (tambien con typo)
 *     y deja solo lo "limpio" para buscar en el catalogo.
 *
 * Articulos y palabras vacias se incluyen en KW_PRECIO/KW_STOCK para que tambien se eliminen
 * al extraer el producto ("la coca", "el maruchan" → "coca", "maruchan").
 */

// Keywords por intencion. El orden de evaluacion importa: las mas especificas primero.
const _BOT_KW_DEUDA  = ['debo', 'deuda', 'cuenta', 'saldo', 'adeudo', 'adeudar', 'deber'];
const _BOT_KW_LIMITE = ['limite', 'puedo', 'disponible', 'alcanza', 'resta', 'queda'];
const _BOT_KW_STOCK  = ['hay', 'stock', 'tienes', 'tiene', 'quedan', 'sirven', 'venden', 'inventario'];
const _BOT_KW_PRECIO = ['precio', 'cuesta', 'vale', 'cuanto', 'cuanta', 'cuantos', 'cuantas'];
const _BOT_KW_AYUDA  = ['ayuda', 'help', 'puedes', 'comandos', 'opciones', 'ayudame', 'auxilio'];

// Palabras "vacias" que se quitan al extraer el producto de la pregunta.
const _BOT_KW_VACIO  = ['de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas',
                        'me', 'te', 'se', 'mi', 'tu', 'aun', 'todavia', 'aqui', 'alli',
                        'por', 'para', 'que', 'cual', 'cuales', 'algun', 'alguna', 'algo'];

function procesarBot(correo, query) {
  const q = _normalizar(query);
  if (!q) return { ok: true, respuesta: 'Pregúntame "¿cuánto debo?" o "¿hay coca?".' };

  // INTENCION 1: deuda
  if (_contieneKeyword(q, _BOT_KW_DEUDA)) {
    if (!correo) return { ok: true, respuesta: 'Inicia sesión para ver tu deuda.' };
    const u = obtenerUsuario(correo);
    if (!u) return { ok: true, respuesta: 'No te encuentro en el sistema.' };
    if (u.deudaAcumulada === 0) return { ok: true, respuesta: 'Tu cuenta está en ceros. ✨' };
    return { ok: true, respuesta: 'Tu deuda actual es de ' + _money(u.deudaAcumulada) + ' MXN. Límite: ' + _money(u.limiteCredito) + '.' };
  }

  // INTENCION 2: limite / saldo disponible
  if (_contieneKeyword(q, _BOT_KW_LIMITE)) {
    if (!correo) return { ok: true, respuesta: 'Inicia sesión primero.' };
    const u = obtenerUsuario(correo);
    if (!u) return { ok: true, respuesta: 'No te encuentro en el sistema.' };
    const disp = Math.max(0, _round2(u.limiteCredito - u.deudaAcumulada));
    return { ok: true, respuesta: 'Tienes ' + _money(disp) + ' MXN disponibles antes de tu límite.' };
  }

  // INTENCION 3: stock de un producto
  if (_contieneKeyword(q, _BOT_KW_STOCK)) {
    const palabra = _quitarKeywords(q, _BOT_KW_STOCK.concat(_BOT_KW_VACIO));
    if (palabra.length < 2) return { ok: true, respuesta: '¿De qué producto preguntas?' };
    return _buscarYResponder(palabra, 'stock');
  }

  // INTENCION 4: precio de un producto
  if (_contieneKeyword(q, _BOT_KW_PRECIO)) {
    const palabra = _quitarKeywords(q, _BOT_KW_PRECIO.concat(_BOT_KW_VACIO));
    if (palabra.length < 2) return { ok: true, respuesta: '¿De qué producto preguntas el precio?' };
    return _buscarYResponder(palabra, 'precio');
  }

  // INTENCION 5: ayuda
  if (_contieneKeyword(q, _BOT_KW_AYUDA)) {
    return { ok: true, respuesta:
      'Puedo responderte:\n' +
      '• "¿cuánto debo?" — tu deuda actual\n' +
      '• "¿cuánto me alcanza?" — saldo disponible\n' +
      '• "¿hay coca?" — stock de un producto\n' +
      '• "¿cuánto cuesta la sopa?" — precio'
    };
  }

  return { ok: true, respuesta: 'No entendí. Escribe "ayuda" para ver lo que puedo responder.' };
}

/**
 * Busca productos por nombre con tolerancia a typos.
 *  1. Substring directo (rapido, atrapa la mayoria).
 *  2. Si no hay match, intenta palabra-por-palabra con _palabraSimilar (Damerau-Levenshtein).
 */
function _buscarYResponder(palabra, modo) {
  const productos = listarProductos();
  const palabraNorm = _normalizar(palabra);
  if (!palabraNorm) {
    return { ok: true, respuesta: '¿De qué producto preguntas?' };
  }

  // Capa 1: substring exacto (incluye categoria)
  let match = productos.filter(p =>
    _normalizar(p.nombre).includes(palabraNorm) ||
    _normalizar(p.categoria).includes(palabraNorm)
  );

  // Capa 2: fuzzy palabra-por-palabra si no hubo match
  if (match.length === 0) {
    const tokensQ = palabraNorm.split(' ').filter(t => t.length > 0);
    match = productos.filter(p => {
      const tokensProducto = (_normalizar(p.nombre) + ' ' + _normalizar(p.categoria))
        .split(' ').filter(t => t.length > 0);
      for (let i = 0; i < tokensQ.length; i++) {
        for (let j = 0; j < tokensProducto.length; j++) {
          if (_palabraSimilar(tokensQ[i], tokensProducto[j])) return true;
        }
      }
      return false;
    });
  }

  if (match.length === 0) {
    return { ok: true, respuesta: 'No encontré "' + palabra + '" en el catálogo.' };
  }

  if (match.length === 1) {
    const p = match[0];
    if (modo === 'stock') {
      if (p.stock === 0) return { ok: true, respuesta: 'Se acabó el ' + p.nombre + '. Pronto llega más 💕' };
      return { ok: true, respuesta: 'Quedan ' + p.stock + ' uds de ' + p.nombre + ' a ' + _money(p.precio) + '.' };
    }
    return { ok: true, respuesta: p.nombre + ' cuesta ' + _money(p.precio) + '.' };
  }

  let resp = 'Encontré varios:\n';
  match.slice(0, 5).forEach(p => {
    if (modo === 'stock') {
      resp += '• ' + p.nombre + ' — ' + (p.stock > 0 ? p.stock + ' uds a ' + _money(p.precio) : 'agotado') + '\n';
    } else {
      resp += '• ' + p.nombre + ' — ' + _money(p.precio) + '\n';
    }
  });
  return { ok: true, respuesta: resp };
}

function guardarSugerencia(correo, tipo, mensaje, calificacion) {
  if (!mensaje || String(mensaje).trim().length < 3) {
    return { ok: false, error: 'El mensaje es muy corto', code: 'SHORT' };
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s  = ss.getSheetByName(CONFIG.HOJAS.SUGERENCIAS);
  s.appendRow([
    new Date(),
    String(correo || 'anonimo').toLowerCase(),
    String(tipo || 'sugerencia'),
    String(mensaje).trim(),
    Number(calificacion) || '',
    'Nueva'
  ]);
  _log('SUGERENCIA', correo, String(tipo) + ': ' + String(mensaje).substring(0, 100));
  return { ok: true, mensaje: '¡Gracias! Tu mensaje fue registrado.' };
}

function menuDashboard() {
  const usuarios  = listarUsuarios();
  const productos = listarProductos();
  const deudaTotal = usuarios.reduce((s, u) => s + (u.deuda || 0), 0);
  const valorInv   = productos.reduce((s, p) => s + (p.costo  * p.stock), 0);
  const valorVta   = productos.reduce((s, p) => s + (p.precio * p.stock), 0);

  const data = _memoSS(CONFIG.HOJAS.VENTAS);
  let ingresosTot = 0;
  let unidadesTot = 0;
  for (let i = 1; i < data.length; i++) {
    ingresosTot += Number(data[i][7]) || 0;
    unidadesTot += Number(data[i][5]) || 0;
  }
  const margen = valorVta - valorInv;
  const margenPct = valorInv > 0 ? ((margen / valorInv) * 100).toFixed(1) : '0';

  SpreadsheetApp.getUi().alert(
    '📊 DASHBOARD TIENDITA  · ' + _fechaLargaMx() + '\n\n' +
    '👥 Usuarios activos: ' + usuarios.filter(u => u.activo).length + ' / ' + usuarios.length + '\n' +
    '📦 Productos activos: ' + productos.length + '\n\n' +
    '💰 Ingresos historicos: ' + _money(ingresosTot) + '\n' +
    '📦 Unidades vendidas: '   + unidadesTot + '\n' +
    '⏳ Deuda por cobrar: '   + _money(deudaTotal) + '\n\n' +
    '🏷️ Inventario (a costo): '  + _money(valorInv) + '\n' +
    '💵 Inventario (a venta): '  + _money(valorVta) + '\n' +
    '📈 Margen potencial: '     + _money(margen) + ' (' + margenPct + '%)'
  );
}


// ============================================================
// §9  SEGURIDAD: PIN, sesiones firmadas, roles
// ============================================================
//  • El PIN se guarda con sal + SHA-256 (nunca en texto) en Usuarios!I.
//  • La sesion es un token firmado (HMAC) con vencimiento. No se guarda nada
//    en la hoja. Si cambia el PIN o se desactiva la cuenta, el token deja de servir.
//  • 5 intentos fallidos = 15 minutos de bloqueo por correo.

const SEG = {
  COL_PIN: 9,          // columna I de Usuarios (1-indexed)
  COL_DEBE_CAMBIAR: 10,// columna J
  MAX_INTENTOS: 5,
  BLOQUEO_SEG: 900,
  DIAS_CLIENTE: 30,
  DIAS_STAFF: 7
};

function _secreto() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('TIENDITA_SECRETO');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('TIENDITA_SECRETO', s);
  }
  return s;
}

function _hex(bytes) {
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function _hashPin(pin, sal) {
  return _hex(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, sal + ':' + pin + ':' + _secreto()));
}

function _crearPinGuardado(pin) {
  const sal = Utilities.getUuid().replace(/-/g, '').substring(0, 16);
  return sal + '$' + _hashPin(pin, sal);
}

function _compararSeguro(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function _pinCorrecto(usuario, pin) {
  const guardado = String(usuario.pinHash || '');
  const i = guardado.indexOf('$');
  if (i < 1) return false;
  return _compararSeguro(_hashPin(String(pin), guardado.substring(0, i)), guardado.substring(i + 1));
}

function _pinValido(pin) {
  return /^\d{4,8}$/.test(String(pin || ''));
}

function _pinAleatorio() {
  const hex = Utilities.getUuid().replace(/-/g, '');
  const n = parseInt(hex.substring(0, 10), 16) % 900000;
  return String(100000 + n);
}

function _normRol(r) {
  const x = String(r || '').toLowerCase().trim();
  if (x === 'admin' || x === 'administrador') return ROLES.ADMIN;
  if (x === 'operador') return ROLES.OPERADOR;
  return ROLES.CLIENTE;
}

function _usuarioPublico(u) {
  if (!u) return null;
  return {
    correo: u.correo,
    nombre: u.nombre,
    rol: u.rol,
    deuda: u.deudaAcumulada,
    limite: u.limiteCredito,
    disponible: _round2(Math.max(0, u.limiteCredito - u.deudaAcumulada)),
    // nombres de la tienda de siempre (la interfaz de los clientes los usa)
    deudaAcumulada: u.deudaAcumulada,
    limiteCredito: u.limiteCredito
  };
}

// ---------- tokens ----------

function _firmar(texto) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(texto, _secreto()));
}

function _crearToken(u) {
  const dias = u.rol === ROLES.CLIENTE ? SEG.DIAS_CLIENTE : SEG.DIAS_STAFF;
  const payload = Utilities.base64EncodeWebSafe(JSON.stringify({
    c: u.correo.toLowerCase(),
    e: Date.now() + dias * 86400000,
    p: String(u.pinHash || '').slice(-8)
  }));
  return payload + '.' + _firmar(payload);
}

function _usuarioDeToken(token) {
  try {
    if (!token) return null;
    const partes = String(token).split('.');
    if (partes.length !== 2) return null;
    if (!_compararSeguro(_firmar(partes[0]), partes[1])) return null;
    const datos = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString());
    if (!datos || !datos.c || Date.now() > Number(datos.e)) return null;
    const u = obtenerUsuario(datos.c);
    if (!u || !u.activo) return null;
    if (String(u.pinHash || '').slice(-8) !== String(datos.p)) return null;
    return u;
  } catch (e) {
    return null;
  }
}

// ---------- login y PIN ----------

function _fallos(correo) {
  return Number(CacheService.getScriptCache().get('fail:' + correo)) || 0;
}

function _sumarFallo(correo) {
  CacheService.getScriptCache().put('fail:' + correo, String(_fallos(correo) + 1), SEG.BLOQUEO_SEG);
}

function apiLogin(email, pin) {
  const correo = _texto(email, 120).toLowerCase();
  if (!correo) return { ok: false, error: 'Escribe tu correo.', code: 'MISSING' };
  if (_fallos(correo) >= SEG.MAX_INTENTOS) {
    return { ok: false, error: 'Demasiados intentos. Espera 15 minutos o pide un PIN nuevo al admin.', code: 'LOCKED' };
  }
  const u = obtenerUsuario(correo);
  // Modo tienda: todos entran solo con su correo, y desde la web cuentan como clientes.
  if (WEB_SOLO_TIENDA && correo === ADMIN_WEB) {
    if (!pin) return { ok: false, error: 'Escribe la contraseña.', code: 'NEEDS_PIN' };
    if (!u || !u.activo || u.rol !== ROLES.ADMIN || !u.pinHash || !_pinCorrecto(u, pin)) {
      _sumarFallo(correo);
      _log('LOGIN_FALLO', correo, 'Intento fallido (admin web)');
      return { ok: false, error: 'Correo o contraseña incorrectos.', code: 'BAD_LOGIN' };
    }
    CacheService.getScriptCache().remove('fail:' + correo);
    _log('LOGIN', correo, 'Inicio de sesion (admin web)');
    return { ok: true, token: _crearToken(u), usuario: _usuarioPublico(u), permisos: _permisosDe(u.rol), debeCambiarPin: false };
  }
  if (WEB_SOLO_TIENDA) {
    if (!u || !u.activo) {
      return { ok: false, error: 'Ese correo no está registrado o está desactivado. Pídele a Samantha que te dé de alta.', code: 'BAD_LOGIN' };
    }
    const comoCliente = Object.assign({}, u, { rol: ROLES.CLIENTE });
    _log('LOGIN', correo, 'Inicio de sesion (web, solo correo)');
    return { ok: true, token: _crearToken(u), usuario: _usuarioPublico(comoCliente), permisos: _permisosDe(ROLES.CLIENTE), debeCambiarPin: false };
  }
  // Clientes: entran solo con su correo (sin PIN).
  if (u && u.activo && u.rol === ROLES.CLIENTE) {
    _log('LOGIN', correo, 'Inicio de sesion (cliente)');
    return { ok: true, token: _crearToken(u), usuario: _usuarioPublico(u), permisos: _permisosDe(u.rol), debeCambiarPin: false };
  }
  // Admin y operador (y correos que no existen, para no revelar quien es quien): piden PIN.
  if (!pin) return { ok: false, error: 'Escribe tu PIN.', code: 'NEEDS_PIN' };
  const generico = 'Correo o PIN incorrectos. Si es tu primera vez, pide tu PIN al admin.';
  if (!u || !u.activo || !u.pinHash || !_pinCorrecto(u, pin)) {
    _sumarFallo(correo);
    _log('LOGIN_FALLO', correo, 'Intento fallido');
    return { ok: false, error: generico, code: 'BAD_LOGIN' };
  }
  CacheService.getScriptCache().remove('fail:' + correo);
  _log('LOGIN', correo, 'Inicio de sesion');
  return {
    ok: true,
    token: _crearToken(u),
    usuario: _usuarioPublico(u),
    permisos: _permisosDe(u.rol),
    debeCambiarPin: u.debeCambiarPin
  };
}

function apiCambiarPin(u, p) {
  const actual = String(p.actual || '');
  const nuevo = String(p.nuevo || '');
  if (!_pinValido(nuevo)) return { ok: false, error: 'El PIN nuevo debe tener entre 4 y 8 números.' };
  if (nuevo === actual) return { ok: false, error: 'El PIN nuevo debe ser distinto al actual.' };
  if (/^(\d)\1+$/.test(nuevo) || '0123456789'.indexOf(nuevo) >= 0 || '9876543210'.indexOf(nuevo) >= 0) {
    return { ok: false, error: 'Ese PIN es muy fácil de adivinar. Elige otro.' };
  }
  return _conCandado(() => {
    const fresco = obtenerUsuario(u.correo);
    if (!_pinCorrecto(fresco, actual)) return { ok: false, error: 'El PIN actual no es correcto.' };
    const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.HOJAS.USUARIOS);
    s.getRange(fresco.fila, SEG.COL_PIN).setValue(_crearPinGuardado(nuevo));
    s.getRange(fresco.fila, SEG.COL_DEBE_CAMBIAR).setValue(false);
    _log('PIN_CAMBIO', u.correo, 'PIN cambiado por el usuario');
    _invalidarCache();
    const nuevoU = obtenerUsuario(u.correo);
    return { ok: true, token: _crearToken(nuevoU), mensaje: 'Listo, tu PIN nuevo ya funciona.' };
  });
}

// Pone un PIN temporal. Devuelve el PIN en claro UNA sola vez para que el admin lo entregue.
function _asignarPinTemporal(correo) {
  const u = obtenerUsuario(correo);
  if (!u) throw new Error('Usuario no encontrado.');
  const pin = _pinAleatorio();
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.HOJAS.USUARIOS);
  s.getRange(u.fila, SEG.COL_PIN).setValue(_crearPinGuardado(pin));
  s.getRange(u.fila, SEG.COL_DEBE_CAMBIAR).setValue(true);
  CacheService.getScriptCache().remove('fail:' + String(correo).toLowerCase());
  _invalidarCache();
  return pin;
}


// ============================================================
// §10  INVENTARIO: libro de movimientos
// ============================================================
//  Cada cambio de stock deja una fila en la hoja Movimientos:
//  ENTRADA (compras al proveedor), VENTA, AJUSTE (merma, regalo, correccion),
//  CONTEO (conteo fisico) e INICIAL (stock al activar el sistema).
//  El stock de Productos solo cambia a traves de _moverStock, asi siempre cuadra.

const MOV_HEADERS = ['ID', 'Fecha', 'SKU', 'Producto', 'Tipo', 'Cantidad',
                     'Costo_Unit', 'Proveedor', 'Usuario', 'Notas', 'Stock_Despues'];

function _asegurarHoja(nombre, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(nombre);
  if (!s) {
    s = ss.insertSheet(nombre);
    s.getRange(1, 1, 1, headers.length).setValues([headers]);
    _formatoEncabezado(s, headers.length);
    s.setFrozenRows(1);
  }
  return s;
}

// Cambia el stock de un producto y deja el movimiento. Llamar SIEMPRE dentro de _conCandado
// (o del candado de registrarCompra).
function _moverStock(sku, delta, tipo, extra) {
  extra = extra || {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(CONFIG.HOJAS.PRODUCTOS);
  const data = s.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) !== String(sku)) continue;

    const antes = Number(data[i][5]) || 0;
    let despues = antes + Number(delta);
    if (despues < 0) {
      if (tipo === 'VENTA') despues = 0;
      else throw new Error('El stock de ' + data[i][1] + ' no puede quedar negativo (hay ' + antes + ').');
    }
    s.getRange(i + 1, 6).setValue(despues);

    let costoUnit = '';
    if (tipo === 'ENTRADA' && extra.costoUnit != null && delta > 0) {
      costoUnit = _round2(extra.costoUnit);
      const costoActual = Number(data[i][3]) || 0;
      const nuevoCosto = antes > 0
        ? _round2((antes * costoActual + delta * costoUnit) / (antes + delta))
        : costoUnit;
      s.getRange(i + 1, 4).setValue(nuevoCosto);
    }

    const sMov = _asegurarHoja(CONFIG.HOJAS.MOVIMIENTOS, MOV_HEADERS);
    sMov.appendRow([
      _generarId('M'), new Date(), String(sku), String(data[i][1]), tipo, Number(delta),
      costoUnit, _seguroCelda(extra.proveedor || ''), _seguroCelda(extra.usuario || ''),
      _seguroCelda(extra.notas || ''), despues
    ]);
    return { sku: String(sku), nombre: String(data[i][1]), antes: antes, despues: despues,
             minimo: Number(data[i][6]) || 0 };
  }
  throw new Error('Producto no existe: ' + sku);
}

// Unidades vendidas por SKU en los ultimos N dias.
function _vendidoPorSku(dias) {
  const data = _memoSS(CONFIG.HOJAS.VENTAS);
  const desde = Date.now() - dias * 86400000;
  const mapa = {};
  for (let i = 1; i < data.length; i++) {
    const ts = data[i][1];
    if (!(ts instanceof Date) || ts.getTime() < desde) continue;
    const sku = String(data[i][3]);
    mapa[sku] = (mapa[sku] || 0) + (Number(data[i][5]) || 0);
  }
  return mapa;
}

function _todosLosProductos() {
  const data = _memoSS(CONFIG.HOJAS.PRODUCTOS);
  const vend = _vendidoPorSku(30);
  const lista = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (!r[0]) continue;
    lista.push({
      sku: String(r[0]), nombre: String(r[1]), categoria: String(r[2] || ''),
      costo: _round2(r[3]), precio: _round2(r[4]),
      stock: Number(r[5]) || 0, stockMinimo: Number(r[6]) || 0,
      codigoBarras: String(r[7] || ''), imagenUrl: String(r[8] || ''),
      activo: (r[9] === true || r[9] === 'TRUE' || r[9] === 'true'),
      vendido30: vend[String(r[0])] || 0
    });
  }
  return lista;
}

function apiInvLista() {
  return { ok: true, productos: _todosLosProductos() };
}

// Registrar lo que compraste al proveedor. lineas: [{sku, piezas, costoUnit | costoTotal}]
function apiInvEntrada(u, p) {
  const lineas = p.lineas;
  if (!Array.isArray(lineas) || lineas.length === 0) return { ok: false, error: 'Agrega al menos un producto.' };
  if (lineas.length > 60) return { ok: false, error: 'Demasiadas líneas en una sola entrada.' };
  const proveedor = _texto(p.proveedor, 60);
  const notas = _texto(p.notas, 150);

  return _idempotente(p.reqId, () => {
    // validar todo antes de tocar la hoja
    const limpias = lineas.map((l, i) => {
      const n = 'Línea ' + (i + 1);
      const piezas = _entero(l.piezas, 1, 10000, n + ': piezas');
      let costoUnit;
      if (l.costoTotal != null && l.costoTotal !== '') costoUnit = _decimal(Number(l.costoTotal) / piezas, 0, 10000, n + ': costo');
      else costoUnit = _decimal(l.costoUnit, 0, 10000, n + ': costo por pieza');
      if (!obtenerProducto(String(l.sku))) throw new Error(n + ': el producto ' + l.sku + ' no existe.');
      return { sku: String(l.sku), piezas: piezas, costoUnit: costoUnit };
    });

    return _conCandado(() => {
      let totalPiezas = 0, totalCosto = 0;
      const resumen = limpias.map(l => {
        const r = _moverStock(l.sku, l.piezas, 'ENTRADA',
          { costoUnit: l.costoUnit, proveedor: proveedor, usuario: u.correo, notas: notas });
        totalPiezas += l.piezas;
        totalCosto += l.piezas * l.costoUnit;
        return { sku: l.sku, nombre: r.nombre, piezas: l.piezas, antes: r.antes, despues: r.despues };
      });
      _log('ENTRADA', u.correo, 'Entrada de ' + totalPiezas + ' piezas por ' + _money(totalCosto), proveedor);
      return { ok: true, lineas: resumen, totalPiezas: totalPiezas, totalCosto: _round2(totalCosto),
               mensaje: 'Entrada registrada: ' + totalPiezas + ' piezas.' };
    });
  });
}

// Merma, regalo, correccion. delta positivo suma, negativo resta.
function apiInvAjuste(u, p) {
  const delta = _entero(p.delta, -10000, 10000, 'La cantidad');
  if (delta === 0) return { ok: false, error: 'La cantidad no puede ser 0.' };
  const motivo = _texto(p.motivo, 120);
  if (motivo.length < 3) return { ok: false, error: 'Escribe el motivo del ajuste (por ejemplo: se caducó).' };
  return _idempotente(p.reqId, () => _conCandado(() => {
    const r = _moverStock(String(p.sku), delta, 'AJUSTE', { usuario: u.correo, notas: motivo });
    _log('AJUSTE', u.correo, r.nombre + ' ' + (delta > 0 ? '+' : '') + delta, motivo);
    return { ok: true, producto: r, mensaje: 'Ajuste guardado. Ahora hay ' + r.despues + '.' };
  }));
}

// Conteo fisico. conteos: [{sku, real}]. Solo registra las diferencias.
function apiInvConteo(u, p) {
  const conteos = p.conteos;
  if (!Array.isArray(conteos) || conteos.length === 0) return { ok: false, error: 'No hay conteos para guardar.' };
  if (conteos.length > 200) return { ok: false, error: 'Demasiados productos en un solo conteo.' };
  return _idempotente(p.reqId, () => {
    const limpios = conteos.map(c => ({
      sku: String(c.sku), real: _entero(c.real, 0, 100000, 'El conteo de ' + c.sku)
    }));
    return _conCandado(() => {
      const diferencias = [];
      limpios.forEach(c => {
        const prod = obtenerProducto(c.sku);
        if (!prod) throw new Error('Producto no existe: ' + c.sku);
        const diff = c.real - prod.stock;
        if (diff !== 0) {
          _moverStock(c.sku, diff, 'CONTEO', { usuario: u.correo, notas: 'Conteo físico (había ' + prod.stock + ')' });
          diferencias.push({ sku: c.sku, nombre: prod.nombre, antes: prod.stock, real: c.real, diff: diff });
        }
      });
      _log('CONTEO', u.correo, 'Conteo físico: ' + diferencias.length + ' diferencias de ' + limpios.length);
      return { ok: true, revisados: limpios.length, diferencias: diferencias,
               mensaje: diferencias.length === 0 ? 'Todo coincide con el sistema.' :
                        'Conteo guardado. Se corrigieron ' + diferencias.length + ' productos.' };
    });
  });
}

function apiInvMovimientos(p) {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.HOJAS.MOVIMIENTOS);
  if (!s) return { ok: true, movimientos: [] };
  const data = s.getDataRange().getValues();
  const limite = Math.min(Number(p.limite) || 100, 300);
  const sku = p.sku ? String(p.sku) : '';
  const out = [];
  for (let i = data.length - 1; i >= 1 && out.length < limite; i--) {
    if (sku && String(data[i][2]) !== sku) continue;
    out.push({
      id: String(data[i][0]),
      fecha: data[i][1] instanceof Date ? _fechaLargaMx(data[i][1]) : String(data[i][1]),
      sku: String(data[i][2]), producto: String(data[i][3]), tipo: String(data[i][4]),
      cantidad: Number(data[i][5]) || 0, costoUnit: data[i][6] === '' ? null : _round2(data[i][6]),
      proveedor: String(data[i][7] || ''), usuario: String(data[i][8] || ''),
      notas: String(data[i][9] || ''), stockDespues: Number(data[i][10]) || 0
    });
  }
  return { ok: true, movimientos: out };
}

// Lista de compras sugerida: cubre ~2 semanas de venta, o el doble del minimo.
function apiInvCompras() {
  const productos = _todosLosProductos().filter(p => p.activo);
  const lista = [];
  productos.forEach(p => {
    const porSemana = p.vendido30 / 4.3;
    const objetivo = Math.max(p.stockMinimo * 2, Math.ceil(porSemana * 2));
    const falta = Math.max(0, objetivo - p.stock);
    const urgente = p.stock <= p.stockMinimo || (porSemana > 0 && p.stock < porSemana);
    if (falta > 0 && urgente) {
      lista.push({
        sku: p.sku, nombre: p.nombre, categoria: p.categoria, stock: p.stock, stockMinimo: p.stockMinimo,
        vendidoSemana: _round2(porSemana), sugerido: falta, costo: p.costo,
        costoEstimado: _round2(falta * p.costo),
        dias: porSemana > 0 ? Math.floor(p.stock / (porSemana / 7)) : null
      });
    }
  });
  lista.sort((a, b) => (a.dias == null ? 999 : a.dias) - (b.dias == null ? 999 : b.dias));
  return { ok: true, lista: lista, total: _round2(lista.reduce((s, x) => s + x.costoEstimado, 0)) };
}

// ---------- alta y edicion de productos ----------

function _skuNuevo(nombre) {
  const base = _normalizar(nombre).split(' ').filter(x => x.length > 0);
  const a = (base[0] || 'PRD').substring(0, 3).toUpperCase().padEnd(3, 'X');
  const b = (base[1] || 'GEN').substring(0, 3).toUpperCase().padEnd(3, 'X');
  let sku = a + '-' + b, n = 1;
  while (obtenerProducto(sku)) { n++; sku = a + '-' + b + n; }
  return sku;
}

function apiProdGuardar(u, p) {
  const nombre = _texto(p.nombre, 80);
  if (nombre.length < 2) return { ok: false, error: 'Escribe el nombre del producto.' };
  const precio = _decimal(p.precio, 0.5, 5000, 'El precio');
  const stockMinimo = _entero(p.stockMinimo == null ? 2 : p.stockMinimo, 0, 1000, 'El stock mínimo');
  const categoria = _texto(p.categoria, 30) || 'Otros';
  const codigo = _texto(p.codigoBarras, 40);
  let imagen = _texto(p.imagenUrl, 300);
  if (imagen && !/^https:\/\//i.test(imagen)) return { ok: false, error: 'La imagen debe ser un enlace que empiece con https://' };
  const activo = p.activo === true || p.activo === 'true';

  return _conCandado(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const s = ss.getSheetByName(CONFIG.HOJAS.PRODUCTOS);
    const existente = p.sku ? obtenerProducto(String(p.sku)) : null;

    if (existente) {
      const f = existente.fila;
      s.getRange(f, 2, 1, 3).setValues([[_seguroCelda(nombre), _seguroCelda(categoria),
        p.costo != null && p.costo !== '' ? _decimal(p.costo, 0, 5000, 'El costo') : existente.costo]]);
      s.getRange(f, 5).setValue(precio);
      s.getRange(f, 7).setValue(stockMinimo);
      s.getRange(f, 8, 1, 3).setValues([[_seguroCelda(codigo), imagen, activo]]);
      _log('PRODUCTO', u.correo, 'Editado: ' + existente.sku);
      return { ok: true, sku: existente.sku, mensaje: 'Producto guardado.' };
    }

    const sku = _skuNuevo(nombre);
    const costo = p.costo != null && p.costo !== '' ? _decimal(p.costo, 0, 5000, 'El costo') : 0;
    s.appendRow([sku, _seguroCelda(nombre), _seguroCelda(categoria), costo, precio, 0, stockMinimo,
                 _seguroCelda(codigo), imagen, activo]);
    _log('PRODUCTO', u.correo, 'Creado: ' + sku + ' ' + nombre);
    return { ok: true, sku: sku, nuevo: true, mensaje: 'Producto creado. Registra una entrada para darle stock.' };
  });
}


// ============================================================
// §11  COBROS: pagos, cortes y estado de cuenta
// ============================================================

const PAGOS_HEADERS = ['ID', 'Fecha', 'Correo', 'Monto', 'Metodo', 'Recibido_Por', 'Notas',
                       'Deuda_Antes', 'Deuda_Despues'];

function _pagosDe(correo, limite) {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.HOJAS.PAGOS);
  if (!s) return [];
  const data = s.getDataRange().getValues();
  const c = String(correo || '').toLowerCase();
  const out = [];
  for (let i = data.length - 1; i >= 1 && out.length < (limite || 30); i--) {
    if (c && String(data[i][2]).toLowerCase() !== c) continue;
    out.push({
      fecha: data[i][1] instanceof Date ? _fechaLargaMx(data[i][1]) : String(data[i][1]),
      correo: String(data[i][2]), monto: _round2(data[i][3]), metodo: String(data[i][4]),
      recibidoPor: String(data[i][5] || ''), notas: String(data[i][6] || ''),
      deudaDespues: _round2(data[i][8])
    });
  }
  return out;
}

// Registra un pago (total o parcial). Llamar dentro de _conCandado.
function _registrarPago(correo, monto, metodo, notas, quienCobra) {
  const u = obtenerUsuario(correo);
  if (!u) throw new Error('Usuario no encontrado.');
  monto = _round2(monto);
  if (monto <= 0) throw new Error('El monto debe ser mayor a 0.');
  if (monto > u.deudaAcumulada + 0.001) {
    throw new Error('El pago (' + _money(monto) + ') es mayor que la deuda (' + _money(u.deudaAcumulada) + ').');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const despues = _round2(u.deudaAcumulada - monto);
  const sUsr = ss.getSheetByName(CONFIG.HOJAS.USUARIOS);
  sUsr.getRange(u.fila, 3).setValue(despues);
  if (despues === 0) sUsr.getRange(u.fila, 5).setValue(new Date());

  // Marcar ventas: si quedo en 0, todas pagadas; si no, las mas viejas hasta donde alcance.
  const sVen = ss.getSheetByName(CONFIG.HOJAS.VENTAS);
  const ventas = sVen.getDataRange().getValues();
  const c = String(correo).toLowerCase().trim();
  let resto = monto;
  for (let i = 1; i < ventas.length; i++) {
    if (String(ventas[i][2]).toLowerCase().trim() !== c) continue;
    if (String(ventas[i][9]) !== 'Pendiente') continue;
    const m = _round2(ventas[i][7]);
    if (despues === 0 || resto + 0.001 >= m) {
      sVen.getRange(i + 1, 10).setValue('Pagada');
      resto = _round2(resto - m);
    } else break;
  }

  if (despues === 0) {
    const sCor = ss.getSheetByName(CONFIG.HOJAS.CORTES);
    const cortes = sCor.getDataRange().getValues();
    for (let j = 1; j < cortes.length; j++) {
      if (String(cortes[j][3]).toLowerCase().trim() === c && !(cortes[j][5] === true || cortes[j][5] === 'TRUE')) {
        sCor.getRange(j + 1, 6, 1, 4).setValues([[true, new Date(), _seguroCelda(metodo), _seguroCelda(notas || '')]]);
      }
    }
  }

  const sPag = _asegurarHoja(CONFIG.HOJAS.PAGOS, PAGOS_HEADERS);
  sPag.appendRow([_generarId('P'), new Date(), c, monto, _seguroCelda(metodo), _seguroCelda(quienCobra),
                  _seguroCelda(notas || ''), u.deudaAcumulada, despues]);
  _log('PAGO', quienCobra, 'Pago de ' + _money(monto) + ' de ' + c, metodo);
  return { deudaAntes: u.deudaAcumulada, deudaDespues: despues, monto: monto };
}

// Se conserva para el menu de la hoja: liquida TODA la deuda.
function liquidarDeuda(correo, metodo, notas) {
  return _conCandado(() => {
    const u = obtenerUsuario(correo);
    if (!u) return { ok: false, error: 'Usuario no encontrado' };
    if (u.deudaAcumulada <= 0) return { ok: false, error: 'No tiene deuda pendiente.' };
    const r = _registrarPago(correo, u.deudaAcumulada, metodo || 'efectivo', notas || '', CONFIG.ADMIN_EMAIL);
    return { ok: true, deudaLiquidada: r.monto };
  });
}

function apiCobrosLista() {
  const usuarios = listarUsuarios();
  const ventas = _memoSS(CONFIG.HOJAS.VENTAS);
  const pend = {};
  for (let i = 1; i < ventas.length; i++) {
    if (String(ventas[i][9]) !== 'Pendiente') continue;
    const c = String(ventas[i][2]).toLowerCase();
    const ts = ventas[i][1] instanceof Date ? ventas[i][1] : null;
    if (!pend[c]) pend[c] = { n: 0, masVieja: null };
    pend[c].n++;
    if (ts && (!pend[c].masVieja || ts < pend[c].masVieja)) pend[c].masVieja = ts;
  }
  const deudores = usuarios.filter(u => u.deuda > 0).map(u => {
    const pp = pend[u.correo.toLowerCase()] || { n: 0, masVieja: null };
    return { correo: u.correo, nombre: u.nombre || u.correo.split('@')[0], deuda: u.deuda, limite: u.limite,
             pendientes: pp.n, desde: pp.masVieja ? _fechaCortaMx(pp.masVieja) : '' };
  }).sort((a, b) => b.deuda - a.deuda);
  return { ok: true, deudores: deudores, total: _round2(deudores.reduce((s, d) => s + d.deuda, 0)),
           pagos: _pagosDe('', 30) };
}

function apiCobrosPago(u, p) {
  const correo = _texto(p.correo, 120).toLowerCase();
  const monto = _decimal(p.monto, 0.5, 100000, 'El monto');
  const metodo = ['efectivo', 'transferencia', 'otro'].indexOf(String(p.metodo)) >= 0 ? String(p.metodo) : 'efectivo';
  return _idempotente(p.reqId, () => _conCandado(() => {
    const r = _registrarPago(correo, monto, metodo, _texto(p.notas, 100), u.correo);
    return { ok: true, deudaAntes: r.deudaAntes, deudaDespues: r.deudaDespues,
             mensaje: r.deudaDespues === 0 ? 'Cuenta liquidada.' : 'Pago guardado. Quedan ' + _money(r.deudaDespues) + '.' };
  }));
}

// Corte quincenal: fotografia de lo que debe cada quien. Si ya hay un corte abierto
// de esa persona, lo actualiza en vez de duplicarlo.
function generarCorte() {
  return _conCandado(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sCor = _asegurarHoja(CONFIG.HOJAS.CORTES, ['ID_Corte', 'Fecha_Inicio', 'Fecha_Fin', 'Correo',
                                                      'Total', 'Pagado', 'Fecha_Pago', 'Metodo_Pago', 'Notas']);
    const hoy = new Date();
    const usuarios = listarUsuarios();
    const cortes = sCor.getDataRange().getValues();
    let n = 0, total = 0;
    usuarios.forEach((u, idx) => {
      if (u.deuda <= 0 || !u.activo) return;
      let fila = -1;
      for (let j = 1; j < cortes.length; j++) {
        if (String(cortes[j][3]).toLowerCase() === u.correo.toLowerCase() &&
            !(cortes[j][5] === true || cortes[j][5] === 'TRUE')) { fila = j + 1; break; }
      }
      let idCorte;
      if (fila > 0) {
        idCorte = String(cortes[fila - 1][0]);
        sCor.getRange(fila, 3).setValue(hoy);
        sCor.getRange(fila, 5).setValue(u.deuda);
      } else {
        idCorte = 'C' + hoy.getTime() + '-' + idx;
        sCor.appendRow([idCorte, '', hoy, u.correo, u.deuda, false, '', '', '']);
      }
      _marcarVentasConCorte(u.correo, idCorte);
      n++; total += u.deuda;
    });
    _log('CORTE', CONFIG.ADMIN_EMAIL, 'Corte generado', JSON.stringify({ usuarios: n, total: total }));
    return { ok: true, usuarios: n, total: _round2(total), fecha: hoy };
  });
}

function apiCobrosCorte(u) {
  const r = generarCorte();
  if (r.ok) r.mensaje = 'Corte listo: ' + r.usuarios + ' personas con deuda, ' + _money(r.total) + ' en total.';
  return r;
}


// ============================================================
// §12  PANEL ADMIN: resumen y usuarios
// ============================================================

function apiAdminResumen() {
  const usuarios = listarUsuarios();
  const productos = _todosLosProductos();
  const costoPorSku = {};
  productos.forEach(p => { costoPorSku[p.sku] = p.costo; });

  const data = _memoSS(CONFIG.HOJAS.VENTAS);
  const hoyIso = _fechaIsoMx();
  const dias = [];
  for (let k = 6; k >= 0; k--) {
    const d = new Date(Date.now() - k * 86400000);
    dias.push({ iso: _fechaIsoMx(d), etiqueta: Utilities.formatDate(d, CONFIG.TZ, 'dd/MM'), monto: 0 });
  }
  const idxDia = {};
  dias.forEach((d, i) => { idxDia[d.iso] = i; });

  let ventasHoy = 0, unidadesHoy = 0, ventasSemana = 0, ventas30 = 0, ganancia30 = 0;
  const hace30 = Date.now() - 30 * 86400000;
  for (let i = 1; i < data.length; i++) {
    const ts = data[i][1];
    if (!(ts instanceof Date)) continue;
    const monto = Number(data[i][7]) || 0;
    const cant = Number(data[i][5]) || 0;
    const iso = _fechaIsoMx(ts);
    if (iso === hoyIso) { ventasHoy += monto; unidadesHoy += cant; }
    if (idxDia[iso] != null) { dias[idxDia[iso]].monto += monto; ventasSemana += monto; }
    if (ts.getTime() >= hace30) {
      ventas30 += monto;
      ganancia30 += monto - cant * (costoPorSku[String(data[i][3])] || 0);
    }
  }

  const activos = productos.filter(p => p.activo);
  const stockBajo = activos.filter(p => p.stock <= p.stockMinimo)
    .sort((a, b) => a.stock - b.stock)
    .map(p => ({ sku: p.sku, nombre: p.nombre, stock: p.stock, stockMinimo: p.stockMinimo }));

  const deudores = usuarios.filter(u => u.deuda > 0).sort((a, b) => b.deuda - a.deuda)
    .map(u => ({ correo: u.correo, nombre: u.nombre || u.correo.split('@')[0], deuda: u.deuda }));

  const sugerencias = [];
  try {
    const sug = _memoSS(CONFIG.HOJAS.SUGERENCIAS);
    for (let i = sug.length - 1; i >= 1 && sugerencias.length < 8; i--) {
      sugerencias.push({
        correo: String(sug[i][1]), tipo: String(sug[i][2]), mensaje: String(sug[i][3]),
        calificacion: sug[i][4] === '' ? null : Number(sug[i][4]),
        fecha: sug[i][0] instanceof Date ? _fechaCortaMx(sug[i][0]) : ''
      });
    }
  } catch (e) {}

  const valorCosto = activos.reduce((s, p) => s + p.costo * p.stock, 0);
  const valorVenta = activos.reduce((s, p) => s + p.precio * p.stock, 0);

  return {
    ok: true,
    ventasHoy: _round2(ventasHoy), unidadesHoy: unidadesHoy,
    ventasSemana: _round2(ventasSemana), ventas30: _round2(ventas30), ganancia30: _round2(ganancia30),
    dias: dias.map(d => ({ etiqueta: d.etiqueta, monto: _round2(d.monto) })),
    deudaTotal: _round2(deudores.reduce((s, d) => s + d.deuda, 0)),
    deudores: deudores,
    stockBajo: stockBajo,
    agotados: activos.filter(p => p.stock === 0).length,
    valorInventarioCosto: _round2(valorCosto), valorInventarioVenta: _round2(valorVenta),
    sugerencias: sugerencias
  };
}

// ---------- usuarios ----------

function apiUsrLista() {
  const data = _memoSS(CONFIG.HOJAS.USUARIOS);
  const lista = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    lista.push({
      correo: String(data[i][0]), nombre: String(data[i][1]), deuda: _round2(data[i][2]),
      limite: _round2(data[i][3]),
      activo: (data[i][5] === true || data[i][5] === 'TRUE' || data[i][5] === 'true'),
      rol: _normRol(data[i][7]),
      tienePin: !!String(data[i][8] || ''),
      debeCambiarPin: (data[i][9] === true || data[i][9] === 'TRUE')
    });
  }
  return { ok: true, usuarios: lista };
}

function _adminsActivos() {
  return apiUsrLista().usuarios.filter(u => u.activo && u.rol === ROLES.ADMIN).length;
}

function apiUsrGuardar(u, p) {
  const correo = _texto(p.correo, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { ok: false, error: 'Ese correo no es válido.' };
  const nombre = _texto(p.nombre, 60);
  if (nombre.length < 2) return { ok: false, error: 'Escribe el nombre.' };
  const limite = _decimal(p.limite, 0, 10000, 'El límite de crédito');
  const rol = _normRol(p.rol);
  const activo = p.activo === true || p.activo === 'true';

  return _conCandado(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const s = ss.getSheetByName(CONFIG.HOJAS.USUARIOS);
    const existente = obtenerUsuario(correo);

    if (existente) {
      const eraAdminActivo = existente.rol === ROLES.ADMIN && existente.activo;
      const sigueAdminActivo = rol === ROLES.ADMIN && activo;
      if (eraAdminActivo && !sigueAdminActivo && _adminsActivos() <= 1) {
        return { ok: false, error: 'Tiene que quedar al menos un admin activo.' };
      }
      if (correo === u.correo.toLowerCase() && (!activo || rol !== ROLES.ADMIN)) {
        return { ok: false, error: 'No puedes quitarte a ti mismo el rol de admin ni desactivarte.' };
      }
      s.getRange(existente.fila, 2).setValue(_seguroCelda(nombre));
      s.getRange(existente.fila, 4).setValue(limite);
      s.getRange(existente.fila, 6).setValue(activo);
      s.getRange(existente.fila, 8).setValue(rol);
      _log('USER_EDIT', u.correo, 'Editado: ' + correo + ' rol=' + rol + ' activo=' + activo);
      _invalidarCache();
      // Si pasa a admin u operador y aun no tiene PIN, se le da uno temporal.
      if (!WEB_SOLO_TIENDA && rol !== ROLES.CLIENTE && !existente.pinHash) {
        const pin = _asignarPinTemporal(correo);
        return { ok: true, pinTemporal: pin, mensaje: 'Cambios guardados. Ahora necesita PIN.' };
      }
      return { ok: true, mensaje: 'Cambios guardados.' };
    }

    s.appendRow([correo, _seguroCelda(nombre), 0, limite, '', activo, new Date(), rol, '', true]);
    _invalidarCache();
    _log('USER_ADD', u.correo, 'Usuario agregado: ' + correo + ' rol=' + rol);
    if (WEB_SOLO_TIENDA || rol === ROLES.CLIENTE) return { ok: true, nuevo: true, mensaje: 'Usuario creado. Entra solo con su correo.' };
    const pin = _asignarPinTemporal(correo);
    return { ok: true, nuevo: true, pinTemporal: pin, mensaje: 'Usuario creado.' };
  });
}

function apiUsrResetPin(u, p) {
  const correo = _texto(p.correo, 120).toLowerCase();
  return _conCandado(() => {
    const pin = _asignarPinTemporal(correo);
    _log('PIN_RESET', u.correo, 'PIN reiniciado para ' + correo);
    return { ok: true, pinTemporal: pin, mensaje: 'PIN nuevo listo. Dáselo en persona.' };
  });
}


// ============================================================
// §13  CONFIGURACION INICIAL v2 (se corre UNA vez desde el menu)
// ============================================================
//  Es seguro: no borra ni reemplaza datos. Solo agrega hojas y columnas,
//  asigna roles a los admins de la lista, copia el stock actual al libro
//  de movimientos y genera un PIN temporal para cada persona.

// Correos que quedan como admin. Revisa esta lista antes de correr la configuracion.
const ADMINS_INICIALES = [
  'victor.walmart.04@gmail.com',
  'samantha.rosado08@gmail.com'
];

function configuracionInicialV2() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert(
    'Configuración inicial v2',
    'Esto va a:\n\n' +
    '• Crear las hojas Movimientos y Pagos (si no existen)\n' +
    '• Crear las hojas de trabajo: Entradas, Ajustes, Conteo y Cobros\n' +
    '• Agregar columnas de PIN a Usuarios (no se usan en modo tienda)\n' +
    '• Dejar como admin a: ' + ADMINS_INICIALES.join(', ') + '\n' +
    '• Copiar el stock actual al libro de movimientos\n' +
    '• Nadie usa PIN: todos entran a la web solo con su correo\n\n' +
    'No borra ni cambia tus ventas, productos ni deudas.\n\n¿Continuar?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _asegurarHoja(CONFIG.HOJAS.MOVIMIENTOS, MOV_HEADERS);
  _asegurarHoja(CONFIG.HOJAS.PAGOS, PAGOS_HEADERS);
  _prepararHojasTrabajo();

  const sUsr = ss.getSheetByName(CONFIG.HOJAS.USUARIOS);
  sUsr.getRange(1, SEG.COL_PIN, 1, 2).setValues([['PIN_Hash', 'Debe_Cambiar_PIN']]);
  _formatoEncabezado(sUsr, 10);

  // roles
  const admins = ADMINS_INICIALES.map(x => x.toLowerCase());
  const datos = sUsr.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    const c = String(datos[i][0]).toLowerCase().trim();
    if (!c) continue;
    const rolNuevo = admins.indexOf(c) >= 0 ? ROLES.ADMIN : _normRol(datos[i][7]);
    sUsr.getRange(i + 1, 8).setValue(rolNuevo);
  }
  _invalidarCache();

  // stock inicial al libro de movimientos (solo si esta vacio)
  const sMov = ss.getSheetByName(CONFIG.HOJAS.MOVIMIENTOS);
  if (sMov.getLastRow() <= 1) {
    const prods = ss.getSheetByName(CONFIG.HOJAS.PRODUCTOS).getDataRange().getValues();
    const filas = [];
    for (let i = 1; i < prods.length; i++) {
      const stock = Number(prods[i][5]) || 0;
      if (!prods[i][0] || stock <= 0) continue;
      filas.push([_generarId('M') + i, new Date(), String(prods[i][0]), String(prods[i][1]), 'INICIAL',
                  stock, '', '', CONFIG.ADMIN_EMAIL, 'Stock al activar v2 (hacer conteo físico)', stock]);
    }
    if (filas.length) sMov.getRange(sMov.getLastRow() + 1, 1, filas.length, MOV_HEADERS.length).setValues(filas);
  }

  // PINs temporales
  const lista = [];
  apiUsrLista().usuarios.forEach(u => {
    if (!WEB_SOLO_TIENDA && u.activo && u.rol !== ROLES.CLIENTE && !u.tienePin) lista.push({ nombre: u.nombre, correo: u.correo, pin: _asignarPinTemporal(u.correo) });
  });
  _log('CONFIG_V2', CONFIG.ADMIN_EMAIL, 'Configuración inicial v2 ejecutada. PINs nuevos: ' + lista.length);

  if (lista.length === 0) { ui.alert('✅ Listo.\n\nYa puedes trabajar desde el menú 🏪 TIENDITA > 🗒️ Trabajo diario.\nLa web no usa PIN: todos entran con su correo.'); return; }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const filasHtml = lista.map(x =>
    '<tr><td>' + esc(x.nombre) + '</td><td>' + esc(x.correo) + '</td><td style="font:700 18px monospace">' + x.pin + '</td></tr>').join('');
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;font-size:14px"><p><b>Anota o toma captura ahora.</b> ' +
    'Estos PIN no se vuelven a mostrar. Cada persona lo cambia al entrar por primera vez.</p>' +
    '<table cellpadding="6" border="1" style="border-collapse:collapse">' + filasHtml + '</table></div>')
    .setWidth(640).setHeight(480);
  ui.showModalDialog(html, 'PINs temporales');
}

// Pone (o cambia) la contrasena del admin de la web. Crea el usuario si no existe.
// La contrasena nunca se guarda en claro ni en el codigo: solo su hash en la hoja Usuarios.
function _ponerClaveAdminWeb(clave) {
  clave = String(clave || '');
  if (clave.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  return _conCandado(() => {
    const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.HOJAS.USUARIOS);
    let u = obtenerUsuario(ADMIN_WEB);
    if (!u) {
      s.appendRow([ADMIN_WEB, 'Admin web', 0, 0, '', true, new Date(), ROLES.ADMIN, '', false]);
      _invalidarCache();
      u = obtenerUsuario(ADMIN_WEB);
    }
    s.getRange(u.fila, 6).setValue(true);
    s.getRange(u.fila, 8).setValue(ROLES.ADMIN);
    s.getRange(u.fila, SEG.COL_PIN).setValue(_crearPinGuardado(clave));
    s.getRange(u.fila, SEG.COL_DEBE_CAMBIAR).setValue(false);
    CacheService.getScriptCache().remove('fail:' + ADMIN_WEB);
    _invalidarCache();
    _log('ADMIN_WEB_CLAVE', CONFIG.ADMIN_EMAIL, 'Contraseña del admin web puesta o cambiada');
    return true;
  });
}

function menuClaveAdminWeb() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Contraseña del admin web',
    'Usuario: ' + ADMIN_WEB + '\n\nEscribe la contraseña nueva (mínimo 8 caracteres). Se cierran las sesiones abiertas del admin.',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  try {
    _ponerClaveAdminWeb(r.getResponseText().trim());
    ui.alert('✅ Listo. Entra a la web con ' + ADMIN_WEB + ' y esa contraseña.');
  } catch (e) { ui.alert('❌ ' + e.message); }
}

// Atajo para dar un PIN nuevo a una persona desde la hoja.
function menuReiniciarPin() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Reiniciar PIN', 'Correo de la persona:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const correo = r.getResponseText().trim().toLowerCase();
  if (!obtenerUsuario(correo)) { ui.alert('❌ No encontré ese correo.'); return; }
  const pin = _asignarPinTemporal(correo);
  _log('PIN_RESET', CONFIG.ADMIN_EMAIL, 'PIN reiniciado desde menu para ' + correo);
  ui.alert('PIN temporal de ' + correo + ':\n\n' + pin + '\n\nCámbiaselo en persona. Lo cambia al entrar.');
}

// Revisa que el stock de Productos coincida con la suma del libro de movimientos.
function menuVerificarStock() {
  const ui = SpreadsheetApp.getUi();
  const mov = _memoSS(CONFIG.HOJAS.MOVIMIENTOS);
  const suma = {};
  for (let i = 1; i < mov.length; i++) suma[String(mov[i][2])] = (suma[String(mov[i][2])] || 0) + (Number(mov[i][5]) || 0);
  const dif = [];
  listarProductos().forEach(p => {
    const esperado = suma[p.sku] || 0;
    if (esperado !== p.stock) dif.push(p.nombre + ': hoja=' + p.stock + ', movimientos=' + esperado);
  });
  ui.alert(dif.length === 0 ? '✅ El stock coincide con el libro de movimientos.' :
    '⚠️ Hay ' + dif.length + ' diferencias (alguien editó Productos a mano):\n\n' + dif.slice(0, 15).join('\n'));
}


// ============================================================
// §14  HOJAS DE TRABAJO (inventario y cobros desde la hoja de Google)
// ============================================================
//  Aqui se trabaja el dia a dia: se escribe una fila, se pulsa el menu y listo.
//  Todo pasa por las mismas funciones que cuidan el stock (libro de Movimientos),
//  asi que nada se cuenta dos veces ni queda sin anotar.
//  La seguridad es la de Google: solo entra quien tenga acceso a esta hoja.

const HT = {
  ENTRADAS: { nombre: 'Entradas', cab: ['Producto', 'Piezas', 'Costo total pagado', 'Proveedor', 'Estado'] },
  AJUSTES:  { nombre: 'Ajustes',  cab: ['Producto', 'Cantidad (+ o -)', 'Motivo', 'Estado'] },
  CONTEO:   { nombre: 'Conteo',   cab: ['SKU', 'Producto', 'En sistema', 'Contaste', 'Estado'] },
  COBROS:   { nombre: 'Cobros',   cab: ['Correo', 'Monto', 'Forma de pago', 'Notas', 'Estado'] }
};

function _actorHoja() {
  let c = '';
  try { c = Session.getActiveUser().getEmail(); } catch (_) {}
  return { correo: c || 'hoja', rol: ROLES.ADMIN };
}

function _alertaHoja(titulo, mensaje) {
  try { const ui = SpreadsheetApp.getUi(); ui.alert(titulo, mensaje, ui.ButtonSet.OK); } catch (_) {}
}

// Busca un producto por nombre (o por SKU). Falla si no existe o si hay dos iguales.
function _productoPorNombre(texto) {
  const t = String(texto || '').trim().toLowerCase();
  if (!t) throw new Error('Falta escoger el producto.');
  const hallados = listarProductos().filter(p => p.nombre.trim().toLowerCase() === t || String(p.sku).toLowerCase() === t);
  if (hallados.length === 0) throw new Error('No existe el producto "' + texto + '". Escógelo de la lista.');
  if (hallados.length > 1) throw new Error('Hay más de un producto llamado "' + texto + '". Usa el SKU.');
  return hallados[0];
}

function _prepararHojasTrabajo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HT).forEach(k => _asegurarHoja(HT[k].nombre, HT[k].cab));
  try {
    const prod = ss.getSheetByName(CONFIG.HOJAS.PRODUCTOS), usr = ss.getSheetByName(CONFIG.HOJAS.USUARIOS);
    const lista = (rango) => SpreadsheetApp.newDataValidation().requireValueInRange(rango, true).setAllowInvalid(false).build();
    ss.getSheetByName(HT.ENTRADAS.nombre).getRange('A2:A300').setDataValidation(lista(prod.getRange('B2:B500')));
    ss.getSheetByName(HT.AJUSTES.nombre).getRange('A2:A300').setDataValidation(lista(prod.getRange('B2:B500')));
    ss.getSheetByName(HT.COBROS.nombre).getRange('A2:A300').setDataValidation(lista(usr.getRange('A2:A500')));
    ss.getSheetByName(HT.COBROS.nombre).getRange('C2:C300').setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['efectivo', 'transferencia', 'otro'], true).setAllowInvalid(false).build());
    ss.getSheetByName(HT.ENTRADAS.nombre).getRange(1, 3).setNote('Lo que pagaste por TODAS las piezas. Si lo dejas vacío se usa el costo que ya tiene el producto.');
    ss.getSheetByName(HT.AJUSTES.nombre).getRange(1, 2).setNote('Usa número negativo para restar (merma, se caducó, se perdió) y positivo para sumar.');
    ss.getSheetByName(HT.COBROS.nombre).getRange(1, 3).setNote('efectivo, transferencia u otro. Si lo dejas vacío cuenta como efectivo.');
  } catch (_) { /* las listas desplegables son un extra: si fallan, igual se puede escribir a mano */ }
}

// Procesa las filas pendientes de una hoja. Una fila ya procesada (con Estado) no se vuelve a tocar.
function _procesarHoja(def, colEstado, hayDatos, fnFila) {
  return _conCandado(() => {
    const s = _asegurarHoja(def.nombre, def.cab);
    const data = s.getDataRange().getValues();
    const actor = _actorHoja();
    let ok = 0, fallos = 0;
    for (let i = 1; i < data.length; i++) {
      const fila = data[i];
      if (String(fila[colEstado] || '').trim() !== '') continue;
      if (!hayDatos(fila)) continue;
      let texto;
      try { texto = '✅ ' + fnFila(fila, actor) + ' · ' + _fechaLargaMx(); ok++; }
      catch (e) { texto = '❌ ' + e.message; fallos++; }
      s.getRange(i + 1, colEstado + 1).setValue(texto);
      _invalidarCache();
    }
    return { ok: true, aplicadas: ok, fallos: fallos };
  });
}

function _exigir(r) { if (!r || !r.ok) throw new Error((r && r.error) || 'No se pudo guardar.'); return r; }
function _stockActual(sku) { _invalidarCache(); const p = obtenerProducto(sku); return p ? p.stock : '?'; }
const _noVacia = (f) => String(f[0] || '').trim() !== '';

function procesarEntradasHoja() {
  return _procesarHoja(HT.ENTRADAS, 4, _noVacia, (f, u) => {
    const prod = _productoPorNombre(f[0]);
    const lin = { sku: prod.sku, piezas: f[1] };
    if (String(f[2]).trim() !== '') lin.costoTotal = f[2]; else lin.costoUnit = prod.costo;
    _exigir(apiInvEntrada(u, { lineas: [lin], proveedor: f[3], notas: 'Desde la hoja Entradas' }));
    return 'Entraron ' + f[1] + ' de ' + prod.nombre + '. Ahora hay ' + _stockActual(prod.sku);
  });
}

function procesarAjustesHoja() {
  return _procesarHoja(HT.AJUSTES, 3, _noVacia, (f, u) => {
    const prod = _productoPorNombre(f[0]);
    _exigir(apiInvAjuste(u, { sku: prod.sku, delta: f[1], motivo: f[2] }));
    return prod.nombre + ' ' + (Number(f[1]) > 0 ? '+' : '') + f[1] + '. Ahora hay ' + _stockActual(prod.sku);
  });
}

function procesarCobrosHoja() {
  return _procesarHoja(HT.COBROS, 4, _noVacia, (f, u) => {
    const metodo = String(f[2] || 'efectivo').trim().toLowerCase() || 'efectivo';
    const r = _exigir(apiCobrosPago(u, { correo: f[0], monto: f[1], metodo: metodo, notas: f[3] }));
    return 'Pago de ' + _money(Number(f[1])) + ' guardado. Debe ' + _money(r.deudaDespues);
  });
}

// Conteo fisico: se llena la columna "Contaste" y se aplica; solo se corrigen las diferencias.
function prepararConteoHoja() {
  return _conCandado(() => {
    const s = _asegurarHoja(HT.CONTEO.nombre, HT.CONTEO.cab);
    const last = s.getLastRow();
    if (last > 1) s.getRange(2, 1, last - 1, HT.CONTEO.cab.length).clearContent();
    _invalidarCache();
    const filas = listarProductos()
      .map(p => [p.sku, p.nombre, p.stock, '', '']);
    if (filas.length) s.getRange(2, 1, filas.length, HT.CONTEO.cab.length).setValues(filas);
    return { ok: true, productos: filas.length };
  });
}

function procesarConteoHoja() {
  return _procesarHoja(HT.CONTEO, 4, (f) => String(f[3]).trim() !== '', (f, u) => {
    const prod = obtenerProducto(String(f[0]));
    if (!prod) throw new Error('No existe el SKU ' + f[0]);
    const antes = prod.stock;
    const r = _exigir(apiInvConteo(u, { conteos: [{ sku: prod.sku, real: f[3] }] }));
    const d = Number(f[3]) - antes;
    return d === 0 ? 'Coincide (' + antes + ')' : (d > 0 ? 'Sobraban ' + d : 'Faltaban ' + (-d)) + '. Quedó en ' + f[3];
  });
}

// ---- menu ----
function _resumenHoja(titulo, r) {
  if (!r.aplicadas && !r.fallos) { _alertaHoja(titulo, 'No hay filas nuevas. Escribe filas debajo de los encabezados y vuelve a intentar.'); return; }
  _alertaHoja(titulo, '✅ Aplicadas: ' + r.aplicadas + (r.fallos ? '\n❌ Con error: ' + r.fallos + ' (míralas en la columna Estado)' : ''));
}
function menuPrepararHojasTrabajo() { _prepararHojasTrabajo(); _alertaHoja('Listo', 'Hojas listas: Entradas, Ajustes, Conteo y Cobros.'); }
function menuAplicarEntradas() { _resumenHoja('Entradas', procesarEntradasHoja()); }
function menuAplicarAjustes() { _resumenHoja('Ajustes', procesarAjustesHoja()); }
function menuAplicarCobros() { _resumenHoja('Cobros', procesarCobrosHoja()); }
function menuPrepararConteo() {
  const r = prepararConteoHoja();
  _alertaHoja('Conteo listo', 'Se listaron ' + r.productos + ' productos en la hoja Conteo.\n\nEscribe en "Contaste" lo que hay de verdad (puedes dejar vacíos los que no cuentes) y luego usa "Aplicar CONTEO".');
}
function menuAplicarConteo() { _resumenHoja('Conteo', procesarConteoHoja()); }

