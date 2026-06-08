/**
 * USUARIOS - whitelist, deuda acumulada, corte quincenal
 */

// ============================================================
// LOOKUPS
// ============================================================
function obtenerUsuario(correo) {
  const data = _memoSS(CONFIG.HOJAS.USUARIOS);
  const c = String(correo).toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === c) {
      return {
        fila:            i + 1,
        correo:          String(data[i][0]),
        nombre:          String(data[i][1]),
        deudaAcumulada:  Number(data[i][2]) || 0,
        limiteCredito:   Number(data[i][3]) || 0,
        ultimoCorte:     data[i][4],
        activo:          (data[i][5] === true || data[i][5] === 'TRUE' || data[i][5] === 'true'),
        fechaAlta:       data[i][6],
        rol:             String(data[i][7] || 'user')
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
      deuda:  Number(data[i][2]) || 0,
      limite: Number(data[i][3]) || 0,
      activo: (data[i][5] === true || data[i][5] === 'TRUE' || data[i][5] === 'true'),
      rol:    String(data[i][7] || 'user')
    });
  }
  return usuarios;
}

// ============================================================
// MUTATIONS
// ============================================================
function actualizarDeuda(correo, monto) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s  = ss.getSheetByName(CONFIG.HOJAS.USUARIOS);
  const data = s.getDataRange().getValues();
  const c = String(correo).toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === c) {
      const deudaActual = Number(data[i][2]) || 0;
      const nueva = +(deudaActual + monto).toFixed(2);
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
    'user'
  ]);
  _log('USER_ADD', CONFIG.ADMIN_EMAIL, 'Usuario agregado: ' + correo);
  _invalidarCache();
  return { ok: true };
}

function liquidarDeuda(correo, metodo, notas) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sUsr = ss.getSheetByName(CONFIG.HOJAS.USUARIOS);
  const data = sUsr.getDataRange().getValues();
  const c = String(correo).toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === c) {
      const deudaPrev = Number(data[i][2]) || 0;
      sUsr.getRange(i + 1, 3).setValue(0);            // Deuda_Acumulada = 0
      sUsr.getRange(i + 1, 5).setValue(new Date());   // Ultimo_Corte_Pagado = hoy

      // Marcar cortes pendientes de ese usuario como pagados
      const sCortes = ss.getSheetByName(CONFIG.HOJAS.CORTES);
      const cortesData = sCortes.getDataRange().getValues();
      for (let j = 1; j < cortesData.length; j++) {
        if (String(cortesData[j][3]).toLowerCase().trim() === c &&
            !(cortesData[j][5] === true || cortesData[j][5] === 'TRUE')) {
          sCortes.getRange(j + 1, 6).setValue(true);
          sCortes.getRange(j + 1, 7).setValue(new Date());
          sCortes.getRange(j + 1, 8).setValue(metodo || '');
          sCortes.getRange(j + 1, 9).setValue(notas || '');
        }
      }

      _log('LIQUIDACION', correo, 'Liquidado $' + deudaPrev + ' via ' + (metodo || 'sin especificar'));
      _invalidarCache();
      return { ok: true, deudaLiquidada: deudaPrev };
    }
  }
  return { ok: false, error: 'Usuario no encontrado' };
}

// ============================================================
// CORTE QUINCENAL
// ============================================================
function generarCorte() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usuarios = listarUsuarios();
  const sCortes  = ss.getSheetByName(CONFIG.HOJAS.CORTES);

  const hoy = new Date();
  const stamp = hoy.getTime();
  const filasCorte = [];
  let totalCorte = 0;
  let usuariosConDeuda = 0;

  usuarios.forEach((u, idx) => {
    if (u.deuda <= 0 || !u.activo) return;
    const idCorte = 'C' + stamp + '-' + idx;
    filasCorte.push([
      idCorte,
      '',           // Fecha_Inicio (se podria calcular como Ultimo_Corte_Pagado del usuario)
      hoy,          // Fecha_Fin
      u.correo,
      u.deuda,
      false,        // Pagado
      '',           // Fecha_Pago
      '',           // Metodo_Pago
      ''            // Notas
    ]);
    totalCorte += u.deuda;
    usuariosConDeuda++;

    _marcarVentasConCorte(u.correo, idCorte);
  });

  if (filasCorte.length > 0) {
    sCortes.getRange(sCortes.getLastRow() + 1, 1, filasCorte.length, filasCorte[0].length).setValues(filasCorte);
  }

  _log('CORTE', CONFIG.ADMIN_EMAIL, 'Corte generado',
       JSON.stringify({ usuarios: usuariosConDeuda, total: totalCorte }));

  return { ok: true, usuarios: usuariosConDeuda, total: totalCorte, fecha: hoy };
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

// ============================================================
// MENUS
// ============================================================
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
    ? '✅ Usuario agregado:\n' + correo + '\nLimite: $' + limite
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
    u.nombre + '\nDeuda actual: $' + u.deudaAcumulada.toFixed(2) + '\n\n¿Confirmas que pagó completo?',
    ui.ButtonSet.YES_NO
  );
  if (conf !== ui.Button.YES) return;

  const r2 = ui.prompt('Liquidar deuda (2/2)', 'Metodo (efectivo / transferencia / otro):', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const metodo = r2.getResponseText().trim() || 'efectivo';

  const res = liquidarDeuda(correo, metodo, '');
  ui.alert(res.ok
    ? '✅ Liquidado $' + res.deudaLiquidada.toFixed(2)
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
           '\nTotal del corte: $' + res.total.toFixed(2));
}
