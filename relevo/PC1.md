# Relevo PC1 (2026-11-18, noche)

## Hecho
- Carpeta `C:\Proyectos\Tiendita` armada: `TIENDITA.bat`, `apps-script/` (backend v2.0.0), `docs/` (página nueva), `tests/` (52 pruebas pasan).
- `TIENDITA.bat` ya corrió en PC1: pasos 1-5 OK. **El código nuevo YA está subido a Apps Script** (3 archivos). No cambia la URL /exec publicada hasta crear una implementación nueva.
- Paso 6 (subir a GitHub) FALLÓ: `Permission to drgnzzo/tiendita.git denied to arc-caos` (403). Git/gh en esta PC tienen guardada la cuenta **arc-caos** (la de MT Group), no drgnzzo.

## Pendiente (en orden)
1. Entrar a GitHub con la cuenta **drgnzzo** en esta PC: en CMD `gh auth logout`, luego `gh auth login` (GitHub.com, HTTPS, navegador, cuenta drgnzzo); además borrar `git:https://github.com` en Administrador de credenciales de Windows. Luego correr `TIENDITA.bat` otra vez.
2. Apps Script (cuenta dueña): menú TIENDITA > Configuración inicial v2; anotar PIN temporales; Implementar > Nueva implementación (Aplicación web, Yo, Cualquier persona); copiar URL /exec.
3. Pegar la URL en `docs\js\config.js`; correr `TIENDITA.bat`.
4. GitHub > repo tiendita > Settings > Pages > main, carpeta /docs. (Regreso: carpeta / root.)
5. Conteo físico: Panel > Inventario > Contar todo.

## Decisión abierta
- El usuario NO quiere PIN. Hoy el backend lo pide a todos los roles. Opciones: PIN solo admin/operador (clientes solo correo), o ninguno (cualquiera con un correo admin podría editar stock). Pendiente decidir y cambiar el código.

## Cómo continuar en PC2
- Misma carpeta `C:\Proyectos\Tiendita` con `NUEVA-PC.bat` o clonando `drgnzzo/tiendita`; mismo ID de script; `clasp login` con la cuenta dueña. En PC2 iniciar sesión de GitHub como **drgnzzo**. Escribir solo `relevo/PC2.md`.
