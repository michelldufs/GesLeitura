# Script para build rápido apenas APK
Write-Host "📱 Gerando APK Android..." -ForegroundColor Cyan

# Configurar Java
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

npm run build
npx cap sync android

cd android
.\gradlew assembleDebug
cd ..

if ($LASTEXITCODE -eq 0) {
    $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
    $item = Get-Item $apkPath
    Write-Host "`n✅ APK atualizado!" -ForegroundColor Green
    Write-Host "📍 $($item.FullName)" -ForegroundColor Cyan
    Write-Host "📦 $([math]::Round($item.Length/1MB, 2)) MB" -ForegroundColor Cyan
    explorer.exe /select,$item.FullName
}
