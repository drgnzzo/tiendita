/**
 * ============================================================
 *  Tiendita — Hojas de analisis
 * ============================================================
 *  Construye/reconstruye 4 hojas de analisis con formulas vivas
 *  ligadas a Productos, Ventas y Usuarios:
 *
 *    • RESUMEN        — vista por producto: precio, stock, ventas, margen
 *    • Por Sabor      — ranking por SKU con porcentajes y ranking $
 *    • Por Categoria  — totales por categoria (Bebidas, Dulces, ...)
 *    • Top Clientes   — mejores compradores vs su deuda actual
 *
 *  COMO USAR
 *  ─────────
 *  1) En el editor de Apps Script, pega este archivo como NUEVO archivo
 *     (boton + junto a "Archivos" → Script). NO toques Code.gs.
 *  2) Guarda.
 *  3) En el dropdown de funciones (arriba), selecciona "crearHojasAnalisis".
 *  4) Click "Ejecutar". Te va a pedir permisos la primera vez → aceptas.
 *
 *  Es SEGURO re-ejecutar. Solo reescribe estas 4 hojas. No toca Productos,
 *  Ventas, Usuarios, Cortes, Sugerencias, Logs, Config ni ZORRO ABARROTERO.
 *
 *  Version: 1.0.0
 * ============================================================
 */

const ANALISIS_FILAS_PROD = 25;    // filas reservadas para productos (creceran solas)
const ANALISIS_FILAS_USR  = 30;    // filas reservadas para usuarios
const ANALISIS_VENTAS_MAX = 5000;  // rango maximo de ventas para SUMPRODUCT/VLOOKUP

const ANALISIS_COLOR = {
  HEADER_BG: '#0F172A',
  HEADER_FG: '#FFFFFF',
  TOTAL_BG:  '#FEF3C7',
  TOTAL_FG:  '#92400E',
  ACCENT_FG: '#6B0F2A',
  SUB_FG:    '#6B7280',
  HEAT_LO:   '#FFF1F4',
  HEAT_HI:   '#E62027'
};

const ANALISIS_FMT_MONEY = '"$"#,##0.00;[Red]"-$"#,##0.00;"-"';
const ANALISIS_FMT_INT   = '#,##0;[Red]-#,##0;"-"';
const ANALISIS_FMT_PCT   = '0.0%;-0.0%;"-"';
const ANALISIS_FMT_RANK  = '0;;"-"';


/**
 * PUNTO DE ENTRADA. Esto es lo que ejecutas desde el editor.
 */
function crearHojasAnalisis() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  _construirResumen(ss);
  _construirPorSabor(ss);
  _construirPorCategoria(ss);
  _construirTopClientes(ss);

  try {
    SpreadsheetApp.getUi().alert(
      '✅ Hojas de analisis listas',
      'Se generaron/actualizaron 4 hojas:\n' +
      '  • RESUMEN\n' +
      '  • Por Sabor\n' +
      '  • Por Categoria\n' +
      '  • Top Clientes\n\n' +
      'Todo con formulas vivas — cuando registres ventas o cambies productos, ' +
      'las hojas se recalculan solas.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (_) {
    // Sin UI (ejecucion programada): no pasa nada
  }
}


