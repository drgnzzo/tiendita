# Relevo PC2 (2026-11-25)

## Hecho en PC2
- Carpeta puesta al día con GitHub (759d0bc) usando TIENDITA.bat. Un aviso de "chocan" fue falso: el .bat se reemplazó a sí mismo mientras corría; el pull sí entró (fast-forward).
- Tarea nueva: "Piezas existentes" en Editar producto (panel admin). Cambia el stock a cualquier entero desde 0 como AJUSTE en Movimientos. Detalle en ESTADO.md, sección del 25-nov.
- Archivos tocados: apps-script/Código.gs (apiProdGuardar), docs/admin/js/views-admin.js (formProducto), docs/admin/js/main.js (?v=11), docs/admin/index.html (main.js?v=12), tests/run.js (+8 pruebas, 102 pasan), ESTADO.md, este relevo.

## Pendiente
1. Correr TIENDITA.bat (hace commit, trae lo nuevo, sube a Apps Script, actualiza la implementación y sube a GitHub).
2. Probar en el panel con un producto de prueba: Editar producto > Piezas existentes = 0 > Guardar; revisar la hoja Movimientos (tipo AJUSTE).
3. Después: prender el escáner cuando estén todos los códigos (ACTIVO = true en docs/escaner.js, subir escaner.js?v y sw.js).

## Notas
- Claude no puede correr git ni terminal en PC2: el commit lo hace el paso "Guardar" de TIENDITA.bat.
- Si un comando de Git deja un .lock, moverlo a otro nombre dentro de .git, no borrarlo.
