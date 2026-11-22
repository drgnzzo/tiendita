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
