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
