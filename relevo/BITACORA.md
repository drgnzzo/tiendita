# Bitácora viva de Tiendita (la leen los chats de PC1 y PC2)

Regla: cada acción se anota en "Registro" (la más nueva arriba) con fecha, PC, qué se hizo, estado (guardado / publicado con .bat / probado) y qué sigue. Todo chat nuevo empieza leyendo este archivo, ESTADO.md y relevo/PC1.md o PC2.md. La copia en el proyecto de Claude (claude/BITACORA.md) es un espejo; el repositorio manda.

## Estado actual (27-nov 15:00, PC2)
- Publicado con TIENDITA.bat el 27-nov 14:37 (GitHub 0540148e51, 6 de 6 bien): todo lo anterior, incluido "Elegir varios" (views-admin.js?v=15, main.js?v=16, sw.js tiendita-v43).
- Guardado en carpeta pero SIN publicar (también admin css ?v=24, ver Registro): mejoras del catálogo de clientes: botones de categoría, columnas sin huecos en PC, "Última pieza", botón del asistente más chico, franja "Hola, nombre · Aún puedes llevarte $X" con barra de cuenta, y "Lo que más llevas" (6 productos más comprados, sale de api.perfil; se oculta al buscar o filtrar). styles ?v=27, sw.js tiendita-v45. Probado en capturas (celular y PC) con datos de ejemplo. Se publican al correr TIENDITA.bat.
- Revisión en pantalla (capturas con datos de ejemplo en celular, tablet y PC): el diseño base es sólido; falta foto de producto, banner/avisos y reorden rápido ("lo que más pides").
- Hoja: falta confirmar que el usuario corrió TIENDITA > Inventario > Saldo inicial (una vez) y luego Verificar stock.

## Pendientes
- El usuario escoge: `ok votos` (votos en "Lo que piden"; toca hoja Sugerencias y backend), `ok kiosco` (modo kiosco para tablet), ocultar solos los agotados (necesita aprobación).
- Conteo físico: Coca Lata COC-355 (12 sin movimientos), Sopa Nissin Mix (4 vs 8).
- Cargar códigos de barras; luego ACTIVO = true en docs/escaner.js, escaner.js?v=3 en catalogo.html y sw.js; probar cámara en Android e iPhone.
- Repositorios y mejoras investigadas: ver claude/repos-y-mejoras-26-nov.md en el proyecto. El usuario va a pasar el repositorio de una tienda para comparar.
- Opcional: theme_color del manifest a rosa/vino; automatización de imágenes solo si lo pide.

## Registro
- 27-nov 16:20 PC2: Mi cuenta: la tarjeta "Sugerir algo" ahora va debajo del Historial (docs/perfil.html). sw.js tiendita-v46. En carpeta, sin publicar.
- 27-nov 16:10 PC2: cierre. Revisada la sintaxis de views-admin.js y catalogo.html (bien). ESTADO.md y relevo/PC2.md al dia. Sin publicar: catalogo v27, admin css v24, sw v45. Siguiente: correr TIENDITA.bat en PC2; despues en PC1 correr TIENDITA.bat y seguir con Saldo inicial y conteo fisico.
- 27-nov 15:40 PC2: revisado el panel de Productos en pantalla (celular y PC). En celular los botones largos apretaban el texto del producto: arreglado (texto completo arriba y botones abajo a todo lo ancho; "En venta" y "Archivados" comparten fila; botón "Contar inventario" sin subrayado). Admin css ?v=24. En carpeta, sin publicar. Pantalla Mi cuenta del cliente revisada: bien.
- 27-nov 15:20 PC2: franja de cuenta y "Lo que más llevas" en el catálogo (carpeta, sin publicar). Fotos: ya soportadas por Imagen_URL; falta que el usuario cargue enlaces. Banner de avisos del admin: pendiente (necesita Config en la hoja).
- 27-nov 15:00 PC2: revisado el catálogo en pantalla (3 tamaños) y una tienda de referencia (Shopify Dawn). Aplicado en carpeta: botones de categoría, columnas en PC, "Última pieza". Falta correr TIENDITA.bat.
- 27-nov 14:37 PC2: TIENDITA.bat completo, GitHub 0540148e51 (incluye Elegir varios).
- 27-nov 11:20 PC2: revisado el log: el .bat del 26-nov 13:03 salió bien. Creada esta bitácora y la regla en CLAUDE.md. Falta correr TIENDITA.bat para publicar "Elegir varios".
- 26-nov 13:06 PC2: "Elegir varios" guardado en carpeta (sin publicar).
- 26-nov 13:03 PC2: TIENDITA.bat completo: Apps Script @37 y GitHub 375e0a6f13.
- 26-nov 12:55 PC2: panel reordenado guardado.
- 26-nov 12:45 PC2: parche de PC1 (archivar, pestañas) aplicado a mano.
- 25-nov PC2: onEdit + Saldo inicial; Piezas existentes; Escanear con la cámara.
