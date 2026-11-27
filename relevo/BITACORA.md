# Bitácora viva de Tiendita (la leen los chats de PC1 y PC2)

Regla: cada acción se anota en "Registro" (la más nueva arriba) con fecha, PC, qué se hizo, estado (guardado / publicado con .bat / probado) y qué sigue. Todo chat nuevo empieza leyendo este archivo, ESTADO.md y relevo/PC1.md o PC2.md. La copia en el proyecto de Claude (claude/BITACORA.md) es un espejo; el repositorio manda.

## Estado actual (27-nov, PC2)
- Publicado el 26-nov 13:03 con TIENDITA.bat (6 de 6 bien, GitHub 375e0a6f13, Apps Script @37): onEdit del Stock + menú Saldo inicial, "Piezas existentes", Escanear con la cámara, panel reordenado (Contar inventario, Llegó mercancía, archivar / En venta y Archivados, Enviar reporte en Reportes), TIENDITA.bat con copia temporal. 111 pruebas pasan.
- Guardado en carpeta pero SIN publicar: "Elegir varios" (archivar varios a la vez; views-admin.js?v=15, main.js?v=16, sw.js tiendita-v43) y esta bitácora. Se publican al correr TIENDITA.bat.
- Hoja: falta confirmar que el usuario corrió TIENDITA > Inventario > Saldo inicial (una vez) y luego Verificar stock.

## Pendientes
- El usuario escoge: `ok votos` (votos en "Lo que piden"; toca hoja Sugerencias y backend), `ok kiosco` (modo kiosco para tablet), ocultar solos los agotados (necesita aprobación).
- Conteo físico: Coca Lata COC-355 (12 sin movimientos), Sopa Nissin Mix (4 vs 8).
- Cargar códigos de barras; luego ACTIVO = true en docs/escaner.js, escaner.js?v=3 en catalogo.html y sw.js; probar cámara en Android e iPhone.
- Repositorios y mejoras investigadas: ver claude/repos-y-mejoras-26-nov.md en el proyecto. El usuario va a pasar el repositorio de una tienda para comparar.
- Opcional: theme_color del manifest a rosa/vino; automatización de imágenes solo si lo pide.

## Registro
- 27-nov 11:20 PC2: revisado el log: el .bat del 26-nov 13:03 salió bien. Creada esta bitácora y la regla en CLAUDE.md. Falta correr TIENDITA.bat para publicar "Elegir varios".
- 26-nov 13:06 PC2: "Elegir varios" guardado en carpeta (sin publicar).
- 26-nov 13:03 PC2: TIENDITA.bat completo: Apps Script @37 y GitHub 375e0a6f13.
- 26-nov 12:55 PC2: panel reordenado guardado.
- 26-nov 12:45 PC2: parche de PC1 (archivar, pestañas) aplicado a mano.
- 25-nov PC2: onEdit + Saldo inicial; Piezas existentes; Escanear con la cámara.
