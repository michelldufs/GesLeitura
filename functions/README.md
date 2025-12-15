# Cloud Functions (Auth Users)

Esta pasta contém as funções necessárias para listar usuários do Firebase Authentication e (opcionalmente) sincronizá-los para o Firestore.

Funções
- listAuthUsers (callable): retorna lista paginada de usuários do Auth (uid, email, displayName, disabled, creationTime, lastSignInTime). Restringida a admin (role em `users/{uid}`).
- syncAuthUsersToFirestore (callable): cria/atualiza documentos em `Firestore/users/{uid}` a partir do Auth. Também restrita a admin.

Pré‑requisitos
- Node.js 18+
- Firebase CLI

Instalação (Windows PowerShell)
```powershell
npm i -g firebase-tools
cd functions
npm install
```

Login e configuração do projeto
```powershell
firebase login
firebase use gesleitura
```

Deploy das funções
```powershell
npm run build
firebase deploy --only functions
```

Emulador local (opcional)
```powershell
npm run start
```

Permissões (regras Firestore sugeridas)
```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function userDoc() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
    function isAdmin() { return request.auth != null && userDoc().role == 'admin'; }
    match /users/{uid} { allow read: if request.auth != null; allow write: if isAdmin(); }
  }
}
```

Observações
- A tela `pages/admin/Usuarios.tsx` já chama `listAuthUsers`. Se a função não estiver implantada, aparecerá aviso e a lista cairá para “Perfis” no Firestore.
- Para popular os perfis rapidamente, chame `syncAuthUsersToFirestore` via um snippet temporário ou adicione um botão quando desejar.
