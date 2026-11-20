@echo off
if not defined TND_MAX if not defined TND_SIN_PAUSA (
  set "TND_MAX=1"
  start "TIENDITA" /max cmd /c ""%~f0" %*"
  exit /b 0
)
if not defined TND_SIN_PAUSA if exist "%~dp0_nada.ps1" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_nada.ps1" >nul 2>&1
setlocal EnableExtensions
echo ================================================================
echo  TIENDITA - Preparar una PC NUEVA (desde cero)
echo ================================================================
echo Instala Git, GitHub CLI, Node.js y Python, inicia sesion en GitHub
echo por el navegador y descarga el proyecto a C:\Proyectos\Tiendita.
echo Es el unico archivo que necesitas llevar a la PC nueva.
echo No pide ni guarda contrasenas. Puede abrir ventanas de permiso de Windows: acepta.
echo.
pause

where winget >nul 2>&1
if errorlevel 1 goto SIN_WINGET

call :INSTALAR Git.Git git
call :INSTALAR GitHub.cli gh
call :INSTALAR OpenJS.NodeJS.LTS node
call :INSTALAR Python.Python.3.12 py
for %%C in (git gh node py) do call :VERIFICAR %%C
if defined FALTA goto FALLO

echo.
echo Sesion de GitHub
gh auth status >nul 2>&1
if not errorlevel 1 goto AUTH_OK
echo Se abrira tu navegador. Copia el codigo de esta ventana, pegalo en la pagina y autoriza.
gh auth login --hostname github.com --git-protocol https --web
if errorlevel 1 goto AUTH_FALLO
:AUTH_OK
gh auth setup-git >nul 2>&1

set "DESTINO=C:\Proyectos\Tiendita"
if exist "%DESTINO%\.git" goto YA_DESCARGADO
echo.
set "REPO="
set /p REPO=Escribe usuario/repositorio de GitHub (ejemplo: drgnzzo/tiendita): 
if not defined REPO goto SIN_REPO
if not exist "C:\Proyectos" mkdir "C:\Proyectos"
gh repo clone "%REPO%" "%DESTINO%"
if errorlevel 1 goto CLONE_FALLO
:YA_DESCARGADO
echo [OK] Proyecto en %DESTINO%
cd /d "%DESTINO%"
if not exist "TIENDITA.bat" goto SIN_INSTALADOR
call "TIENDITA.bat"
goto FIN

:INSTALAR
where %2 >nul 2>&1
if not errorlevel 1 exit /b 0
echo Instalando %1 ...
winget install --id %1 -e --accept-source-agreements --accept-package-agreements
call :REFRESCAR_PATH
exit /b 0

:VERIFICAR
where %1 >nul 2>&1
if errorlevel 1 (set "FALTA=1") else (echo [OK] %1)
exit /b 0

:REFRESCAR_PATH
for /f "delims=" %%P in ('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User')"') do set "PATH=%%P"
exit /b 0

:SIN_WINGET
echo [ERROR] No se encontro winget. Actualiza "Instalador de aplicacion" desde Microsoft Store y repite.
goto FIN
:FALLO
echo [ERROR] Falta alguna herramienta de las marcadas arriba. Cierra esta ventana, vuelve a abrir el archivo y repite.
goto FIN
:AUTH_FALLO
echo [ERROR] No se completo el inicio de sesion en GitHub. Repite este archivo.
goto FIN
:SIN_REPO
echo [ERROR] No escribiste el nombre del repositorio.
goto FIN
:CLONE_FALLO
echo [ERROR] No se pudo descargar el repositorio. Revisa el nombre usuario/repositorio y que hayas iniciado sesion con la cuenta correcta.
goto FIN
:SIN_INSTALADOR
echo [ERROR] El proyecto se descargo pero no contiene TIENDITA.bat: aun no se ha subido completo a GitHub.
goto FIN

:FIN
echo.
pause
exit /b 0
