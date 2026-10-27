@echo off
setlocal
cd /d "%~dp0"
title Bien Vendre - Website Lokal
set NODE_ENV=development
set MAIL_MODE=local
set HOST=127.0.0.1
where node >nul 2>nul
if errorlevel 1 (
  echo Instal Node.js LTS versi 22 atau lebih baru dari https://nodejs.org/
  echo Setelah instalasi selesai, buka kembali file ini.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)"
if errorlevel 1 (
  echo Node.js terlalu lama. Instal Node.js LTS versi 22 atau lebih baru.
  pause
  exit /b 1
)
if not exist node_modules\.bin\vite.cmd (
  echo Memasang kebutuhan aplikasi. Internet diperlukan pada tahap ini.
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 goto gagal
)
echo Menyiapkan database dan website lokal. Data yang sudah ada dipertahankan.
call npm.cmd run setup
if errorlevel 1 goto gagal
set OPEN_BROWSER=1
echo Website akan terbuka di browser. Biarkan jendela ini tetap berjalan.
echo Untuk berhenti, tekan Ctrl+C.
call npm.cmd run dev
if errorlevel 1 goto gagal
exit /b 0
:gagal
echo.
echo Aplikasi belum berhasil dimulai. Periksa pesan di atas.
echo Jika database atau port sedang dipakai, hentikan server sebelumnya dahulu.
pause
exit /b 1
