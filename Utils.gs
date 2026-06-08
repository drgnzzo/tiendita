/**
 * UTILS - helpers compartidos
 *
 * _memoSS:        cache por ejecucion (se reinicia cada doGet/doPost o cada run del editor).
 *                 Evita releer la misma hoja 5 veces dentro de una sola peticion.
 * _invalidarCache: tras escribir en una hoja, invalida para que la siguiente lectura sea fresh.
 * _log:           guarda en la hoja oculta Logs para auditoria.
 * _normalizar:    NFD + lowercase para matches que no fallen por acentos.
 */

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

function _normalizar(texto) {
  if (!texto) return '';
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function _generarId(prefijo) {
  return (prefijo || '') + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
}
