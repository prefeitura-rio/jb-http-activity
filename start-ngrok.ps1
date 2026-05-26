# start-ngrok.ps1
# Inicia o servidor local + ngrok tunnel para testes com SFMC Sandbox

Write-Host "=== jb-http-activity - ngrok tunnel ===" -ForegroundColor Cyan

# 1. Build do Vue (se necessario)
Write-Host "[1/3] Build do frontend..." -ForegroundColor Yellow
cmd /c "npm run build 2>&1"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Build falhou!" -ForegroundColor Red
  exit 1
}
Write-Host "Build concluido!" -ForegroundColor Green

# 2. Iniciar servidor Node em background
Write-Host "[2/3] Iniciando servidor local na porta 3000..." -ForegroundColor Yellow
$env:JWT_DISABLED = "true"
$job = Start-Job -ScriptBlock {
  Set-Location "$using:PWD"
  $env:JWT_DISABLED = "true"
  node server/index.js
}
Start-Sleep 2

# Verificar se o servidor subiu
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -ErrorAction Stop
  Write-Host "Servidor OK: $($health | ConvertTo-Json)" -ForegroundColor Green
} catch {
  Write-Host "Servidor nao respondeu! Verifique o erro." -ForegroundColor Red
  Stop-Job $job
  exit 1
}

# 3. Iniciar ngrok
Write-Host "[3/3] Iniciando ngrok tunnel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Abrindo http://localhost:4040 para acompanhar o ngrok..." -ForegroundColor Cyan

# Iniciar ngrok
$ngrokPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe"
$ngrokProcess = Start-Process -FilePath "$ngrokPath\ngrok.exe" -ArgumentList "http 3000" -NoNewWindow -PassThru

Start-Sleep 4

# Tentar pegar a URL do ngrok via API local
try {
  $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction SilentlyContinue
  $url = $ngrokApi.tunnels[0].public_url
  Write-Host ""
  Write-Host "============================================" -ForegroundColor Magenta
  Write-Host "  NGROK URL: $url" -ForegroundColor Green
  Write-Host "============================================" -ForegroundColor Magenta
  Write-Host ""
  Write-Host "Instrucoes para testar no SFMC:" -ForegroundColor Yellow
  Write-Host "1. Acesse Setup > Installed Packages > jb-http-activity" -ForegroundColor White
  Write-Host "2. Edite o componente Journey Builder Activity" -ForegroundColor White
  Write-Host "3. Atualize o Endpoint URL para: $url" -ForegroundColor Cyan
  Write-Host "4. Atualize o config.json com a mesma URL (applicationExtensionKey)" -ForegroundColor White
  Write-Host "5. Salve e crie uma jornada de teste" -ForegroundColor White
  Write-Host ""
  Write-Host "Para testar manualmente o /execute:" -ForegroundColor Yellow
  Write-Host "  curl -X POST $url/execute -H 'Content-Type: application/json' -d '{\"inArguments\":[{\"method\":\"GET\"},{\"url\":\"https://jsonplaceholder.typicode.com/todos/1\"}]}'" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Pressione ENTER para encerrar o tunnel e o servidor..." -ForegroundColor Red
  Read-Host
} catch {
  Write-Host "Nao foi possivel obter a URL do ngrok automaticamente." -ForegroundColor Yellow
  Write-Host "Abra http://localhost:4040 no navegador para ver a URL." -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Pressione ENTER para encerrar..." -ForegroundColor Red
  Read-Host
}

# Cleanup
Stop-Job $job -ErrorAction SilentlyContinue
Remove-Job $job -ErrorAction SilentlyContinue
Stop-Process -Id $ngrokProcess.Id -Force -ErrorAction SilentlyContinue
Write-Host "Servidor e ngrok encerrados." -ForegroundColor Gray
