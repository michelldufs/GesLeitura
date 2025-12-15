# Script para build e deploy completo
# Uso: .\build-all.ps1 [web|apk|all]

param(
    [string]$Target = "all"
)

Write-Host "🚀 Iniciando build..." -ForegroundColor Cyan

# Configurar Java
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

# 1. Build do projeto
Write-Host "`n📦 Building projeto..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build!" -ForegroundColor Red
    exit 1
}

# 2. Deploy Web
if ($Target -eq "web" -or $Target -eq "all") {
    Write-Host "`n🌐 Deploying para Firebase Hosting..." -ForegroundColor Yellow
    firebase deploy --only hosting
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Web atualizado: https://gesleitura.web.app" -ForegroundColor Green
    }
}

# 3. Gerar APK
if ($Target -eq "apk" -or $Target -eq "all") {
    Write-Host "`n📱 Gerando APK Android..." -ForegroundColor Yellow
    
    # Sincronizar com Android
    npx cap sync android
    
    # Gerar APK
    cd android
    .\gradlew assembleDebug
    cd ..
    
    if ($LASTEXITCODE -eq 0) {
        $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
        $item = Get-Item $apkPath
        Write-Host "✅ APK gerado com sucesso!" -ForegroundColor Green
        Write-Host "📍 Local: $($item.FullName)" -ForegroundColor Cyan
        Write-Host "📦 Tamanho: $([math]::Round($item.Length/1MB, 2)) MB" -ForegroundColor Cyan
        
        # Abrir pasta do APK
        explorer.exe /select,$item.FullName
    }
}

Write-Host "`n🎉 Processo concluído!" -ForegroundColor Green