// ============================================================
// RESUMEN — vista comprehensiva por producto
// ============================================================
function _construirResumen(ss) {
  const sh = _obtenerHojaLimpia(ss, 'RESUMEN');

  _ponerTitulo(sh, '📊 Resumen por producto',
    'Datos vivos. Edita Productos o registra Ventas y RESUMEN se recalcula solo.',
    10);

  const headers = ['Producto', 'SKU', 'Categoria', 'Precio', 'Stock',
                   'Unidades vend.', 'Ingresos', 'Costo unit.',
                   'Margen unit.', 'Ganancia'];
  sh.getRange(4, 1, 1, headers.length).setValues([headers]);
  _formatoHeader(sh, 4, headers.length);

  // Filas de productos (referencian Productos!Bx, Cx, etc.)
  // La clave para SUMIF es el SKU (col D en Ventas) — evita problemas de typos
  // que tenia el RESUMEN viejo ("Mazapan Gigante " con espacio, etc.)
  const formulas = [];
  for (let k = 0; k < ANALISIS_FILAS_PROD; k++) {
    const pRow = 2 + k;
    const outRow = 5 + k;
    const cond = 'Productos!A' + pRow + '=""';
    formulas.push([
      '=IF(' + cond + ',"",Productos!B' + pRow + ')',
      '=IF(' + cond + ',"",Productos!A' + pRow + ')',
      '=IF(' + cond + ',"",Productos!C' + pRow + ')',
      '=IF(' + cond + ',"",Productos!E' + pRow + ')',
      '=IF(' + cond + ',"",Productos!F' + pRow + ')',
      '=IF(' + cond + ',"",SUMIF(Ventas!D:D,Productos!A' + pRow + ',Ventas!F:F))',
      '=IF(' + cond + ',"",SUMIF(Ventas!D:D,Productos!A' + pRow + ',Ventas!H:H))',
      '=IF(' + cond + ',"",Productos!D' + pRow + ')',
      '=IF(' + cond + ',"",Productos!E' + pRow + '-Productos!D' + pRow + ')',
      '=IF(' + cond + ',"",F' + outRow + '*I' + outRow + ')'
    ]);
  }
  sh.getRange(5, 1, ANALISIS_FILAS_PROD, headers.length).setFormulas(formulas);

  // Fila de totales
  const totRow = 5 + ANALISIS_FILAS_PROD;
  sh.getRange(totRow, 1).setValue('TOTAL');
  sh.getRange(totRow, 6).setFormula('=SUM(F5:F' + (totRow - 1) + ')');
  sh.getRange(totRow, 7).setFormula('=SUM(G5:G' + (totRow - 1) + ')');
  sh.getRange(totRow, 10).setFormula('=SUM(J5:J' + (totRow - 1) + ')');
  _formatoTotales(sh, totRow, headers.length);

  // Formatos numericos
  sh.getRange(5, 4, ANALISIS_FILAS_PROD + 1, 1).setNumberFormat(ANALISIS_FMT_MONEY); // Precio
  sh.getRange(5, 5, ANALISIS_FILAS_PROD + 1, 1).setNumberFormat(ANALISIS_FMT_INT);   // Stock
  sh.getRange(5, 6, ANALISIS_FILAS_PROD + 1, 1).setNumberFormat(ANALISIS_FMT_INT);   // Uds
  sh.getRange(5, 7, ANALISIS_FILAS_PROD + 1, 1).setNumberFormat(ANALISIS_FMT_MONEY); // Ingresos
  sh.getRange(5, 8, ANALISIS_FILAS_PROD + 1, 1).setNumberFormat(ANALISIS_FMT_MONEY); // Costo
  sh.getRange(5, 9, ANALISIS_FILAS_PROD + 1, 1).setNumberFormat(ANALISIS_FMT_MONEY); // Margen
  sh.getRange(5, 10, ANALISIS_FILAS_PROD + 1, 1).setNumberFormat(ANALISIS_FMT_MONEY);// Ganancia

  _setAnchos(sh, [260, 90, 100, 90, 80, 110, 110, 100, 100, 110]);
  sh.setFrozenRows(4);

  // Mapa de calor (rojo = mas ventas)
  _heatmap(sh, 'F5:F' + (totRow - 1));
  _heatmap(sh, 'G5:G' + (totRow - 1));
}


