# Tiendita v2 — Pasos (en este orden)

El link de siempre (drgnzzo.github.io/tiendita) NO cambia. No se usa Cloudflare.

1. **Doble clic en `TIENDITA.bat`.** La primera vez pide entrar a GitHub (cuenta drgnzzo) y a Google (cuenta dueña del script). Sube el código nuevo a Apps Script y a GitHub. No cambia lo que ve la gente todavía.
2. **Apps Script** (cuenta dueña): abre la hoja, menú **🏪 TIENDITA → Configuración inicial v2** → Sí. Anota los PIN temporales que muestre.
3. **Apps Script → Implementar → Nueva implementación → Aplicación web** (Ejecutar como: Yo; Acceso: Cualquier persona). Copia la URL que termina en `/exec`.
4. Abre `docs\js\config.js`, cambia `PEGA_AQUI_LA_URL_NUEVA` por esa URL, guarda. Doble clic en `TIENDITA.bat` otra vez.
5. **GitHub → repo tiendita → Settings → Pages** → Branch `main`, carpeta **/docs** → Save. En 1–2 minutos el link de siempre muestra la página nueva.
6. **Regreso si algo falla:** en Settings → Pages vuelve a poner carpeta **/ (root)**. La página vieja sigue guardada ahí.

Orden para el inventario: ver `ESTADO.md` y la sección "Cómo llevar el inventario" que te explicó Claude.
