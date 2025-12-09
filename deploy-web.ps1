# Script para build rápido apenas WEB
Write-Host "🌐 Build e Deploy WEB..." -ForegroundColor Cyan

npm run build
if ($LASTEXITCODE -eq 0) {
    firebase deploy --only hosting
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Web atualizado!" -ForegroundColor Green
        Write-Host "🔗 https://gesleitura.web.app" -ForegroundColor Cyan
    }
}