// ============================================================
// Por Sabor — ranking por SKU (sirve para variantes/sabores)
// ============================================================
function _construirPorSabor(ss) {
  const sh = _obtenerHojaLimpia(ss, 'Por Sabor');

  _ponerTitulo(sh, '🍬 Ranking por sabor / variante',
    'Cada SKU se ranquea individualmente. Cuando agregues sabores del mismo ' +
    'producto en Productos (por ejemplo BNG-MAN y BNG-FRE), aparecen aqui ' +
    'ordenados por sus propias ventas.',
    8);

  const headers = ['Producto', 'SKU', 'Categoria', 'Unidades',
                   'Ingresos', '% Unid.', '% Ingr.', 'Ranking $'];
  sh.getRange(4, 1, 1, headers.length).setValues([headers]);
  _formatoHeader(sh, 4, headers.length);

  const totRow = 5 + ANALISIS_FILAS_PROD;
  const formulas = [];
  for (let k = 0; k < ANALISIS_FILAS_PROD; k++) {
    const pRow = 2 + k;
    const outRow = 5 + k;
    const cond = 'Productos!A' + pRow + '=""';
    formulas.push([
      '=IF(' + cond + ',"",Productos!B' + pRow + ')',
      '=IF(' + cond + ',"",Productos!A' + pRow + ')',
      '=IF(' + cond + ',"",Productos!C' + pRow + ')',
      '=IF(' + cond + ',"",SUMIF(Ventas!D:D,Productos!A' + pRow + ',Ventas!F:F))',
      '=IF(' + cond + ',"",SUMIF(Ventas!D:D,Productos!A' + pRow + ',Ventas!H:H))',
      '=IF(OR(' + cond + ',$D$' + totRow + '=0),"",D' + outRow + '/$D$' + totRow + ')',
      '=IF(OR(' + cond + ',$E$' + totRow + '=0),"",E' + outRow + '/$E$' + totRow + ')',
      '=IF(OR(' + cond + ',E' + outRow + '=0,E' + outRow + '=""),"",' +
        'RANK(E' + outRow + ',$E$5:$E$' + (totRow - 1) + ',0))'
    ]);
  }
  sh.getRange(5, 1, ANALISIS_FILAS_PROD, headers.length).setFormulas(formulas);

  // Totales (necesarios para los porcentajes)
  sh.getRange(totRow, 1).setValue('TOTAL');
  sh.getRange(totRow, 4).setFormula('=SUM(D5:D' + (totRow - 1) + ')');
  sh.getRange(totRow, 5).setFormula('=SUM(E5:E' + (totRow - 1) + ')');
  _formatoTotales(sh, totRow, headers.length);

  sh.getRange(5, 4, ANALISIS_FILAS_PROD + 1, 1).setNumberFormat(ANALISIS_FMT_INT);
  sh.getRange(5, 5, ANALISIS_FILAS_PROD + 1, 1).setNumberFormat(ANALISIS_FMT_MONEY);
  sh.getRange(5, 6, ANALISIS_FILAS_PROD, 1).setNumberFormat(ANALISIS_FMT_PCT);
  sh.getRange(5, 7, ANALISIS_FILAS_PROD, 1).setNumberFormat(ANALISIS_FMT_PCT);
  sh.getRange(5, 8, ANALISIS_FILAS_PROD, 1).setNumberFormat(ANALISIS_FMT_RANK);

  _setAnchos(sh, [260, 90, 100, 100, 110, 80, 80, 100]);
  sh.setFrozenRows(4);
  _heatmap(sh, 'E5:E' + (totRow - 1));
}


