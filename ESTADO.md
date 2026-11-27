# Estado — Tiendita v2

## Decisión (2026-11-21)
- **Sin PIN para nadie.** La web es solo tienda: todos entran con su correo y cuentan como clientes; nadie cambia inventario ni cobros desde la web.
- El trabajo diario (entradas, ajustes, conteo, cobros) se hace **en la hoja de Google**: menú TIENDITA > Trabajo diario. La seguridad es la de Google (solo quien tenga acceso a la hoja).
- Bandera `WEB_SOLO_TIENDA` en `apps-script/Código.gs` (true). Si algún día se quiere panel web con PIN: ponerla en false.

## Hecho
- Backend v2.1: libro de Movimientos, Pagos, cortes, modo tienda, hojas de trabajo (Entradas, Ajustes, Conteo, Cobros). 71 pruebas pasan; 2 pruebas de navegador (modo con panel y modo tienda) pasan. Simulador, no Apps Script real.
- GitHub: commit "Tiendita v2" subido (docs, apps-script, bats). Falta subir el cambio de modo tienda.

## Pendiente (lo hace el usuario, en orden)
1. Copiar los archivos del zip a `C:\Proyectos\Tiendita`, commit + push en GitHub Desktop, y doble clic a `TIENDITA.bat` (sube a Apps Script).
2. En la hoja: recargar; menú TIENDITA > Configuración inicial v2 (una vez); luego Trabajo diario > Preparar las hojas de trabajo si no se crearon.
3. Apps Script > Implementar > Nueva implementación (Aplicación web, Yo, Cualquier persona); copiar URL /exec.
4. Pegar la URL en `docs\js\config.js`; commit + push; `TIENDITA.bat`.
5. GitHub > Settings > Pages > main, carpeta /docs. (Regreso: carpeta / root.)
6. Conteo físico: hoja Conteo (Preparar CONTEO, llenar Contaste, Aplicar CONTEO).

## No probado
Apps Script real (menús, listas desplegables, Session), GitHub Pages.

## Admin web (2026-11-21)
- Usuario especial admin@tiendita.com con contraseña (mín. 8). Se pone en el Sheet: TIENDITA > Usuarios > Contraseña del admin web. Solo se guarda el hash.
- En la web, los demás (incluidos Victor y Samantha) siguen entrando solo con correo y cuentan como clientes.
- Pendiente: revisar el panel admin en el navegador con la URL real.

## Auditoría (2026-11-22)
- La tienda de los clientes es la de siempre (docs/: index, catalogo, perfil). El panel nuevo vive en docs/admin/ y se entra desde el mismo login con admin@tiendita.com.
- Probado con navegador simulado en móvil 390, tablet 820 y escritorio 1280: login, catálogo, compra, perfil, admin y sus 5 pestañas. Sin desbordes ni errores.
- Corregido: el catálogo público ya no muestra el costo; el logo pesaba 983 KB y ahora se usa el de 62 KB; se quitaron los archivos viejos duplicados de la raíz y el `_headers` de Cloudflare.
- Conocido: el perfil se pide solo con el correo (como siempre). Falta probar en vivo con Apps Script real.

## Panel admin ampliado (2026-11-22)
- Formularios más anchos y en columnas; el panel usa el ancho de la pantalla (header y contenido alineados).
- Producto nuevo desde el panel con "piezas que tienes ahora" (queda como ENTRADA en Movimientos). Botón también en Resumen, Inventario y dentro de Registrar compra.
- Anotar venta a un cliente (venta.admin) en Resumen y Cobros.
- Pestaña Reportes: mes, ventas, ganancia estimada, cobrado, por cobrar, ventas por día, top productos y top clientes (reporte.mes).
- El catálogo de clientes no muestra lo agotado ni el costo.
- _config.bat: TND_AUTO_DEPLOY=1 (el BAT actualiza la implementación; la cuenta de clasp es a.r.c.caos y ya está autorizada). Si la URL da 403, el BAT lo avisa.
- Falta: deshacer una venta por error, exportar el reporte, foto de producto desde el panel.

## Existencia y compras (panel admin)
- Productos e Inventario: botones "+ Sumar" (registrar compra) y "Quitar / ajustar" (quitar, agregar o dejar en número exacto; funciona con stock 0).
- Reportes: sección "Compras al proveedor" (gastado, piezas, por proveedor, cada compra, vendido menos comprado). Registrar compra suma las piezas al producto.
- Pendiente: correr TIENDITA.bat para publicar; probar en Chrome con datos reales.

