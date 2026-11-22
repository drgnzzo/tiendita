@echo off
if not defined TND_MAX if not defined TND_SIN_PAUSA (
  set "TND_MAX=1"
  start "TIENDITA" /max cmd /c ""%~f0" %*"
  exit /b 0
)
setlocal enabledelayedexpansion
cd /d "%~dp0"
call "_ui.bat" INIT
call "_config.bat"
if not exist logs mkdir logs

REM ---- Sin argumentos: revisa y sube todo. Argumentos: subir / probar / estado
set "ACCION=%~1"
if not defined ACCION set "ACCION=subir"
if /i "!ACCION!"=="subir" goto A_SUBIR
if /i "!ACCION!"=="probar" goto A_PROBAR
if /i "!ACCION!"=="estado" goto A_ESTADO
echo Accion desconocida: !ACCION!  Usa: subir, probar o estado.
exit /b 2

:A_SUBIR
set "TND_LOG=logs\ultimo_subir.log"
>"%TND_LOG%" echo TIENDITA subir %date% %time%
call "_ui.bat" BANNER "Revisar y subir todo (Apps Script y GitHub)"
call "_ui.bat" INFO "Sube a Apps Script con push normal, sin --force. GitHub Pages publica solo con lo que hay en la carpeta docs."
call :SUBIR
set "RC=!errorlevel!"
goto CERRAR

:A_PROBAR
set "TND_LOG=logs\ultimo_probar.log"
>"%TND_LOG%" echo TIENDITA probar %date% %time%
call "_ui.bat" BANNER "Solo pruebas (no sube nada)"
call :VERIFICAR
set "RC=!errorlevel!"
goto CERRAR

:A_ESTADO
set "TND_LOG=logs\estado_git.log"
>"%TND_LOG%" echo TIENDITA estado %date% %time%
call "_ui.bat" BANNER "Estado de Git y herramientas (solo lectura)"
call :ESTADO
set "RC=!errorlevel!"
goto CERRAR

:CERRAR
call "_ui.bat" FIN !RC!
if not defined TND_SIN_PAUSA (
  echo.
  if "!RC!"=="0" (
    echo %TND_M%  LISTO. Todo salio bien. Vuelve a Claude y escribe: listo
    timeout /t 15 >nul
  ) else (
    echo %TND_M%  NO TERMINO BIEN. Vuelve a Claude y escribe: revisa el log
    echo %TND_M%  Pulsa una tecla para cerrar.
    pause >nul
  )
)
exit /b !RC!

:ESTADO
git fetch -q origin !TND_BRANCH! >nul 2>&1
>>"!TND_LOG!" echo --- rama y ultimo commit
git rev-parse --abbrev-ref HEAD >>"!TND_LOG!" 2>&1
git log -1 --format="%%H %%ci %%s" >>"!TND_LOG!" 2>&1
>>"!TND_LOG!" echo --- cambios sin guardar
git status --short --branch >>"!TND_LOG!" 2>&1
>>"!TND_LOG!" echo --- local vs GitHub: adelante atras
git rev-list --left-right --count HEAD...origin/!TND_BRANCH! >>"!TND_LOG!" 2>&1
>>"!TND_LOG!" echo --- herramientas
git --version >>"!TND_LOG!" 2>&1
gh --version >>"!TND_LOG!" 2>&1
node --version >>"!TND_LOG!" 2>&1
call clasp --version >>"!TND_LOG!" 2>&1
>>"!TND_LOG!" echo --- Apps Script
if exist ".clasp.json" (>>"!TND_LOG!" type ".clasp.json") else (>>"!TND_LOG!" echo .clasp.json no existe)
>>"!TND_LOG!" echo scriptId esperado: !TND_SCRIPT_ID!
call "_ui.bat" OK "Estado guardado en logs\estado_git.log"
exit /b 0

:SUBIR
call :PREPARAR || exit /b 1
call :VERIFICAR || exit /b 1
call :GUARDAR || exit /b 1
call :TRAER || exit /b 1
call :APPSSCRIPT || exit /b 1
call :GITHUB || exit /b 1
exit /b 0