// ============================================================
// Por Categoria — Bebidas/Dulces/Helados/Snacks/Sopas
// ============================================================
function _construirPorCategoria(ss) {
  const sh = _obtenerHojaLimpia(ss, 'Por Categoria');

  _ponerTitulo(sh, '🍿 Ventas por categoria',
    'Cruza el SKU de cada venta contra la categoria registrada en Productos. ' +
    'Para agregar una categoria nueva (ej. "Galletas"), copia una fila y cambia el nombre.',
    5);

  const headers = ['Categoria', 'Productos', 'Unidades', 'Ingresos', '% Ingr.'];
  sh.getRange(4, 1, 1, headers.length).setValues([headers]);
  _formatoHeader(sh, 4, headers.length);

  const cats = ['Bebidas', 'Dulces', 'Helados', 'Snacks', 'Sopas'];
  const vMax = ANALISIS_VENTAS_MAX;
  const filas = [];
  for (let i = 0; i < cats.length; i++) {
    const outRow = 5 + i;
    filas.push([
      cats[i],
      '=COUNTIF(Productos!C2:C30,A' + outRow + ')',
      '=SUMPRODUCT((IFERROR(VLOOKUP(Ventas!D2:D' + vMax + ',Productos!A:C,3,FALSE),"")=A' + outRow + ')*Ventas!F2:F' + vMax + ')',
      '=SUMPRODUCT((IFERROR(VLOOKUP(Ventas!D2:D' + vMax + ',Productos!A:C,3,FALSE),"")=A' + outRow + ')*Ventas!H2:H' + vMax + ')',
      ''
    ]);
  }
  sh.getRange(5, 1, cats.length, headers.length).setValues(filas);

  const lastCat = 4 + cats.length;
  const totRow = lastCat + 1;
  sh.getRange(totRow, 1).setValue('TOTAL');
  sh.getRange(totRow, 2).setFormula('=SUM(B5:B' + lastCat + ')');
  sh.getRange(totRow, 3).setFormula('=SUM(C5:C' + lastCat + ')');
  sh.getRange(totRow, 4).setFormula('=SUM(D5:D' + lastCat + ')');

  for (let i = 0; i < cats.length; i++) {
    const outRow = 5 + i;
    sh.getRange(outRow, 5).setFormula(
      '=IF($D$' + totRow + '=0,"",D' + outRow + '/$D$' + totRow + ')'
    );
  }
  _formatoTotales(sh, totRow, headers.length);

  sh.getRange(5, 2, cats.length + 1, 1).setNumberFormat(ANALISIS_FMT_INT);
  sh.getRange(5, 3, cats.length + 1, 1).setNumberFormat(ANALISIS_FMT_INT);
  sh.getRange(5, 4, cats.length + 1, 1).setNumberFormat(ANALISIS_FMT_MONEY);
  sh.getRange(5, 5, cats.length, 1).setNumberFormat(ANALISIS_FMT_PCT);

  _setAnchos(sh, [170, 90, 90, 110, 80]);
  sh.setFrozenRows(4);
  _heatmap(sh, 'D5:D' + lastCat);
}