## Regreso a la Tiendita de siempre (22/11)
- Todas las páginas fuerzan tema claro (`color-scheme: only light`): el navegador de Samantha las oscurecía y se veían rojo oscuro.
- Panel (/admin/): ya no tiene Tienda ni Cuenta propias; enlaza a catalogo.html y perfil.html originales. Un solo login (index.html). Pestañas: Resumen, Productos (inventario + editar), Cobros, Reportes, Usuarios.
- Formularios abren al instante (lista de productos en memoria). Panel a todo el ancho.
- La oscuridad que se veía venía de la extensión Dark Reader del navegador de Samantha (fondo #181a1b). Se agregó `<meta name="darkreader-lock">` en todas las páginas; si aún se ve oscuro, desactivar Dark Reader para drgnzzo.github.io.
- Panel rediseñado con contraste de tienda (bloques sólidos rosa/rojo/vino, títulos grandes). Pestañas: Resumen, Productos, Cobros, Reportes (+ Usuarios aparte). Lista de compras y movimientos pasaron a Reportes. Sin chips de filtro.
- Revisión con las skills de diseño (Tidwell, Johnson, Lupton, Müller-Brockmann, Pickering): estado del stock con palabra (Agotado / Quedan pocas), letra mínima 13 px, retícula de 8 px, títulos de sección sin fuente de exhibición. Auditoría estática de Apps Script: se corrigió escritura al final de Ventas y Movimientos sin asegurar filas (escrAsegurarFilas_). Pendiente de purgar (no se borró): _mismoDiaMx, inicializarBD, crearHojasAnalisis.

## Tema suave (contraste de fondos)
- Sin blanco puro: fondo #F4E1E6, tarjetas #FBEFF2; tienda original con tokens suaves (--blanco #FDF3F5). Un solo rojo (#C8151D) para acción principal, vino #5E0F24 para estructura.
- Botones en 3 niveles: rojo sólido / fondo rosa + vino / enlace. Bordes de campo 4.2:1. Cachés: app.css v10, styles.css v13, sw v19.
- Catálogo: tarjetas con más aire (112px icono, separador, nombre en 2 líneas fijo); icono por nombre del producto (coca→🥤, mazapán→🥜, sopa→🍜…) y foto si la columna Imagen_URL trae enlace https. styles.css v14, sw v20.
- Panel = mismo estilo que la tienda (header degradado, chips, tarjetas con borde negro, botones en pastilla, Archivo Black/Caveat/Inter). Menú "Panel" ahora aparece también en catálogo y perfil para admin (app.js). app.css v11, main.js v6, app.js v13, sw v21.
- Panel: CSS reescrito desde cero (una sola hoja, contenedor 1200px centrado, retícula de 8px, filas/tarjetas/botones/ventanas uniformes, celular con menú abajo). Resumen limita listas a 6 con "Ver todo". Cobros: botón "+ Anotar" por cliente (abrirVenta con cliente preseleccionado y total en vivo). app.css v12, views-admin v6.
- Orden único: productos por sección (Sopas→Snacks→Dulces→Helados→Bebidas→otras A-Z) y de la A a la Z; personas A-Z; deudas de mayor a menor; movimientos/pagos recientes primero. Catálogo sin botones de filtro (secciones con título y conteo). Panel en modo más oscuro (malva/vino); tarjetas hermanas a la misma altura; efectos sutiles (aurora, destellos, brillo en cabecera/botones, hover con luz). styles.css v15, app.css v13, views-admin v7, sw v22.

## Paleta "Dulcería de noche" (A + C)
- Paleta final: solo rosa, rojo y vino (sin morado). Tienda crema + rosa + vino; panel vino oscuro con acentos rosa. Sin ciruela/lila.
- Contraste revisado (texto >= 4.5, bordes >= 3.3). Correos largos en móvil ya no se encimen.

## Auditoría (corte de inventario) y móvil
- Pestaña "Auditoría" (solo admin): se cuenta todo, el stock queda igual a lo contado y se guardan hojas `Cortes_Inventario` (resumen) y `Corte_Detalle` (había/hay por producto). Lo que faltó se cobra a una persona (suma a su deuda al precio de venta) o lo absorbe la tienda. API: corte.cerrar / corte.lista / corte.detalle / corte.asignar. 5 pruebas nuevas.
- Móvil: pestañas en una fila deslizable, botones secundarios de cada fila pasan al menú ⋯, filas más compactas, roles plegados.
- Se subió la versión de views-admin.js que sí trae el orden por secciones (la de la carpeta estaba vieja).
- Pendiente: publicar con TIENDITA.bat (clasp push para las funciones nuevas del Sheet) y probar con datos reales.

## Auditoría móvil (cierre de versión)
- Revisión automática a 360/390/430/768 px: botones de al menos 44px, campos con letra de 16px (sin zoom en iPhone), nada fuera de pantalla, botón del chat movido a la izquierda para no tapar "Llevar".
- Pendiente para la siguiente versión: probar en celular real, fotos de productos, deshacer venta, recordatorios por WhatsApp, exportar reportes, lo más pedido.

## Revisión tras publicar (22/11 18:38)
- Hallazgo: el panel publicado no traía la pestaña Auditoría (views-admin.js viejo). Corregido y con versión nueva (views-admin v9, sw v27); hace falta correr TIENDITA.bat otra vez.
- Sheet sin errores en Logs. Las hojas Cortes_Inventario y Corte_Detalle se crean al hacer el primer corte.

## Paleta "Perla y rosa empolvado" (22/11 19:30)
- Blancos con tinte rosado (perla #F8ECEE), rosa empolvado #C98A9B en bordes y botones secundarios, bruma vino en el fondo del panel, un solo foco durazno #F7B29A (p. ej. "Por cobrar"), destellos azul hielo #EAF6FF en el brillo. Sigue sin morado. styles v19, app.css v18, sw v28.

## Estilos de color: Perla y Diamante (22-nov)
- Botón "Color" (toggle directo Perla↔Diamante, sin menú; sw v30) arriba en login, catálogo, Mi cuenta y panel admin (docs/tema.js). Elige Perla (rosa y vino) o Diamante (azul acero y marino, inspirado en Dialga).
- Preferencia guardada en el dispositivo (localStorage `tiendita.tema` y `tiendita.tema.u.<correo>`), no en el Sheet.
- Diamante se genera desde Perla: `python tools/generar_tema_diamante.py <carpeta>` -> styles-diamante.css y admin/css/app-diamante.css. Regenerar cada vez que cambie styles.css o app.css.
- Sin morado. SW tiendita-v29. Pruebas: 94 ok.

- Logo rehecho desde _orig_tmp/logo.png: aro completo y redondo (antes venia recortado). Archivos docs/logo-*.png y docs/admin/img/logo-*.png, refs con ?v=2, sw v31.

- Boton Color solo globo (sin texto). Contraste revisado en ambos estilos (script titles, saludo, corazon). sw v32.

- Panel Perla suavizado (menos magenta, fondo calido casi neutro, acentos cuarzo rosa/vino). sw v33.

- Catalogo escritorio: categorias en columnas, productos en fila compacta (sin scroll). Sin foto real: no se muestra icono ni emoji (solo nombre, stock, precio). sw v34.

## Reglas de orden aplicadas (22-nov)
- Gramatica: un nombre por cosa. "Corte" = cobros de la quincena; "Auditoria" = conteo de inventario. Saludo neutro ("Hola"), sin emojis ni corazones (iconos SVG en menus y asistente).
- Logica: Mi cuenta pone la deuda como protagonista; "Registrar compra" ya no se repite en Reportes (vive en Resumen y Productos).
- Retorica: subtitulos en letra normal y gris, no cursiva. SW v36.
- Pendiente (siguiente bloque): escala de 5 tamaños de letra, Reportes en secciones/pestanas, revisar Resumen vs Cobros (atajos duplicados).

- Catalogo sin foto: monograma con iniciales (sin emojis ni imagen generica). SW v37.

- Catalogo sin foto: dibujo de linea por categoria (sopas, snacks, dulces, bebidas, otro) en vez de iniciales. SW v38.

## Modo app en celular (23-nov)
- docs/app-movil.js (cargado en index, catalogo, perfil y admin): solo en pantallas tactiles; sin zoom (pellizco, doble toque), sin seleccion de texto ni menu al mantener presionado (los campos de escribir si). Viewport sin escala. En computadora no hace nada. SW v39. Pendiente: probar en celular real (iOS y Android).

## Codigos de barras (24-nov) - construido, APAGADO
- docs/escaner.js: lector por camara (BarcodeDetector en Android; lector propio EAN-13/EAN-8/UPC-A en iPhone; opcion de escribir el numero). Probado con filas sinteticas (60/60) y flujo en navegador.
- Interruptor: `var ACTIVO = false` al inicio de docs/escaner.js. En true el boton "Llevar" pasa a "Escanear": abre la camara y solo agrega al carrito si el codigo coincide con Codigo_Barras del producto. Producto sin codigo: avisa y no deja llevarlo.
- Panel admin ya tiene el campo "Codigo de barras" (nuevo/editar) y la hoja Productos la columna Codigo_Barras (H).
- Limite: la validacion es en la app, el servidor no exige el escaneo.
- Para encender: cargar todos los codigos, poner ACTIVO = true, subir escaner.js?v=2 y subir version de sw.js.

## Piezas existentes en "Editar producto" (25-nov, PC2)
- En el panel, al editar un producto hay un campo "Piezas existentes": se puede poner cualquier entero desde 0 (por ejemplo 0). Si cambia, el backend aplica la diferencia con `_moverStock` como **AJUSTE** (no es compra) y queda en Movimientos con "había N". El stock sigue siendo la suma de los movimientos.
- Backend (`apiProdGuardar`): recibe `stock` (nuevo) y `stockAntes` (lo que veía el panel). Valida entero 0 a 100000. Va dentro de `_idempotente` (reqId) y `_conCandado`. Si las piezas cambiaron mientras se editaba (venta o ajuste), responde `STOCK_CAMBIO` y no pisa nada. Si no se toca el campo, no se crea movimiento.
- Producto nuevo sigue igual ("Piezas que tienes ahora" = ENTRADA).
- Versiones: views-admin.js?v=11, main.js?v=12 (el panel no usa el SW). El service worker no cambió.
- 8 pruebas nuevas (a 0, subir, cuadra con Movimientos, negativos/decimales/texto, sin cambio, doble toque, cambio concurrente, sin sesión). Total: 102 pasan (simulador).
- Probado en Apps Script real (25-nov 11:25): dos ajustes quedaron como AJUSTE en Movimientos y Logs con usuario admin@tiendita.com.

## Escanear código en Editar producto + auditoría de dos sentidos (25-nov, PC2)
- Panel: en Editar/Nuevo producto, botón "Escanear con la cámara" pone el número leído en el campo Código de barras (o se escribe a mano en el lector). Usa `docs/escaner.js?v=2` (modo `alLeer`, ventana modal para quedar por encima del formulario). El modo de clientes (validar con `alAcertar`) sigue igual y sigue APAGADO (`ACTIVO = false`). Probado en navegador headless (Chromium): lee, rellena el campo y cierra; el lector queda por encima del modal. No probado con cámara real en Android/iPhone.
- Backend: un código de barras no se puede repetir en otro producto (`CODIGO_REPETIDO`; compara solo dígitos y sin ceros a la izquierda). 103 pruebas pasan.
- Versiones: views-admin.js?v=12, main.js?v=13, escaner.js?v=2 (solo el panel; catalogo.html y sw.js siguen con escaner.js?v=1, que quedó con el mismo código). Al prender el escáner de clientes, subir a ?v=3 en catalogo.html y sw.js como se acordó.
- Auditoría app <-> hoja:
  - Hoja -> app: bien. Cada llamada lee la hoja de nuevo (`_memoSS` solo dura una petición). El panel guarda la lista de productos en memoria hasta recargar o guardar; el ajuste de piezas manda `stockAntes` y el backend avisa si cambió.
  - App -> hoja: bien. Movimientos y Logs registran cada cambio (comprobado con datos reales).
  - Editar Productos a mano en la hoja: cambia el stock pero NO deja movimiento. Ejemplo real: MRC-CAM (Movimientos=4, Productos=8).
  - Movimientos empezó el 22-nov: 10 de 17 productos no tienen ningún movimiento (stock sin saldo inicial), así que "Verificar stock contra movimientos" marcará diferencias aunque no haya errores.
  - La hoja real no tiene las pestañas de trabajo (Entradas, Ajustes, Conteo, Cobros), ni Pagos, ni Cortes_Inventario/Corte_Detalle. Falta correr en la hoja: TIENDITA > Trabajo diario > Preparar las hojas de trabajo.
  - Logs sin errores. Los disparadores diarios (reporte y alerta de stock) corren.
- Propuestas pendientes de aprobación (tocan datos o comportamiento de la hoja): (1) saldo inicial: una fila por producto en Movimientos para que la suma cuadre con el stock actual; (2) registrar automáticamente en Movimientos lo que se edite a mano en la columna Stock de Productos (onEdit).

## Ediciones a mano y saldo inicial (25-nov, PC2)
- Nuevo `onEdit` (disparador simple, no se instala): si alguien cambia a mano la columna Stock de Productos, se anota un AJUSTE en Movimientos con la diferencia, el correo de quien editó y "había N". Pegar o rellenar varias celdas, o escribir texto, solo avisa en Logs (EDICION_MANUAL). Los cambios que hace la app no se anotan dos veces (onEdit no se activa con escrituras del script).
- Nuevo menú TIENDITA > Inventario > Saldo inicial (una vez): muestra la lista y, si se confirma, agrega una fila SALDO_INICIAL por producto para que la suma de Movimientos cuadre con el stock actual. No cambia ningún stock. Repetirlo no agrega nada.
- "Verificar stock" ahora comparte la misma cuenta y sugiere el saldo inicial cuando hay diferencias.
- 111 pruebas pasan.
