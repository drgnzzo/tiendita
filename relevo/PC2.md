# Relevo PC2 (2026-11-19, tarde)

## Lo que se hizo en PC2
- Se leyeron `ESTADO.md`, `relevo/PC1.md` y `CLAUDE.md`.
- Se guió el cambio de cuenta de GitHub a **drgnzzo** (`gh auth logout`, `gh auth login`, borrar `git:https://github.com` del Administrador de credenciales) y correr `TIENDITA.bat`.
- El usuario dijo que terminó en PC2, pero **no dio el resultado de cada paso**. Nada de lo de abajo está confirmado.

## Por confirmar (revisar al empezar en PC1)
1. ¿Subió a GitHub `drgnzzo/tiendita` sin error 403? Prueba: abrir github.com/drgnzzo/tiendita y ver que existe la carpeta `docs/`. O correr `TIENDITA.bat` y mirar el paso 6.
2. ¿Se hizo la Configuración inicial v2 en Apps Script (menú TIENDITA)? No hay constancia. Si se hizo, los PIN temporales los tiene el usuario.
3. ¿Se creó la implementación nueva y se pegó la URL `/exec` en `docs\js\config.js`? No hay constancia.

## Pendiente (sin cambios respecto a PC1, en orden)
1. Confirmar GitHub con la cuenta drgnzzo (ver arriba). Si PC1 todavía tiene guardada arc-caos, repetir el cambio de cuenta allá también.
2. Apps Script (cuenta dueña): TIENDITA > Configuración inicial v2; Implementar > Nueva implementación (Aplicación web, Yo, Cualquier persona); copiar URL `/exec`.
3. Pegar la URL en `docs\js\config.js`; correr `TIENDITA.bat`.
4. GitHub > Settings > Pages > main, carpeta `/docs`. (Regreso: carpeta `/`.)
5. Conteo físico: Panel > Inventario > Contar todo.

## Decisión abierta
- PIN: el usuario no lo quiere. Propuesta: PIN solo admin/operador; clientes solo con correo. Falta decidir y cambiar el código.

## Notas
- No se cambió ningún archivo del proyecto en PC2, solo este relevo.
- Claude no puede ejecutar comandos en la PC del usuario: los pasos con CMD y navegador los hace el usuario.
