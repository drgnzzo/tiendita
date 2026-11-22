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
