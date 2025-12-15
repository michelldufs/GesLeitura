# 📱 Guia: Gerar APK para Android - GesLeitura

## 🎯 O que já foi feito

✅ Capacitor configurado
✅ Projeto Android criado (pasta `android/`)
✅ Build web compilado
✅ Arquivos sincronizados

## 📋 Pré-requisitos

Você precisa instalar:

### 1. **Java JDK 17** (Obrigatório)
**Download:** https://adoptium.net/temurin/releases/

- Escolha: **JDK 17** (LTS)
- Sistema: **Windows x64**
- Clique em `.msi` e instale

**Após instalar, configurar variável de ambiente:**
```powershell
# Adicionar JAVA_HOME (ajuste o caminho se necessário)
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Eclipse Adoptium\jdk-17.0.9.9-hotspot', 'Machine')

# Adicionar ao PATH
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
[System.Environment]::SetEnvironmentVariable('Path', "$currentPath;%JAVA_HOME%\bin", 'Machine')
```

### 2. **Android Studio** (Recomendado)
**Download:** https://developer.android.com/studio

- Instale com todas as opções padrão
- Durante instalação, instale também o **Android SDK**

---

## 🚀 Método 1: Com Android Studio (FÁCIL)

### Passo 1: Abrir projeto
```powershell
npx cap open android
```

### Passo 2: No Android Studio
1. Aguardar sincronização do Gradle (barra inferior)
2. Ir em: **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. Aguardar conclusão (~5-10 min na primeira vez)
4. Clicar em **locate** quando aparecer notificação

### Passo 3: Localizar APK
Caminho: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔧 Método 2: Linha de Comando (Sem Android Studio)

### Pré-requisitos adicionais
- **Java JDK 17** instalado
- **Android SDK** instalado manualmente

### Comandos
```powershell
# 1. Entrar na pasta android
cd android

# 2. Gerar APK de debug
.\gradlew assembleDebug

# 3. Voltar para pasta raiz
cd ..
```

### Localizar APK gerado
```powershell
# APK estará em:
android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 📲 Instalar APK no Celular

### Método 1: Via USB (Recomendado)

**No celular:**
1. Ir em **Configurações > Sobre o telefone**
2. Tocar 7 vezes em **Número da versão** (ativa modo desenvolvedor)
3. Voltar e entrar em **Opções do desenvolvedor**
4. Ativar **Depuração USB**

**No PC:**
```powershell
# Conectar celular via USB

# Instalar APK
cd android
.\gradlew installDebug
cd ..
```

### Método 2: Download Direto

**1. Copiar APK para uma nuvem:**
```powershell
# APK está em:
android\app\build\outputs\apk\debug\app-debug.apk

# Upload para Google Drive, Dropbox, etc
```

**2. No celular:**
- Baixar APK
- Permitir instalação de fontes desconhecidas
- Instalar

---

## 🔄 Workflow Completo (Após configuração inicial)

```powershell
# 1. Fazer alterações no código
# 2. Build
npm run build

# 3. Sincronizar com Android
npx cap sync android

# 4. Gerar APK
cd android
.\gradlew assembleDebug
cd ..

# 5. APK estará em:
# android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 🎨 Personalizar App

### Ícone do App
Substituir: `android/app/src/main/res/mipmap-*/ic_launcher.png`

### Nome do App
Editar: `android/app/src/main/res/values/strings.xml`
```xml
<string name="app_name">VendingGuard</string>
```

### Splash Screen
Editar: `capacitor.config.json`
```json
"SplashScreen": {
  "backgroundColor": "#1e293b",
  "launchShowDuration": 2000
}
```

---

## 🐛 Resolução de Problemas

### Erro: "JAVA_HOME is not set"
**Solução:** Instalar Java JDK 17 e configurar variável de ambiente

### Erro: "SDK location not found"
**Solução:** Instalar Android Studio ou configurar ANDROID_HOME

### Erro: "Failed to sync Gradle"
**Solução:** 
```powershell
cd android
.\gradlew --stop
.\gradlew clean
cd ..
npx cap sync android
```

### APK muito grande
**Otimizar:**
```powershell
# Gerar APK de release (menor)
cd android
.\gradlew assembleRelease
cd ..
```

---

## 📊 Comparação de Métodos

| Método | Facilidade | Velocidade | Requer |
|--------|-----------|------------|--------|
| **Android Studio** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Android Studio |
| **Linha de Comando** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Java JDK |
| **Nuvem (EAS Build)** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Conta Expo |

---

## 🎯 Próximos Passos (Após primeiro APK)

1. **Testar no celular** todas as funcionalidades
2. **Verificar performance** (FPS, carregamento)
3. **Testar offline** (PWA + Service Worker)
4. **Otimizar** se necessário
5. **Gerar APK de Release** para distribuição

---

## 📞 Comandos Úteis

```powershell
# Ver dispositivos conectados
adb devices

# Instalar APK via ADB
adb install android\app\build\outputs\apk\debug\app-debug.apk

# Ver logs do app
adb logcat | Select-String "Capacitor"

# Limpar build
cd android; .\gradlew clean; cd ..
```

---

## ✅ Checklist Final

Antes de distribuir o APK:

- [ ] Testar login
- [ ] Testar CRUD de localidades
- [ ] Testar lançamento de vendas
- [ ] Testar relatórios
- [ ] Verificar permissões (camera, storage)
- [ ] Testar em diferentes tamanhos de tela
- [ ] Verificar performance
- [ ] Testar offline

---

**Status:** 🟡 Aguardando instalação do Java JDK
**Próximo Passo:** Instalar Java JDK 17
**Depois:** Executar `cd android; .\gradlew assembleDebug; cd ..`