:PREPARAR
call "_ui.bat" PASO 1 6 "Preparando herramientas y sesiones"
for %%C in (git gh node) do (
  where %%C >nul 2>&1
  if errorlevel 1 (
    call "_ui.bat" ERR "Falta %%C. Ejecuta NUEVA-PC.bat para instalarlo"
    exit /b 1
  )
)
rem la carpeta web quedo reemplazada por docs (GitHub Pages)
if exist "docs\index.html" if exist "web\index.html" rmdir /s /q "web"
if "!TND_SCRIPT_ID!"=="PEGAR_ID_DEL_SCRIPT" (
  call "_ui.bat" ERR "Falta el ID del script. Abre _config.bat y pega el ID en TND_SCRIPT_ID"
  exit /b 1
)
where clasp >nul 2>&1
if errorlevel 1 (
  call "_ui.bat" SUB "Instalando CLASP, un momento..."
  call npm install -g @google/clasp >nul 2>&1
  where clasp >nul 2>&1
  if errorlevel 1 (
    call "_ui.bat" ERR "No se pudo instalar CLASP. Cierra esta ventana, abre otra y repite"
    exit /b 1
  )
)
set "GN="
for /f "delims=" %%N in ('git config user.name 2^>nul') do set "GN=%%N"
if not defined GN (
  set /p "GN=%TND_M%  Escribe tu nombre para firmar los cambios: "
  git config --global user.name "!GN!"
)
set "GE="
for /f "delims=" %%E in ('git config user.email 2^>nul') do set "GE=%%E"
if not defined GE (
  set /p "GE=%TND_M%  Escribe tu correo de GitHub: "
  git config --global user.email "!GE!"
)
gh auth status >nul 2>&1
if errorlevel 1 (
  call "_ui.bat" SUB "Se abre el navegador para iniciar sesion en GitHub."
  gh auth login --hostname github.com --git-protocol https --web
  if errorlevel 1 (
    call "_ui.bat" ERR "No se completo el inicio de sesion en GitHub"
    exit /b 1
  )
)
gh auth setup-git >nul 2>&1
if not exist ".git" (
  git init -q -b !TND_BRANCH!
  call "_ui.bat" OK "Repositorio Git creado en esta carpeta"
)
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  call "_ui.bat" SUB "Conectando esta carpeta con !TND_REPO! en GitHub..."
  git remote add origin https://github.com/!TND_REPO!.git
  git fetch -q origin !TND_BRANCH!
  if errorlevel 1 (
    call "_ui.bat" ERR "No se pudo leer !TND_REPO! en GitHub. Revisa el nombre en _config.bat y tu sesion"
    exit /b 1
  )
  git reset -q origin/!TND_BRANCH!
  for /f "delims=" %%F in ('git ls-files -d') do git checkout -- "%%F"
  call "_ui.bat" OK "Conectado. Los archivos viejos del repo se conservan"
)
if not exist ".clasp.json" (
  >".clasp.json" echo {"scriptId":"!TND_SCRIPT_ID!","rootDir":"apps-script"}
  call "_ui.bat" OK "Proyecto de Apps Script enlazado en esta PC"
)
if not exist "%USERPROFILE%\.clasprc.json" (
  call "_ui.bat" SUB "Se abre el navegador para iniciar sesion en Google. Usa la cuenta DUENA del script y pulsa Permitir."
  call clasp login
  if errorlevel 1 (
    call "_ui.bat" ERR "No se pudo iniciar sesion en Google. Activa la API en script.google.com/home/usersettings"
    exit /b 1
  )
)
call "_ui.bat" OK "Herramientas y sesiones listas"
exit /b 0

:VERIFICAR
call "_ui.bat" PASO 2 6 "Pruebas y revision de secretos"
set "LOGV=logs\ultimo_verificar.log"
if exist "!LOGV!" del "!LOGV!"
node tests\run.js >> "!LOGV!" 2>&1
if errorlevel 1 (
  call "_ui.bat" ERR "Las pruebas fallaron. Detalle abajo y en !LOGV!"
  type "!LOGV!"
  exit /b 1
)
call "_ui.bat" OK "Pruebas del backend correctas"
findstr /c:"PEGA_AQUI_LA_URL_NUEVA" docs\js\config.js >nul 2>&1
if not errorlevel 1 call "_ui.bat" AVISO "docs\js\config.js aun tiene la URL de ejemplo: la pagina no se conectara hasta ponerla"
powershell -NoProfile -ExecutionPolicy Bypass -File "_seguro.ps1" >> "!LOGV!" 2>&1
if errorlevel 1 (
  call "_ui.bat" ERR "La revision de secretos bloqueo la subida. Detalle abajo y en !LOGV!"
  type "!LOGV!"
  exit /b 1
)
call "_ui.bat" OK "Sin secretos en lo que se va a subir"
exit /b 0

