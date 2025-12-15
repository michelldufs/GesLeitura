# 🧪 Guia de Testes - VendingGuard SaaS

## 📋 Pré-requisitos

Certifique-se de que o servidor está rodando:
```bash
npm run dev
```

Acesse: **http://localhost:3000/**

## 🔐 1. Teste de Login

### Criar Usuário de Teste no Firebase Console

1. Acesse o **Firebase Console**: https://console.firebase.google.com/
2. Selecione o projeto: **gesleitura**
3. Vá em **Authentication** → **Users** → **Add User**
4. Crie um usuário com:
   - **Email**: `admin@sistema.local`
   - **Password**: `Admin123!`

5. Após criar, vá em **Firestore Database** → **users** → **Add Document**
   - **Document ID**: (mesmo UID do usuário criado)
   - Campos:
     ```json
     {
       "uid": "UID_DO_USUARIO",
       "name": "Administrador",
       "email": "admin@sistema.local",
       "role": "admin",
       "allowedLocalidades": [],
       "active": true
     }
     ```

### Testar Login

1. Na página de login, use:
   - **Usuário**: `admin`
   - **Senha**: `Admin123!`

2. O sistema concatena automaticamente `@sistema.local` ao username

## 📍 2. Teste do Fluxo Operacional

### Ordem de Cadastro:

#### 2.1 Cadastrar Localidades
1. Menu: **Administração** → **Localidade**
2. Adicione localidades:
   - `São Paulo - Centro`
   - `Rio de Janeiro - Zona Sul`
   - `Belo Horizonte - Centro`

#### 2.2 Cadastrar Seções
1. Menu: **Operacional** → **Seção**
2. Para cada localidade, crie seções:
   - Localidade: `São Paulo - Centro`
     - Seção: `Seção A - Comércio`
     - Seção: `Seção B - Escritórios`

#### 2.3 Cadastrar Rotas
1. Menu: **Operacional** → **Rota**
2. Para cada seção, crie rotas:
   - Localidade: `São Paulo - Centro`
   - Seção: `Seção A - Comércio`
     - Rota: `Rota 1 - Manhã`
     - Rota: `Rota 2 - Tarde`

#### 2.4 Cadastrar Pontos (Pendente)
- Esta página ainda não foi implementada (Placeholder)
- Campos necessários:
  - Nome
  - Endereço
  - Rota
  - Seção
  - Localidade

#### 2.5 Cadastrar Operadores (Pendente)
- Esta página ainda não foi implementada (Placeholder)
- Campos necessários:
  - Código
  - Nome
  - Ponto
  - Rota
  - Seção
  - Localidade

## 💰 3. Teste Financeiro

### 3.1 Configurar Cotas (Sócios)
1. Menu: **Financeiro** → **Sócios & Cotas**
2. Adicione sócios:
   - Nome: `João Silva`
   - Porcentagem: `50%`
   - Participa Prejuízo: `Sim`
   - Localidade: `São Paulo - Centro`

### 3.2 Lançamento Manual de Leitura
1. Menu: **Operacional** → **Nova Leitura**
2. Preencha os dados:
   - **Operador**: (selecione um operador cadastrado)
   - **Leituras**:
     - Entrada Anterior: `1000`
     - Entrada Atual: `1500`
     - Saída Anterior: `200`
     - Saída Atual: `300`
   - **Financeiro**:
     - Data: Data atual
     - Comissão: `20%`
     - Despesas: `50.00`

### 3.3 Caixa Geral
1. Menu: **Financeiro** → **Caixa Geral**
2. Visualize o resumo mensal
3. Faça o fechamento do mês

## 👥 4. Teste de Usuários

1. Menu: **Administração** → **Usuários**
2. Crie usuários com diferentes roles:
   - **Admin**: Acesso total
   - **Gerente**: Visualização e gestão
   - **Sócio**: Visualização financeira
   - **Coleta**: Apenas app mobile

## 📱 5. Teste Mobile (App de Coleta)

### Criar Usuário Coletor:
1. No Firebase Authentication, crie:
   - Email: `coletor1@sistema.local`
   - Senha: `Coletor123!`

2. No Firestore, adicione em **users**:
   ```json
   {
     "uid": "UID_DO_COLETOR",
     "name": "Coletor 1",
     "email": "coletor1@sistema.local",
     "role": "coleta",
     "allowedLocalidades": ["ID_DA_LOCALIDADE"],
     "active": true
   }
   ```

3. Faça login com:
   - Usuário: `coletor1`
   - Senha: `Coletor123!`

4. O sistema automaticamente exibirá o **MobileLayout**
5. Teste o registro de leitura com upload de foto

## ✅ Checklist de Testes

- [ ] Login com usuário admin
- [ ] Cadastro de Localidades
- [ ] Cadastro de Seções vinculadas a Localidades
- [ ] Cadastro de Rotas vinculadas a Seções
- [ ] Cadastro de Cotas (Sócios)
- [ ] Lançamento manual de leitura
- [ ] Visualização do Caixa Geral
- [ ] Login com usuário coletor
- [ ] Interface mobile para coleta
- [ ] Upload de foto na leitura mobile
- [ ] Logout

## 🐛 Problemas Conhecidos

1. **Pontos e Operadores**: Páginas ainda não implementadas (placeholders)
2. **Upload de Foto no Desktop**: Implementação básica, precisa de melhorias
3. **Relatórios**: Páginas ainda não implementadas

## 🔒 Regras de Segurança do Firestore

As regras de segurança estão documentadas em `FIRESTORE_STRUCTURE.md`.

Para aplicá-las:
1. Vá em **Firestore Database** → **Rules**
2. Copie as regras do arquivo `FIRESTORE_STRUCTURE.md`
3. Publique as regras

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador (F12)
2. Verifique o terminal onde o servidor está rodando
3. Confira as credenciais do Firebase em `services/firebaseConfig.ts`

## 🎯 Próximos Passos

1. Implementar páginas de Pontos e Operadores
2. Implementar páginas de Relatórios
3. Melhorar upload de fotos
4. Adicionar validações adicionais
5. Implementar Dashboard com dados reais
6. Gerar APK para Android via Capacitor

---

**Data do teste**: 3 de dezembro de 2025  
**Versão**: 1.0.0