// ============================================================
// Top Clientes — mejores compradores con su deuda actual
// ============================================================
function _construirTopClientes(ss) {
  const sh = _obtenerHojaLimpia(ss, 'Top Clientes');

  _ponerTitulo(sh, '👥 Top clientes',
    'Compras totales por persona contra su deuda actual. ' +
    'Lee directo de Usuarios y Ventas.',
    7);

  const headers = ['Nombre', 'Correo', 'Compras', 'Unidades',
                   'Total gastado', 'Deuda actual', 'Ranking $'];
  sh.getRange(4, 1, 1, headers.length).setValues([headers]);
  _formatoHeader(sh, 4, headers.length);

  const totRow = 5 + ANALISIS_FILAS_USR;
  const formulas = [];
  for (let k = 0; k < ANALISIS_FILAS_USR; k++) {
    const uRow = 2 + k;
    const outRow = 5 + k;
    const cond = 'Usuarios!A' + uRow + '=""';
    formulas.push([
      '=IF(' + cond + ',"",Usuarios!B' + uRow + ')',
      '=IF(' + cond + ',"",Usuarios!A' + uRow + ')',
      '=IF(' + cond + ',"",COUNTIF(Ventas!C:C,Usuarios!A' + uRow + '))',
      '=IF(' + cond + ',"",SUMIF(Ventas!C:C,Usuarios!A' + uRow + ',Ventas!F:F))',
      '=IF(' + cond + ',"",SUMIF(Ventas!C:C,Usuarios!A' + uRow + ',Ventas!H:H))',
      '=IF(' + cond + ',"",IF(Usuarios!C' + uRow + '="",0,Usuarios!C' + uRow + '))',
      '=IF(OR(' + cond + ',E' + outRow + '=0,E' + outRow + '=""),"",' +
        'RANK(E' + outRow + ',$E$5:$E$' + (totRow - 1) + ',0))'
    ]);
  }
  sh.getRange(5, 1, ANALISIS_FILAS_USR, headers.length).setFormulas(formulas);

  sh.getRange(totRow, 1).setValue('TOTAL');
  sh.getRange(totRow, 3).setFormula('=SUM(C5:C' + (totRow - 1) + ')');
  sh.getRange(totRow, 4).setFormula('=SUM(D5:D' + (totRow - 1) + ')');
  sh.getRange(totRow, 5).setFormula('=SUM(E5:E' + (totRow - 1) + ')');
  sh.getRange(totRow, 6).setFormula('=SUM(F5:F' + (totRow - 1) + ')');
  _formatoTotales(sh, totRow, headers.length);

  sh.getRange(5, 3, ANALISIS_FILAS_USR + 1, 1).setNumberFormat(ANALISIS_FMT_INT);
  sh.getRange(5, 4, ANALISIS_FILAS_USR + 1, 1).setNumberFormat(ANALISIS_FMT_INT);
  sh.getRange(5, 5, ANALISIS_FILAS_USR + 1, 1).setNumberFormat(ANALISIS_FMT_MONEY);
  sh.getRange(5, 6, ANALISIS_FILAS_USR + 1, 1).setNumberFormat(ANALISIS_FMT_MONEY);
  sh.getRange(5, 7, ANALISIS_FILAS_USR, 1).setNumberFormat(ANALISIS_FMT_RANK);

  _setAnchos(sh, [160, 280, 90, 90, 120, 110, 100]);
  sh.setFrozenRows(4);
  _heatmap(sh, 'E5:E' + (totRow - 1));
}


// ============================================================
// HELPERS de construccion y formato
// ============================================================

function _obtenerHojaLimpia(ss, nombre) {
  let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
  } else {
    sh.clear();
    sh.clearConditionalFormatRules();
  }
  return sh;
}

function _ponerTitulo(sh, titulo, subtitulo, cols) {
  sh.getRange(1, 1).setValue(titulo)
    .setFontSize(14).setFontWeight('bold').setFontColor(ANALISIS_COLOR.ACCENT_FG);
  sh.getRange(1, 1, 1, cols).merge();

  sh.getRange(2, 1).setValue(subtitulo)
    .setFontSize(9).setFontStyle('italic').setFontColor(ANALISIS_COLOR.SUB_FG)
    .setWrap(true);
  sh.getRange(2, 1, 1, cols).merge();

  sh.setRowHeight(1, 26);
  sh.setRowHeight(2, 28);
}

function _formatoHeader(sh, row, cols) {
  sh.getRange(row, 1, 1, cols)
    .setBackground(ANALISIS_COLOR.HEADER_BG)
    .setFontColor(ANALISIS_COLOR.HEADER_FG)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
}

function _formatoTotales(sh, row, cols) {
  sh.getRange(row, 1, 1, cols)
    .setBackground(ANALISIS_COLOR.TOTAL_BG)
    .setFontColor(ANALISIS_COLOR.TOTAL_FG)
    .setFontWeight('bold');
}

function _setAnchos(sh, anchos) {
  for (let i = 0; i < anchos.length; i++) {
    sh.setColumnWidth(i + 1, anchos[i]);
  }
}

function _heatmap(sh, a1Range) {
  const range = sh.getRange(a1Range);
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpoint(ANALISIS_COLOR.HEAT_LO)
    .setGradientMaxpoint(ANALISIS_COLOR.HEAT_HI)
    .setRanges([range])
    .build();
  const rules = sh.getConditionalFormatRules();
  rules.push(rule);
  sh.setConditionalFormatRules(rules);
}