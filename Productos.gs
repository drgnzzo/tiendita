/**
 * PRODUCTOS - catalogo, stock
 */

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
      sku:           String(r[0]),
      nombre:        String(r[1]),
      categoria:     String(r[2] || ''),
      costo:         Number(r[3]) || 0,
      precio:        Number(r[4]) || 0,
      stock:         Number(r[5]) || 0,
      stockMinimo:   Number(r[6]) || 0,
      codigoBarras:  String(r[7] || ''),
      imagenUrl:     String(r[8] || ''),
      disponible:    (Number(r[5]) || 0) > 0
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
        costo:        Number(data[i][3]) || 0,
        precio:       Number(data[i][4]) || 0,
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

function decrementarStock(sku, cantidad) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s  = ss.getSheetByName(CONFIG.HOJAS.PRODUCTOS);
  const data = s.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(sku)) {
      const stockActual = Number(data[i][5]) || 0;
      const nuevoStock  = Math.max(0, stockActual - Number(cantidad));
      s.getRange(i + 1, 6).setValue(nuevoStock);
      return nuevoStock;
    }
  }
  return null;
}

function productosStockBajo() {
  const productos = listarProductos();
  return productos.filter(p => p.stock <= p.stockMinimo);
}

// ============================================================
// MENU: stock bajo
// ============================================================
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
