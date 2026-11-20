# Estado — Tiendita v2

## Hecho (2026-11-18)
- Backend v2.0.0 (`apps-script/Código.gs`): roles admin/operador/cliente, libro de Movimientos (entradas/salidas/ajustes/conteo), Pagos y cortes, usuarios. 52 pruebas pasan.
- Frontend nuevo (`docs/`): tienda + panel interno, celular y escritorio. 21 revisiones en navegador sin errores.
- BAT: `TIENDITA.bat`, `NUEVA-PC.bat`. ID del script ya en `_config.bat`.
- Decisión: sin Cloudflare; GitHub Pages en el mismo link (repo `drgnzzo/tiendita`, carpeta /docs).

## Pendiente (lo hace el usuario, en orden)
1. Subido a Apps Script OK. Falta subir a GitHub: iniciar sesión con drgnzzo (ver relevo/PC1.md).
2. En Apps Script (cuenta dueña): menú TIENDITA > Configuración inicial v2; Implementar > Nueva implementación; copiar URL /exec.
3. Poner la URL en `docs/js/config.js`; correr `TIENDITA.bat`.
4. GitHub > Settings > Pages > Branch main, carpeta /docs > Save (aquí cambia el sitio visible).
5. Conteo físico: Panel > Inventario > Contar todo.

## Decisión abierta
- PIN: hoy lo piden todos los roles. El usuario no quiere PIN; propuesto: PIN solo para admin/operador, clientes solo con correo.

## No probado
Despliegue real en Apps Script y GitHub Pages.
