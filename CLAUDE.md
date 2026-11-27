# Tiendita de Adolfo — instrucciones de carpeta

Lee `ESTADO.md` y `relevo/*.md` al empezar. El usuario no es técnico: explica en español, simple y en pocos pasos.

- Backend: `apps-script/` (Apps Script sobre Google Sheet, ID en `_config.bat`). El archivo se llama `Código.gs` (con acento) para que clasp reemplace el del proyecto y no cree uno duplicado.
- Frontend: `docs/` (HTML/JS sin build, rutas relativas). Se publica con GitHub Pages desde la rama main, carpeta /docs, en la MISMA dirección de siempre: drgnzzo.github.io/tiendita. No se usa Cloudflare.
- Repo: `drgnzzo/tiendita` (público por GitHub Pages gratis; el código no lleva secretos, los datos los protege el backend). Los archivos viejos del raíz se conservan: son el respaldo y el plan de regreso (Settings > Pages > carpeta / (root)).
- Pruebas: `node tests/run.js` (52 pruebas con simulador de Apps Script).
- Un solo BAT: `TIENDITA.bat` (subir / probar / estado). Sin force push ni `clasp push --force`.
- No pedir ni guardar contraseñas, PIN ni tokens. `.clasp.json`, `.clasprc.json` y `logs/` no se suben.
- Subir a Apps Script NO cambia la implementación publicada: la URL /exec vieja sigue igual hasta crear una nueva implementación (la hace el dueño del script).
- Cambios a la hoja o a datos reales solo con aprobación del usuario.
- Cierre de sesión: actualizar `ESTADO.md` y SOLO el `relevo/PCn.md` de la PC actual; subir con `TIENDITA.bat`.
- Bitácora viva: `relevo/BITACORA.md`. Cada vez que hagas algo (cambio, prueba, publicación), agrega arriba de su registro una línea con fecha, PC, qué se hizo, estado (guardado en carpeta / publicado con .bat / probado) y qué sigue. Todo chat nuevo, de cualquier PC, empieza leyéndola. El repositorio es privado: ahí va todo el detalle que haga falta.
