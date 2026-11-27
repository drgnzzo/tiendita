# Relevo PC2 (2026-11-25)

## Hecho en PC2
- Carpeta puesta al día con GitHub (759d0bc) usando TIENDITA.bat. El aviso de "chocan" fue falso: el .bat se reemplazó a sí mismo mientras corría; el pull sí entró.
- "Piezas existentes" en Editar producto: publicado con TIENDITA.bat (28d2f9fbc1) y probado en vivo: quedan AJUSTE en Movimientos.
- Botón "Escanear con la cámara" en Editar/Nuevo producto (docs/escaner.js?v=2, views-admin v12, main v13). Un código de barras ya no se puede repetir. 103 pruebas pasan.
- Registro automático de ediciones a mano del Stock (onEdit) y menú Saldo inicial: hechos, 111 pruebas pasan. Ver ESTADO.md.
- Auditoría app <-> hoja: ver ESTADO.md, sección del 25-nov. Resumen: la app lee y escribe bien en la hoja; lo que se edite a mano en Productos no deja movimiento.

## Pendiente
1. Correr TIENDITA.bat para publicar el botón Escanear y el código único.
2. En la hoja: TIENDITA > Trabajo diario > Preparar las hojas de trabajo (faltan Entradas, Ajustes, Conteo, Cobros).
3. Tras TIENDITA.bat: en la hoja, recargar y correr TIENDITA > Inventario > Saldo inicial (una vez); luego Verificar stock debe decir que todo cuadra.
4. Conteo físico para arrancar el stock cuadrado (Coca Lata COC-355 dice 12 sin ningún movimiento; Sopa Nissin Mix 4 vs 8).
5. Cargar los códigos de barras de todos los productos; luego prender el escáner de clientes (ACTIVO = true, escaner.js?v=3, sw.js).

## Notas
- Claude no puede correr git ni terminal en PC2: el commit lo hace el paso "Guardar" de TIENDITA.bat.
- Si un comando de Git deja un .lock, moverlo a otro nombre dentro de .git, no borrarlo.
- Cuidado: los archivos del proyecto usan saltos de línea de Windows (CRLF); conservarlos al editar.

## 26-nov
- Panel admin (archivar, pestañas En venta/Archivados, reportes) aplicado a mano sobre el parche de PC1; se mantuvo "Piezas existentes". Arreglo de TIENDITA.bat (copia temporal). Falta correr TIENDITA.bat.

## 27-nov (cierre en PC2)
- Falta correr TIENDITA.bat en PC2 para publicar catalogo v27, admin css v24 y sw v45. Luego en PC1: correr TIENDITA.bat primero (baja todo) y leer relevo/BITACORA.md.
- En la hoja: TIENDITA > Inventario > Saldo inicial (una vez), Verificar stock, y luego Productos > Contar inventario.

