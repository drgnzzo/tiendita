# Tiendita — Entrega 1: Apps Script

7 archivos `.gs` que forman el backend de la Tiendita.

## Arquitectura

```
Code.gs       → CONFIG global, menu del Sheet, inicializarBD()
API.gs        → Router doGet/doPost, endpoints publicos del frontend
Productos.gs  → Catalogo, stock, decremento
Ventas.gs     → registrarCompra() con LockService
Usuarios.gs   → whitelist, deuda, liquidacion, corte quincenal
Reportes.gs   → reporte diario por correo + bot + sugerencias + dashboard
Utils.gs      → memoizacion, logs, normalizacion NFD
```

Todos los archivos comparten scope global (asi funciona Apps Script).
`CONFIG` se define una vez en `Code.gs` y se usa desde todos los demas.

## Como subirlos al editor de Apps Script

1. Abre tu Sheet:
   https://docs.google.com/spreadsheets/d/1nw7xBxq5JTHPhFuSiSL8BZZ-Or7hYX9oUMJkWORvf-8/edit

2. Menu **Extensiones → Apps Script**.

3. Si el editor tiene un `Code.gs` con codigo de Gemini, BORRALO completo (Ctrl+A → Delete).

4. Por cada uno de los 7 archivos:
   - Si NO existe en el editor: clic en `+` junto a "Archivos" → "Script" → ponle el nombre **sin extension** (ejemplo: `Code`, `API`, `Productos`...).
   - Si ya existe `Code`, simplemente abre cada archivo, Ctrl+A → Delete → pega el contenido.

5. Guardar todo (Ctrl+S o icono del disquete).

6. Recarga el Sheet (F5). Despues de unos segundos aparece el menu **🏪 TIENDITA** arriba.

7. Clic en **🏪 TIENDITA → ▶️ Inicializar Base de Datos**. La primera vez te pedira permisos: dale **Revisar permisos**, elige tu cuenta `victor.walmart.04@gmail.com`, en la pantalla amarilla "Google no verifico esta app" toca **Configuracion avanzada → Ir a [nombre del proyecto] (no seguro) → Permitir**.

8. Al terminar veras el mensaje `✅ Listo` con el resumen.

## Que crea inicializarBD()

- Hojas nuevas: **Usuarios, Productos, Ventas, Cortes, Sugerencias, Logs (oculta), Config**.
- NO toca **ZORRO ABARROTERO** ni **RESUMEN** (siguen siendo tu control manual del proveedor).
- Admin precargado: `victor.walmart.04@gmail.com` con limite de credito 99,999.
- 9 productos precargados del lote ZORRO ABARROTERO 7-jun (consolidando los duplicados de Mazapan y BonIce).

## Despues de inicializar — Implementar como Web App

Esto es lo que hara que el frontend (Entrega 2) pueda hablarle al backend.

1. En el editor de Apps Script, arriba a la derecha: **Implementar → Nueva implementacion**.
2. ⚙️ junto a "Seleccionar tipo" → **Aplicacion web**.
3. Configurar:
   - Descripcion: `Tiendita v1.0.0`
   - Ejecutar como: **Yo** (`victor.walmart.04@gmail.com`)
   - Quien tiene acceso: **Cualquier usuario** (importante: asi el frontend desde GitHub Pages puede llamarlo sin auth de Google)
4. **Implementar**. Te da una URL del tipo `https://script.google.com/macros/s/AKfycb.../exec`.
5. Cópiala y guardala. Esa URL la pegas en `js/api.js` cuando hagamos la Entrega 2.

Despues de copiar la URL, abre el menu **🏪 TIENDITA → ⚙️ Sistema → 🔗 Ver URL del Web App** para confirmar que quedo activa.

## Probar que el backend funciona (sin frontend todavia)

Abre esta URL en el navegador (pega la URL que te dio Implementar y agrega `?action=ping`):

```
https://script.google.com/macros/s/.../exec?action=ping
```

Debes ver algo como:
```json
{"ok":true,"version":"1.0.0","time":"2026-06-08T..."}
```

Otro test mas util — login con tu correo:
```
https://script.google.com/macros/s/.../exec?action=login&email=victor.walmart.04@gmail.com
```

Debe responder con `{ok:true, usuario:{...}}`.

Tercer test — catalogo:
```
https://script.google.com/macros/s/.../exec?action=catalogo
```

Debe traer los 9 productos precargados.

## Instalar el trigger del reporte diario

Despues de probar, abre el menu **🏪 TIENDITA → ⚙️ Sistema → 🔔 Instalar trigger de reporte diario**. Te llegara un correo a las 20:00 con el resumen del dia.

Puedes probarlo manualmente AHORA con **🏪 TIENDITA → 💰 Finanzas → 📧 Enviar reporte diario (prueba)** — te llega instantaneo (aunque sin ventas el resumen sera de ceros).

## Que sigue

Entrega 2: los 10 archivos del frontend (HTML / CSS / JS) listos para subir al repo `drgnzzo/tiendita`. Estos hablaran con la URL del Web App.

Cuando termines los pasos 1-8 de arriba, pasame:
1. La URL del Web App que te dio "Implementar"
2. Confirma que viste el menu **🏪 TIENDITA** y que `inicializarBD()` corrio sin errores
3. Si abriste `?action=ping` y `?action=catalogo` y vieron JSON

Con eso arrancamos Entrega 2.
