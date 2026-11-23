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
