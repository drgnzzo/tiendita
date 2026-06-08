/**
 * REPORTES - reporte diario por correo, bot conversacional, sugerencias, dashboard
 */

// ============================================================
// REPORTE DIARIO POR CORREO
// ============================================================
function enviarReporteDiario() {
  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
  const finDia    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);

  const data = _memoSS(CONFIG.HOJAS.VENTAS);
  const ventasHoy = [];
  let montoTotal = 0;
  let unidades   = 0;

  for (let i = 1; i < data.length; i++) {
    const ts = data[i][1];
    if (!(ts instanceof Date)) continue;
    if (ts >= inicioDia && ts <= finDia) {
      ventasHoy.push({
        correo:    String(data[i][2]),
        producto:  String(data[i][4]),
        cantidad:  Number(data[i][5]) || 0,
        monto:     Number(data[i][7]) || 0
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

  const fecha = Utilities.formatDate(hoy, Session.getScriptTimeZone(), 'dd/MM/yyyy');

  // --- HTML ---
  let html = '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;color:#0F172A">';
  html += '<h2 style="margin:0 0 4px">🏪 Tiendita</h2>';
  html += '<div style="color:#64748B;font-size:14px;margin-bottom:16px">Reporte del ' + fecha + '</div>';

  // Tarjetas
  html += '<div style="display:flex;gap:8px;margin:16px 0">';
  html += _tarjeta('Ventas hoy',  '$' + montoTotal.toFixed(2), '#F1F5F9', '#0F172A');
  html += _tarjeta('Unidades',    String(unidades),            '#F1F5F9', '#0F172A');
  html += _tarjeta('Deuda total', '$' + deudaTotal.toFixed(2), '#FEF3C7', '#92400E');
  html += '</div>';

  // Por producto
  if (Object.keys(porProducto).length > 0) {
    html += '<h3 style="margin:20px 0 8px">Por producto</h3>';
    html += _tabla(['Producto','Uds','Monto'],
      Object.keys(porProducto).map(p => [p, String(porProducto[p].unidades), '$' + porProducto[p].monto.toFixed(2)]));
  } else {
    html += '<p style="color:#64748B"><em>Sin ventas hoy.</em></p>';
  }

  // Por usuario
  if (Object.keys(porUsuario).length > 0) {
    html += '<h3 style="margin:20px 0 8px">Por usuario</h3>';
    html += _tabla(['Usuario','Uds','Monto'],
      Object.keys(porUsuario).map(u => [u, String(porUsuario[u].unidades), '$' + porUsuario[u].monto.toFixed(2)]));
  }

  // Stock bajo
  if (bajos.length > 0) {
    html += '<h3 style="margin:20px 0 8px;color:#DC2626">🚨 Reabasto necesario</h3><ul style="padding-left:20px">';
    bajos.forEach(p => {
      html += '<li>' + p.nombre + ' — <strong>' + p.stock + ' uds</strong> (min: ' + p.stockMinimo + ')</li>';
    });
    html += '</ul>';
  }

  html += '<hr style="border:none;border-top:1px solid #E2E8F0;margin:20px 0">';
  html += '<p style="color:#94A3B8;font-size:11px">Tiendita v' + CONFIG.VERSION + ' · ' + new Date().toISOString() + '</p>';
  html += '</div>';

  MailApp.sendEmail({
    to:       CONFIG.ADMIN_EMAIL,
    subject:  '🏪 Tiendita ' + fecha + ' — $' + montoTotal.toFixed(2) + ' (' + unidades + ' uds)',
    htmlBody: html
  });

  _log('REPORTE_DIARIO', CONFIG.ADMIN_EMAIL, 'Reporte enviado',
       JSON.stringify({ monto: montoTotal, unidades: unidades }));
}

function _tarjeta(titulo, valor, bg, fg) {
  return '<div style="flex:1;background:' + bg + ';padding:12px;border-radius:8px">' +
           '<div style="font-size:11px;color:' + fg + ';opacity:0.7;text-transform:uppercase;letter-spacing:0.5px">' + titulo + '</div>' +
           '<div style="font-size:22px;font-weight:700;color:' + fg + ';margin-top:4px">' + valor + '</div>' +
         '</div>';
}

function _tabla(headers, filas) {
  let h = '<table style="width:100%;border-collapse:collapse;font-size:13px">';
  h += '<tr style="background:#0F172A;color:white">';
  headers.forEach((c, i) => {
    h += '<th style="padding:8px;text-align:' + (i === 0 ? 'left' : 'right') + '">' + c + '</th>';
  });
  h += '</tr>';
  filas.forEach((fila, i) => {
    h += '<tr style="background:' + (i % 2 ? '#F1F5F9' : 'white') + '">';
    fila.forEach((celda, j) => {
      h += '<td style="padding:6px 8px;text-align:' + (j === 0 ? 'left' : 'right') + '">' + celda + '</td>';
    });
    h += '</tr>';
  });
  return h + '</table>';
}

// ============================================================
// TRIGGER MANAGEMENT
// ============================================================
function instalarTriggerDiario() {
  quitarTriggers();
  ScriptApp.newTrigger('enviarReporteDiario')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.HORA_REPORTE_DIARIO)
    .create();
  SpreadsheetApp.getUi().alert('✅ Trigger instalado.\nRecibirás el reporte todos los días a las ' +
                               CONFIG.HORA_REPORTE_DIARIO + ':00.');
}

function quitarTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
}

// ============================================================
// BOT CONVERSACIONAL
// ============================================================
function procesarBot(correo, query) {
  const q = _normalizar(query);
  if (!q) return { ok: true, respuesta: 'Pregúntame "¿cuánto debo?" o "¿hay coca?".' };

  // Intent: deuda / saldo
  if (/(debo|deuda|cuenta|saldo|adeudo)/.test(q)) {
    if (!correo) return { ok: true, respuesta: 'Inicia sesión para ver tu deuda.' };
    const u = obtenerUsuario(correo);
    if (!u) return { ok: true, respuesta: 'No te encuentro en el sistema.' };
    if (u.deudaAcumulada === 0) return { ok: true, respuesta: 'Tu cuenta está en ceros. 🚀' };
    return { ok: true, respuesta: 'Tu deuda actual es de $' + u.deudaAcumulada.toFixed(2) + ' MXN. Límite: $' + u.limiteCredito.toFixed(2) + '.' };
  }

  // Intent: limite disponible
  if (/(limite|cuanto puedo|disponible|alcanza)/.test(q)) {
    if (!correo) return { ok: true, respuesta: 'Inicia sesión primero.' };
    const u = obtenerUsuario(correo);
    if (!u) return { ok: true, respuesta: 'No te encuentro en el sistema.' };
    const disp = Math.max(0, +(u.limiteCredito - u.deudaAcumulada).toFixed(2));
    return { ok: true, respuesta: 'Tienes $' + disp + ' MXN disponibles antes de tu límite.' };
  }

  // Intent: stock
  if (/(hay|stock|tienes|quedan|sirven|venden)/.test(q)) {
    const palabra = q.replace(/(hay|stock|tienes|quedan|sirven|venden|de|cuanto|cuanta|cuantos|cuantas|aun|todavia)/g, '').trim();
    if (palabra.length < 2) return { ok: true, respuesta: '¿De qué producto preguntas?' };
    return _buscarYResponder(palabra, 'stock');
  }

  // Intent: precio
  if (/(precio|cuesta|vale|cuanto)/.test(q)) {
    const palabra = q.replace(/(precio|cuesta|vale|cuanto|cuanta|cuantos|cuantas|de|el|la|los|las)/g, '').trim();
    if (palabra.length < 2) return { ok: true, respuesta: '¿De qué producto preguntas el precio?' };
    return _buscarYResponder(palabra, 'precio');
  }

  // Intent: ayuda
  if (/(ayuda|help|que puedes|comandos|opciones)/.test(q)) {
    return { ok: true, respuesta:
      'Puedo responderte:\n' +
      '• "¿cuánto debo?" — tu deuda actual\n' +
      '• "¿cuánto me alcanza?" — saldo disponible\n' +
      '• "¿hay coca?" — stock de un producto\n' +
      '• "¿cuánto cuesta la sopa?" — precio de un producto'
    };
  }

  return { ok: true, respuesta: 'No entendí. Escribe "ayuda" para ver lo que puedo responder.' };
}

function _buscarYResponder(palabra, modo) {
  const productos = listarProductos();
  const palabraNorm = _normalizar(palabra);
  const match = productos.filter(p => _normalizar(p.nombre).includes(palabraNorm));
  if (match.length === 0) return { ok: true, respuesta: 'No encontré "' + palabra + '" en el catálogo.' };

  if (match.length === 1) {
    const p = match[0];
    if (modo === 'stock') {
      if (p.stock === 0) return { ok: true, respuesta: '😔 Se acabó el ' + p.nombre + '. Pronto llega más.' };
      return { ok: true, respuesta: 'Quedan ' + p.stock + ' uds de ' + p.nombre + ' a $' + p.precio + '.' };
    }
    return { ok: true, respuesta: p.nombre + ' cuesta $' + p.precio + '.' };
  }

  let resp = 'Encontré varios:\n';
  match.slice(0, 5).forEach(p => {
    if (modo === 'stock') {
      resp += '• ' + p.nombre + ' — ' + (p.stock > 0 ? p.stock + ' uds a $' + p.precio : 'agotado') + '\n';
    } else {
      resp += '• ' + p.nombre + ' — $' + p.precio + '\n';
    }
  });
  return { ok: true, respuesta: resp };
}

// ============================================================
// SUGERENCIAS
// ============================================================
function guardarSugerencia(correo, tipo, mensaje, calificacion) {
  if (!mensaje || String(mensaje).trim().length < 3) {
    return { ok: false, error: 'El mensaje es muy corto' };
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

// ============================================================
// DASHBOARD (consola admin)
// ============================================================
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
    '📊 DASHBOARD TIENDITA\n\n' +
    '👥 Usuarios activos: ' + usuarios.filter(u => u.activo).length + ' / ' + usuarios.length + '\n' +
    '📦 Productos activos: ' + productos.length + '\n\n' +
    '💰 Ingresos historicos: $' + ingresosTot.toFixed(2) + '\n' +
    '📦 Unidades vendidas: '   + unidadesTot + '\n' +
    '⏳ Deuda por cobrar: $'   + deudaTotal.toFixed(2)  + '\n\n' +
    '🏷️ Inventario (a costo): $'  + valorInv.toFixed(2) + '\n' +
    '💵 Inventario (a venta): $'  + valorVta.toFixed(2) + '\n' +
    '📈 Margen potencial: $'     + margen.toFixed(2) + ' (' + margenPct + '%)'
  );
}
