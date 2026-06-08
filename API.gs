/**
 * API - router doGet/doPost
 * Endpoints publicos consumidos por el frontend (GitHub Pages).
 *
 * Convencion: el frontend llama
 *   GET  ?action=login&email=xxx
 *   POST { action: "comprar", email: "xxx", items: [...] }
 *
 * Todas las respuestas son JSON con shape:
 *   { ok: true,  ...payload }
 *   { ok: false, error: "mensaje" }
 */

function doGet(e)  { return _handleRequest(e, 'GET'); }
function doPost(e) { return _handleRequest(e, 'POST'); }

function _handleRequest(e, method) {
  try {
    const params = Object.assign({}, (e && e.parameter) || {});
    if (method === 'POST' && e && e.postData && e.postData.contents) {
      try { Object.assign(params, JSON.parse(e.postData.contents)); } catch (_) {}
    }
    const action = params.action || 'ping';

    let result;
    switch (action) {
      case 'ping':      result = { ok: true, version: CONFIG.VERSION, time: new Date() }; break;
      case 'login':     result = apiLogin(params.email); break;
      case 'catalogo':  result = apiCatalogo(); break;
      case 'perfil':    result = apiPerfil(params.email); break;
      case 'comprar':   result = apiComprar(params.email, params.items); break;
      case 'sugerir':   result = apiSugerir(params.email, params.tipo, params.mensaje, params.calificacion); break;
      case 'bot':       result = apiBot(params.email, params.query); break;
      case 'historial': result = apiHistorial(params.email); break;
      default:          result = { ok: false, error: 'Accion no reconocida: ' + action };
    }

    return _jsonResponse(result);
  } catch (err) {
    _log('API_ERROR', '', err.message, (err.stack || ''));
    return _jsonResponse({ ok: false, error: err.message });
  }
}

function _jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// ENDPOINTS
// ============================================================

function apiLogin(email) {
  if (!email) return { ok: false, error: 'Falta el correo' };
  const correo  = String(email).toLowerCase().trim();
  const usuario = obtenerUsuario(correo);
  if (!usuario)        return { ok: false, error: 'Correo no autorizado. Pide al admin que te de de alta.' };
  if (!usuario.activo) return { ok: false, error: 'Tu cuenta esta desactivada.' };
  _log('LOGIN', correo, 'Inicio de sesion');
  return { ok: true, usuario: usuario };
}

function apiCatalogo() {
  return { ok: true, productos: listarProductos() };
}

function apiPerfil(email) {
  if (!email) return { ok: false, error: 'Falta el correo' };
  const correo  = String(email).toLowerCase().trim();
  const usuario = obtenerUsuario(correo);
  if (!usuario) return { ok: false, error: 'Usuario no encontrado' };
  return { ok: true, usuario: usuario, historial: historialUsuario(correo, 20) };
}

function apiComprar(email, items) {
  if (!email) return { ok: false, error: 'Falta el correo' };
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { ok: false, error: 'Carrito vacio' };
  }
  return registrarCompra(String(email).toLowerCase().trim(), items);
}

function apiSugerir(email, tipo, mensaje, calificacion) {
  return guardarSugerencia(email, tipo, mensaje, calificacion);
}

function apiBot(email, query) {
  return procesarBot(email, query);
}

function apiHistorial(email) {
  if (!email) return { ok: false, error: 'Falta el correo' };
  return { ok: true, historial: historialUsuario(String(email).toLowerCase().trim(), 100) };
}
