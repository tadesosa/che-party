@echo off
title Che Party
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto sinnode
if not exist node_modules goto instalar
goto jugar

:instalar
echo Instalando por unica vez, necesita internet...
call npm install
goto jugar

:jugar
set LP_OPEN=1
node server.js
pause
exit /b

:sinnode
echo.
echo   No encontre Node.js en esta compu.
echo   Usa CheParty.exe que esta en la carpeta dist, o instala Node desde nodejs.org
echo.
pause