:GUARDAR
call "_ui.bat" PASO 3 6 "Guardando cambios en Git"
git config core.safecrlf false
rem borra un archivo huerfano que dejaba una version vieja de este BAT (nombre con signos de admiracion)
del /q "*TND_LOG*" >nul 2>&1
git add -A || exit /b 1
powershell -NoProfile -ExecutionPolicy Bypass -File "_seguro.ps1" >nul 2>&1
if errorlevel 1 (
  call "_ui.bat" ERR "La revision de secretos bloqueo lo ya preparado"
  exit /b 1
)
git diff --cached --quiet
if errorlevel 1 (
  git commit -q -m "!TND_MSG!" || exit /b 1
  call "_ui.bat" OK "Cambios guardados"
) else (
  call "_ui.bat" SUB "No hay cambios nuevos que guardar"
)
exit /b 0

:TRAER
call "_ui.bat" PASO 4 6 "Buscando cambios nuevos en GitHub, por ejemplo hechos desde otra PC"
git fetch -q origin !TND_BRANCH!
if errorlevel 1 (
  call "_ui.bat" ERR "No se pudo consultar GitHub. Revisa tu conexion a internet"
  exit /b 1
)
set "ATRAS=0"
for /f %%N in ('git rev-list --count HEAD..origin/!TND_BRANCH!') do set "ATRAS=%%N"
if "!ATRAS!"=="0" (
  call "_ui.bat" SUB "No hay cambios nuevos en GitHub"
  exit /b 0
)
call "_ui.bat" SUB "Hay !ATRAS! cambios nuevos: se unen con los tuyos"
git pull -q --rebase origin !TND_BRANCH!
if errorlevel 1 (
  git rebase --abort >nul 2>&1
  call "_ui.bat" ERR "Los cambios de las dos PC chocan. No se perdio nada. Dile a Claude: hay conflicto"
  exit /b 1
)
call "_ui.bat" OK "Cambios de GitHub unidos con los tuyos"
exit /b 0

:APPSSCRIPT
call "_ui.bat" PASO 5 6 "Subiendo el codigo a Apps Script"
set "TND_TMP=%TEMP%\tiendita_clasp.txt"
call clasp push >"!TND_TMP!" 2>&1
set "RCP=!errorlevel!"
>>"!TND_LOG!" type "!TND_TMP!"
if not "!RCP!"=="0" (
  type "!TND_TMP!"
  call "_ui.bat" ERR "No se pudo subir a Apps Script. Revisa el mensaje de arriba"
  exit /b 1
)
for /f "delims=" %%L in ('findstr /i "Pushed Archivos" "!TND_TMP!"') do echo %TND_M%    %C_GR%%%L%C_RS%
call "_ui.bat" OK "Apps Script al dia"
exit /b 0

:GITHUB
call "_ui.bat" PASO 6 6 "Subiendo a GitHub y verificando"
set "ORIGIN="
for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "ORIGIN=%%R"
if not defined ORIGIN (
  call "_ui.bat" ERR "Falta el remote origin de GitHub"
  exit /b 1
)
if "!TND_REQUIRE_PRIVATE!"=="1" (
  set "PRIVATE="
  for /f "delims=" %%V in ('gh repo view --json isPrivate -q .isPrivate 2^>nul') do set "PRIVATE=%%V"
  if /i not "!PRIVATE!"=="true" (
    call "_ui.bat" ERR "BLOQUEADO: el repositorio no esta confirmado como privado"
    exit /b 1
  )
)
set "RAMA="
for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD') do set "RAMA=%%B"
if /i not "!RAMA!"=="!TND_BRANCH!" git branch -M !TND_BRANCH!
git push -q -u origin !TND_BRANCH! || exit /b 1
for /f %%S in ('git rev-parse HEAD') do set "LOCAL=%%S"
for /f %%S in ('git ls-remote origin refs/heads/!TND_BRANCH!') do set "REMOTO=%%S"
if /i not "!LOCAL!"=="!REMOTO!" (
  call "_ui.bat" ERR "La version local y la de GitHub son distintas"
  exit /b 1
)
call "_ui.bat" OK "GitHub actualizado y verificado: !LOCAL:~0,10!"
exit /b 0
