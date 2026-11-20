@echo off
REM Interfaz comun de los BAT de TIENDITA. Uso: call "_ui.bat" ACCION argumentos
REM Acciones: BANNER titulo | PASO n N texto | OK texto | AVISO texto | ERR texto | INFO texto | FIN codigo
goto :%~1

:INIT
if defined TND_UI_OK exit /b 0
set "TND_UI_OK=1"
set "ESC="
for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do set "ESC=%%b"
if defined TND_SIN_COLOR set "ESC="
set "C_AZ=" & set "C_VE=" & set "C_RJ=" & set "C_AM=" & set "C_GR=" & set "C_BL=" & set "C_RS="
if defined ESC (
  set "C_AZ=%ESC%[38;2;31;148;249m"
  set "C_VE=%ESC%[38;2;63;185;80m"
  set "C_RJ=%ESC%[38;2;248;81;73m"
  set "C_AM=%ESC%[38;2;227;179;65m"
  set "C_GR=%ESC%[38;2;139;148;158m"
  set "C_BL=%ESC%[1;37m"
  set "C_RS=%ESC%[0m"
)
REM Columna centrada: calcula el margen izquierdo segun el ancho de la ventana (texto alineado a la izquierda dentro de la columna)
set "TND_M="
set "TND_COLS=0"
set "TND_PAD=0"
for /f "tokens=2 delims=:" %%a in ('mode con 2^>nul ^| findstr /i "Columnas Columns"') do set /a TND_COLS=%%a 2>nul
set /a "TND_PAD=(TND_COLS-84)/2" 2>nul
if %TND_PAD% GTR 200 set "TND_PAD=200"
set "TND_SP5=                                                  "
if %TND_PAD% GTR 0 (
  set "TND_SP=%TND_SP5%%TND_SP5%%TND_SP5%%TND_SP5%%TND_SP5%"
  call set "TND_M=%%TND_SP:~0,%TND_PAD%%%"
)
set "TND_LINES=0"
for /f "tokens=2 delims=:" %%a in ('mode con 2^>nul ^| findstr /i "Lineas Lines"') do set /a TND_LINES=%%a 2>nul
set /a "TND_TOP=TND_LINES/9" 2>nul
if %TND_TOP% LSS 2 set "TND_TOP=2"
if %TND_TOP% GTR 8 set "TND_TOP=8"
set "TND_RULE=================================================================================="
exit /b 0

:BANNER
call :INIT
set "TND_T=%~2"
for /l %%i in (1,1,%TND_TOP%) do echo.
echo %TND_M%                  %C_AZ%T I E N D I T A   D E   A D O L F O%C_RS%
echo %TND_M%                 %C_GR%Inventario, cobros y tienda%C_RS%
echo.
echo %TND_M%  %C_AZ%%TND_RULE:~0,80%%C_RS%
echo.
echo %TND_M%  %C_BL%%TND_T%%C_RS%
echo.
exit /b 0

:PASO
call :INIT
echo.
echo %TND_M%  %C_AZ%[%~2/%~3]%C_RS% %C_BL%%~4%C_RS%
if defined TND_LOG >>"%TND_LOG%" echo [%~2/%~3] %~4
exit /b 0

:SUB
call :INIT
echo %TND_M%    %C_GR%%~2%C_RS%
if defined TND_LOG >>"%TND_LOG%" echo     %~2
exit /b 0

:OK
call :INIT
echo %TND_M%    %C_VE%[OK]%C_RS% %~2
if defined TND_LOG >>"%TND_LOG%" echo   [OK] %~2
exit /b 0

:AVISO
call :INIT
echo %TND_M%    %C_AM%[!]%C_RS%  %~2
if defined TND_LOG >>"%TND_LOG%" echo   [!] %~2
exit /b 0

:ERR
call :INIT
echo %TND_M%    %C_RJ%[X]%C_RS%  %~2
if defined TND_LOG >>"%TND_LOG%" echo   [X] %~2
exit /b 0

:INFO
call :INIT
echo %TND_M%  %C_GR%%~2%C_RS%
if defined TND_LOG >>"%TND_LOG%" echo    %~2
exit /b 0

:FIN
call :INIT
if defined TND_LOG >>"%TND_LOG%" echo RESULTADO codigo %~2
echo.
if "%~2"=="0" goto :FIN_BIEN
echo %TND_M%  %C_RJ%%TND_RULE:~0,80%%C_RS%
echo.
echo %TND_M%  %C_RJ%RESULTADO: SE DETUVO  codigo %~2%C_RS%
echo.
echo %TND_M%  %C_RJ%%TND_RULE:~0,80%%C_RS%
echo %TND_M%  %C_GR%Lee el mensaje [X] de arriba. El detalle completo queda en la%C_RS%
echo %TND_M%  %C_GR%carpeta logs. Dile a Claude: revisa el log.%C_RS%
echo.
exit /b 0
:FIN_BIEN
echo %TND_M%  %C_VE%%TND_RULE:~0,80%%C_RS%
echo.
echo %TND_M%  %C_VE%RESULTADO: TODO BIEN%C_RS%
echo.
echo %TND_M%  %C_VE%%TND_RULE:~0,80%%C_RS%
exit /b 0
