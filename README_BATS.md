# BAT de Tiendita
Solo uno de uso diario: **`TIENDITA.bat`** (doble clic).
1. Prepara herramientas y sesiones (GitHub y Google la primera vez; se conecta al repo `drgnzzo/tiendita`).
2. Corre las 52 pruebas y revisa que no se suban secretos.
3. Guarda cambios, une los de la otra PC, sube a Apps Script (push normal) y a GitHub verificando el SHA.
GitHub Pages publica la carpeta docs (Settings > Pages).

Argumentos: `TIENDITA.bat probar` (solo pruebas), `TIENDITA.bat estado` (escribe logs\estado_git.log).
`NUEVA-PC.bat`: para una PC sin nada (instala Git, gh, Node; descarga el repo).
Config: `_config.bat` (repo, ID de la hoja, ID del script; sin secretos).
