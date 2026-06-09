# Tiendita — Frontend

PWA (Progressive Web App) para empleados de la oficina.

## Stack

- HTML/CSS/JS vanilla
- Hospedaje: GitHub Pages
- Backend: Apps Script Web App
- Base de datos: Google Sheets

## Archivos

```
index.html       Login
catalogo.html    Catálogo + carrito + bot
perfil.html      Perfil + historial + sugerencias
styles.css       Estilos (mobile-first, tablet 640px, desktop 1024px)
api.js           Llamadas al backend de Apps Script
app.js           Sesión + carrito local + service worker
manifest.json    PWA manifest
sw.js            Service worker (offline + cache)
logo.svg         Logo, favicon e icono PWA
```

## Subir a GitHub

Todos los archivos van a la **raíz** del repo `drgnzzo/tiendita`. Sin carpetas.

1. Ve a https://github.com/drgnzzo/tiendita
2. Por cada archivo:
   - "Add file" → "Upload files" → arrastra el archivo → "Commit changes"
3. Activar GitHub Pages:
   - Settings → Pages
   - Source: **Deploy from a branch**
   - Branch: **main**, carpeta: **/ (root)**
   - Save
4. Espera 1-2 minutos. La app vive en:
   ```
   https://drgnzzo.github.io/tiendita/
   ```

## Probar

Abre la URL en tu celular. Debe:
- Pintar el splash rojo con "TIENDITA" en blanco
- Pedir tu correo (`victor.walmart.04@gmail.com`)
- Después de "Entrar", llevarte al catálogo con los 9 productos del lote
- En iPhone, podés agregarla al home con Safari → Compartir → "Añadir a pantalla de inicio". Se instala como app standalone.

## Cambiar la URL del backend

Si redespliegas el Apps Script con otra URL, edita `api.js`:

```js
const GAS_URL = 'https://script.google.com/macros/s/.../exec';
```

Y bump el `?v=N` en los HTMLs (busca `?v=1`) para forzar a los celulares a descargar el JS nuevo.

## Cuando publiques cambios

Cada vez que subas cambios:
1. Sube el archivo modificado a GitHub.
2. En `index.html`, `catalogo.html`, `perfil.html`: busca `?v=1` y cámbialo por `?v=2` (y así sucesivo). Esto invalida el cache del navegador y del service worker.
3. En `sw.js`: cambia `CACHE_VERSION = 'tiendita-v1'` a `'tiendita-v2'`.

## Responsive

- **Móvil** (< 640px): una columna, carrito como pill flotante, bottom nav.
- **Tablet** (640-1024px): catálogo en 2 columnas.
- **Escritorio** (≥1024px): max-width 1100px centrado, sin bottom nav, catálogo en 3 columnas.

## Safe-area (iPhone notch)

- Headers usan `padding-top: env(safe-area-inset-top)`.
- Footers fijos usan `padding-bottom: env(safe-area-inset-bottom)`.
- Viewport: `viewport-fit=cover` en cada HTML.

## Endpoints del backend usados

| Acción          | Método | Endpoint                                              |
|-----------------|--------|-------------------------------------------------------|
| Verificar       | GET    | `?action=ping`                                        |
| Login           | GET    | `?action=login&email=X`                               |
| Catálogo        | GET    | `?action=catalogo`                                    |
| Perfil          | GET    | `?action=perfil&email=X`                              |
| Historial       | GET    | `?action=historial&email=X`                           |
| Comprar         | POST   | `{action:'comprar', email, items:[{sku, cantidad}]}`  |
| Bot             | POST   | `{action:'bot', email, query}`                        |
| Sugerencia      | POST   | `{action:'sugerir', email, tipo, mensaje, calificacion}` |
