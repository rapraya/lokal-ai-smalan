@echo off
setlocal
cd /d "%~dp0"

echo.
echo ==========================================
echo   LOKAL AI SMALAN - LOCAL PREVIEW
echo ==========================================
echo.

if not exist "%~dp0index.html" (
  echo ERROR: index.html tidak ditemukan.
  echo Jalankan file ini dari folder project hasil ekstrak ZIP.
  echo.
  pause
  exit /b 1
)

REM Pilih port lokal yang tersedia agar tidak bentrok dengan aplikasi lain.
for /f %%P in ('powershell -NoProfile -Command "$l=New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback,0);$l.Start();$p=$l.LocalEndpoint.Port;$l.Stop();Write-Output $p" 2^>nul') do set "PORT=%%P"
if not defined PORT set "PORT=8766"

where py >nul 2>&1
if not errorlevel 1 goto use_py

where python >nul 2>&1
if not errorlevel 1 goto use_python

where php >nul 2>&1
if not errorlevel 1 goto use_php

if exist "D:\DevTools\PHP\8.5\php.exe" goto use_known_php

echo ERROR: Python 3 atau PHP CLI tidak ditemukan.
echo Install Python 3 atau pastikan PHP CLI tersedia di PATH.
echo.
pause
exit /b 1

:use_py
echo Menjalankan server dengan Python...
start "Lokal AI Preview Server" /D "%~dp0" py -3 -m http.server %PORT% --bind 127.0.0.1
goto wait_server

:use_python
echo Menjalankan server dengan Python...
start "Lokal AI Preview Server" /D "%~dp0" python -m http.server %PORT% --bind 127.0.0.1
goto wait_server

:use_php
echo Menjalankan server dengan PHP...
start "Lokal AI Preview Server" /D "%~dp0" php -S 127.0.0.1:%PORT% -t "%~dp0"
goto wait_server

:use_known_php
echo Menjalankan server dengan PHP...
start "Lokal AI Preview Server" /D "%~dp0" "D:\DevTools\PHP\8.5\php.exe" -S 127.0.0.1:%PORT% -t "%~dp0"
goto wait_server

:wait_server
echo Memeriksa apakah server sudah aktif...
powershell -NoProfile -Command "$p=%PORT%; for($i=0;$i -lt 20;$i++){try{$c=New-Object System.Net.Sockets.TcpClient;$c.Connect('127.0.0.1',$p);$c.Close();exit 0}catch{Start-Sleep -Milliseconds 250}};exit 1"
if errorlevel 1 (
  echo.
  echo ERROR: server tidak berhasil aktif.
  echo Periksa jendela "Lokal AI Preview Server" untuk pesan error.
  echo.
  pause
  exit /b 1
)

echo.
echo Preview aktif: http://127.0.0.1:%PORT%/
echo Jendela server harus tetap terbuka.
echo Tutup jendela server untuk menghentikan preview.
echo.
start "" "http://127.0.0.1:%PORT%/"
pause
endlocal
