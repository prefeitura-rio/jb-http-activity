@echo off
REM ==========================================
REM jb-http-activity - Start local + ngrok tunnel
REM ==========================================
echo === jb-http-activity ===
echo.

REM Build frontend
echo [1/3] Build do frontend...
call npm run build
if %errorlevel% neq 0 (
  echo Build falhou!
  pause
  exit /b 1
)
echo Build concluido!
echo.

REM Start server
echo [2/3] Iniciando servidor local...
set JWT_DISABLED=true
start "jb-http-activity" cmd /c "node server/index.js"
timeout /t 3 /nobreak >nul
echo Servidor rodando em http://localhost:3000
echo.

REM Start ngrok
echo [3/3] Iniciando ngrok tunnel...
echo.
echo Abra http://localhost:4040 no navegador para ver a URL.
echo.
echo ATENCAO: Atualize o config.json e o SFMC Installed Package com a URL do ngrok
echo.
start "ngrok" cmd /c "ngrok http 3000"
echo.
echo Pressione qualquer tecla para encerrar...
pause >nul

REM Cleanup
taskkill /f /im ngrok.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo Servidor e ngrok encerrados.
