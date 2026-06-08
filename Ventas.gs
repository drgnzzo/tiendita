/**
 * VENTAS - registro de compra con LockService.
 * El lock evita race conditions en el stock cuando varios usuarios
 * confirman compra al mismo segundo.
 */

function registrarCompra(correo, items) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // espera hasta 10s
  } catch (e) {
    return { ok: false, error: 'Sistema ocupado, intenta de nuevo en un momento.' };
  }

  try {
    // Re-leer (sin cache) porque otra compra reciente pudo cambiar stock o deuda.
    _invalidarCache();

    const usuario = obtenerUsuario(correo);
    if (!usuario)        return { ok: false, error: 'Usuario no autorizado' };
    if (!usuario.activo) return { ok: false, error: 'Cuenta desactivada' };

    // 1. Validar items y construir resumen
    const resumen = [];
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const sku = it.sku || it.SKU;
      const cantidad = Math.max(1, parseInt(it.cantidad || it.qty || 1, 10));
      const prod = obtenerProducto(sku);
      if (!prod)                    return { ok: false, error: 'Producto no existe: ' + sku };
      if (!prod.activo)             return { ok: false, error: 'Producto no disponible: ' + prod.nombre };
      if (prod.stock < cantidad)    return { ok: false, error: 'Stock insuficiente de ' + prod.nombre + ' (quedan ' + prod.stock + ')' };
      const monto = +(prod.precio * cantidad).toFixed(2);
      resumen.push({ sku: prod.sku, nombre: prod.nombre, precio: prod.precio, cantidad: cantidad, monto: monto });
      total += monto;
    }
    total = +total.toFixed(2);

    // 2. Validar limite de credito
    const nuevaDeuda = +(usuario.deudaAcumulada + total).toFixed(2);
    if (nuevaDeuda > usuario.limiteCredito) {
      return {
        ok: false,
        error: 'Esta compra excede tu limite de credito ($' + usuario.limiteCredito.toFixed(2) + ').\n' +
               'Deuda actual: $' + usuario.deudaAcumulada.toFixed(2) + '\n' +
               'Esta compra: $' + total.toFixed(2) + '\n\n' +
               'Liquida tu cuenta para poder seguir comprando.'
      };
    }

    // 3. Registrar ventas en batch + decrementar stock
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const sVentas = ss.getSheetByName(CONFIG.HOJAS.VENTAS);
    const ts      = new Date();
    const stamp   = ts.getTime();
    const filas   = [];
    for (let i = 0; i < resumen.length; i++) {
      const r = resumen[i];
      const idVenta = 'V' + stamp + '-' + i;
      filas.push([idVenta, ts, correo, r.sku, r.nombre, r.cantidad, r.precio, r.monto, '', 'Pendiente']);
      decrementarStock(r.sku, r.cantidad);
    }
    sVentas.getRange(sVentas.getLastRow() + 1, 1, filas.length, filas[0].length).setValues(filas);

    // 4. Actualizar deuda
    actualizarDeuda(correo, total);

    _log('COMPRA', correo, 'Compra registrada por $' + total, JSON.stringify(resumen));
    _invalidarCache();

    return {
      ok: true,
      total:       total,
      items:       resumen,
      deudaNueva:  nuevaDeuda,
      limite:      usuario.limiteCredito,
      mensaje:     'Compra registrada. Tu deuda quedó en $' + nuevaDeuda.toFixed(2) + '.'
    };

  } finally {
    lock.releaseLock();
  }
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
        sku:       String(data[i][3]),
        producto:  String(data[i][4]),
        cantidad:  Number(data[i][5]) || 0,
        precio:    Number(data[i][6]) || 0,
        monto:     Number(data[i][7]) || 0,
        idCorte:   String(data[i][8] || ''),
        estatus:   String(data[i][9] || '')
      });
    }
  }
  return ventas;
}
