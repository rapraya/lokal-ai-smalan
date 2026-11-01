@echo off
setlocal
cd /d "%~dp0"
set "PORT=8765"

echo.
echo ==========================================
echo   LOKAL AI SMALAN - LOCAL PREVIEW
echo ==========================================
echo.

where py >nul 2>&1
if not errorlevel 1 goto use_py

where python >nul 2>&1
if not errorlevel 1 goto use_python

where php >nul 2>&1
if not errorlevel 1 goto use_php

if exist "D:\DevTools\PHP\8.5\php.exe" goto use_known_php

echo Python atau PHP CLI tidak ditemukan.
echo Install Python 3 atau pastikan PHP CLI tersedia di PATH.
echo.
pause
exit /b 1

:use_py
echo Server berjalan di http://127.0.0.1:%PORT%
echo Tekan Ctrl+C untuk menghentikan server.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:%PORT%"
py -3 -m http.server %PORT% --bind 127.0.0.1
goto end

:use_python
echo Server berjalan di http://127.0.0.1:%PORT%
echo Tekan Ctrl+C untuk menghentikan server.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:%PORT%"
python -m http.server %PORT% --bind 127.0.0.1
goto end

:use_php
echo Server berjalan di http://127.0.0.1:%PORT%
echo Tekan Ctrl+C untuk menghentikan server.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:%PORT%"
php -S 127.0.0.1:%PORT%
goto end

:use_known_php
echo Server berjalan di http://127.0.0.1:%PORT%
echo Tekan Ctrl+C untuk menghentikan server.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:%PORT%"
"D:\DevTools\PHP\8.5\php.exe" -S 127.0.0.1:%PORT%
goto end

:end
echo.
echo Preview server sudah dihentikan.
pause
endlocal
