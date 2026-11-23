# Relevo PC1

## Hecho
- Tienda de siempre en docs/ (sin PIN para clientes); login único: admin@tiendita.com pide contraseña y entra a docs/admin/.
- Panel admin: productos nuevos con piezas, venta a cliente, reportes del mes, formularios anchos. 88 pruebas pasan.
- Catálogo público sin costo y sin lo agotado.
- BAT sube a GitHub, a Apps Script y actualiza la implementación (misma URL).

## Pendiente
1. Correr TIENDITA.bat y revisar en vivo (tienda y /admin/).
2. Probar con datos reales; mandar capturas de lo raro.
3. Ideas: deshacer venta, exportar reporte, fotos.

## Como continuar
Leer ESTADO.md. No editar relevo/PC2.md.

- Hecho: existencia (+ Sumar / Quitar / ajustar) en Productos e Inventario; reporte de compras en Reportes. 89 pruebas ok.
- Pendiente: la usuaria corre TIENDITA.bat; revisar con Claude en Chrome (su preferido para pruebas en vivo).

- Hecho: tema claro forzado, panel sin tienda duplicada, a todo el ancho, 5 pestañas, formularios rápidos. Pendiente: correr TIENDITA.bat y revisar con la usuaria.

- Hecho: tema suave (fondos no blancos, paleta reducida, jerarquía de botones). Pendiente: publicar con TIENDITA.bat (5d7fb32 + este commit) y revisar con capturas.
- Hecho: catálogo con espaciado nuevo e iconos por nombre; soporta Imagen_URL (se llena desde Editar producto > Enlace de la foto).
- Hecho: panel homologado con la tienda; botón Panel visible en catálogo/perfil para admin. Pendiente: publicar con TIENDITA.bat y revisar vistas Productos/Cobros/Reportes en vivo.
- Hecho: rediseño limpio del panel y "+ Anotar" por cliente. Pendiente: publicar con TIENDITA.bat y revisar en vivo.
- Hecho: catálogo por secciones, criterio de orden unificado, panel más oscuro + efectos. Pendiente: que la usuaria elija dirección visual (opciones propuestas) y publicar con TIENDITA.bat.

- Hecho: paleta A+C en tienda y panel, verificada en escritorio y móvil.
- Pendiente: publicar con TIENDITA.bat y revisar con capturas reales.

- Hecho: Auditoría (corte de inventario) + optimización móvil del panel.
- Pendiente: TIENDITA.bat, probar corte real en el celular, revisar hojas nuevas en el Sheet.

- Hecho: auditoría móvil automática y arreglos. Versión lista para publicar con TIENDITA.bat.

- Revisión tras publicar: se corrigió views-admin.js que no había llegado. Pendiente: correr TIENDITA.bat de nuevo y probar Auditoría en el celular.

- Hecho: paleta perla y rosa empolvado. Pendiente: correr TIENDITA.bat (también sube la pestaña Auditoría) y probar.

## 22-nov (tema Diamante)
- Hecho: botón Color (Perla/Diamante) en todas las pantallas; encabezado angosto corregido.
- Pendiente: correr TIENDITA.bat, revisar en celular real y mandar capturas.
- Continuar: si cambias styles.css/app.css, regenerar Diamante con tools/generar_tema_diamante.py.

## 23-nov (cierre PC1)
- Hecho: botón Color toggle (solo globo), logo redondo rehecho, panel Perla suave, catálogo en columnas sin emojis/fotos genéricas, reglas de orden (Mi cuenta, nombres Auditoría/Corte, sin cursiva). Último commit 8b3a924, SW v36. Pruebas: 94 ok.
- Pendiente: correr TIENDITA.bat en PC2 (sube todo) y revisar en celular. Siguiente bloque: 5 tamaños de letra, ordenar Reportes, revisar atajos repetidos Resumen/Cobros. Fotos de productos (quitar fondo 600x600): sin hacer, versión simple si se pide.
- Continuar: leer ESTADO.md; si cambias styles.css/app.css regenerar Diamante con tools/generar_tema_diamante.py.

## 23-nov (cierre PC1, actualizado)
- Ultimo cambio: catalogo sin foto muestra monograma (iniciales), SW v37. Resto igual que arriba. Correr TIENDITA.bat en PC2.

- Actualizacion: catalogo sin foto usa dibujos de linea por categoria (SW v38). Correr TIENDITA.bat en PC2.
