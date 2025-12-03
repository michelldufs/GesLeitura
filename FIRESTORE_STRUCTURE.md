# Estrutura do Firestore - GesLeitura

## Collections do Backend Firebase

### 1. `users`
```typescript
{
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'socio' | 'gerente' | 'coleta';
  allowedLocalidades: string[];
  active: boolean;
  allowedDeviceSerial?: string; // Para binding de dispositivo mobile
}
```

### 2. `audit_logs`
```typescript
{
  id?: string;
  timestamp: Timestamp;
  userId: string;
  action: 'create' | 'update' | 'soft-delete' | 'close-month';
  collection: string;
  docId: string;
  details: string;
}
```

### 3. `localidades`
```typescript
{
  id: string;
  nome: string;
  active: boolean;
}
```

### 4. `secoes`
```typescript
{
  id: string;
  nome: string;
  localidadeId: string;
  active: boolean;
}
```

### 5. `rotas`
```typescript
{
  id: string;
  nome: string;
  secaoId: string;
  localidadeId: string;
  active: boolean;
}
```

### 6. `pontos`
```typescript
{
  id: string;
  nome: string;
  endereco: string;
  rotaId: string;
  secaoId: string;
  localidadeId: string;
  active: boolean;
}
```

### 7. `operadores`
```typescript
{
  id: string;
  codigo: number;
  nome: string;
  pontoId: string;
  rotaId: string;
  secaoId: string;
  localidadeId: string;
  active: boolean;
}
```

### 8. `cotas`
```typescript
{
  id: string;
  nome: string;
  porcentagem: number;
  localidadeId: string;
  participaPrejuizo: boolean;
  saldoAcumulado: number;
  active: boolean;
}
```

### 9. `vendas` (Leituras)
```typescript
{
  id?: string;
  data: string; // YYYY-MM-DD
  timestamp: Timestamp;
  operadorId: string;
  pontoId: string;
  rotaId: string;
  localidadeId: string;
  
  entradaAnterior: number;
  entradaAtual: number;
  totalEntrada: number;
  
  saidaAnterior: number;
  saidaAtual: number;
  totalSaida: number;
  
  totalGeral: number;
  comissaoPorcentagem: number;
  valorComissao: number;
  despesa: number;
  totalFinal: number;
  
  status_conferencia: 'pendente' | 'conferido';
  fotoUrl: string; // URL do Firebase Storage
  userId: string;
  active: boolean;
}
```

### 10. `despesas_gerais`
```typescript
{
  id?: string;
  data: string;
  valor: number;
  descricao: string;
  userId: string;
  localidadeId: string;
  tipo: 'operacional' | 'adiantamento';
  cotaId?: string; // Obrigatório se tipo='adiantamento'
  active: boolean;
}
```

### 11. `fechamentos_mensais`
```typescript
{
  id?: string;
  mes: number;
  ano: number;
  localidadeId: string;
  lucroLiquidoTotal: number;
  valorRetido: number;
  valorDistribuido: number;
  detalhesRateio: DetalheRateio[];
  fechadoPor: string;
  timestamp: Timestamp;
}

// DetalheRateio (embedded)
{
  nomeSocio: string;
  cotaId: string;
  resultadoMes: number;
  saldoAnteriorCompensado: number;
  adiantamentosDescontados: number;
  valorFinalRecebido: number;
  novoSaldoAcumulado: number;
}
```

## Firebase Storage

### Estrutura de Pastas:
```
/leituras/{timestamp}_{filename}
```

Armazena fotos das máquinas enviadas pelos coletores.

## Regras de Segurança (Firestore Rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - apenas admins podem escrever
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'admin';
    }
    
    // Audit logs - apenas leitura para admins
    match /audit_logs/{logId} {
      allow read: if request.auth != null && request.auth.token.role in ['admin', 'gerente'];
      allow write: if request.auth != null;
    }
    
    // Vendas - leitura para todos autenticados, escrita para coletores e admins
    match /vendas/{vendaId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                       request.auth.token.role in ['coleta', 'admin', 'gerente'];
      allow update: if request.auth != null && 
                       request.auth.token.role in ['admin', 'gerente'];
    }
    
    // Fechamentos - apenas admins e sócios
    match /fechamentos_mensais/{fechamentoId} {
      allow read: if request.auth != null && 
                     request.auth.token.role in ['admin', 'socio', 'gerente'];
      allow write: if request.auth != null && 
                      request.auth.token.role == 'admin';
    }
    
    // Regra geral para outras collections
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.token.role in ['admin', 'gerente'];
    }
  }
}
```

## Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /leituras/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.token.role in ['coleta', 'admin', 'gerente'];
    }
  }
}
```

## Status de Sincronização

✅ **Frontend ↔ Backend: SINCRONIZADO**

- Todos os types TypeScript correspondem às collections do Firestore
- Campos obrigatórios estão mapeados
- Firebase Storage configurado para upload de fotos
- Soft delete implementado com campo `active`
- Logs de auditoria em todas operações críticas
- Trava de período fechado implementada
