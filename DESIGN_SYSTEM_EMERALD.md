# 🎨 Design System - Fintech Clean & Minimalist

## 📋 Visão Geral
Sistema de design moderno implementado em toda a aplicação GesLeitura, inspirado em Stripe e Nubank, com foco em interfaces limpas, minimalistas e profissionais.

---

## 🎨 Paleta de Cores

### Cor Primária
- **Emerald-600** (`#059669`) - Cor principal da marca
  - Botões primários
  - Links ativos
  - Ícones destacados
  - Navegação ativa

### Backgrounds
- **White** (`#FFFFFF`) - Cards, modais, sidebar
- **Gray-50** (`#F9FAFB`) - Background principal das páginas
- **Gray-100** (`#F3F4F6`) - Inputs inativos, botões secundários

### Texto
- **Gray-900** (`#111827`) - Títulos principais
- **Gray-700** (`#374151`) - Texto secundário
- **Gray-600** (`#4B5563`) - Labels
- **Gray-500** (`#6B7280`) - Placeholders, descrições

### Cores de Status
- **Emerald-50/600** - Sucesso, aprovação, ativo
- **Rose-50/600** - Erros, exclusão, alertas
- **Orange-50/600** - Despesas, avisos
- **Blue-50/600** - Informação, neutro
- **Purple-50/600** - Comissões, secundário

---

## 🧱 Componentes Base

### Cards
```tsx
className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
```
- Fundo branco limpo
- Bordas arredondadas `rounded-2xl` (16px)
- Sombra suave `shadow-sm`
- Borda cinza clara `border-gray-100`

### Botões Primários
```tsx
className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 shadow-lg shadow-emerald-600/20"
```
- Background emerald-600
- Hover emerald-700
- Cantos arredondados `rounded-xl` (12px)
- Sombra colorida suave (20% opacity)

### Botões Secundários (Ativos)
```tsx
className="bg-emerald-50 text-emerald-700 rounded-xl px-4 py-2"
```
- Background emerald-50 (muito claro)
- Texto emerald-700
- Sem sombra

### Inputs
```tsx
className="bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl px-4 py-2 border border-gray-200"
```
- Background cinza claro, branco no foco
- Ring emerald-500 no foco
- Placeholder `text-gray-400`

### Badges
```tsx
className="bg-emerald-50 text-emerald-600 rounded-full px-3 py-1 text-xs font-medium"
```
- Background colorido suave (50)
- Texto saturado (600)
- Totalmente arredondado `rounded-full`

### Alerts
```tsx
// Sucesso
className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl p-4"

// Erro
className="bg-rose-50 text-rose-600 border border-rose-100 rounded-xl p-4"

// Aviso
className="bg-orange-50 text-orange-600 border border-orange-100 rounded-xl p-4"
```

---

## 📱 Layouts

### Desktop Sidebar
- **Background**: `bg-white`
- **Border**: `border-r border-gray-200`
- **Item Ativo**: `bg-emerald-50 text-emerald-700 rounded-xl`
- **Item Inativo**: `text-gray-600 hover:bg-gray-50 rounded-xl`
- **Section Titles**: `text-gray-500 text-xs font-bold uppercase`

### Mobile Header
- **Background**: `bg-gradient-to-r from-emerald-600 to-emerald-700`
- **Text**: `text-white`
- **Icons**: `text-emerald-200`

### Mobile Bottom Nav
- **Background**: `bg-white border-t border-gray-200`
- **Aba Ativa (Histórico)**: `bg-emerald-50 text-emerald-600 rounded-xl`
- **Aba Ativa (Nova Leitura)**: `bg-green-50 text-green-600 rounded-xl`
- **Inativa**: `text-gray-600 hover:text-gray-900`

---

## 📊 Gráficos (Recharts)

### Configuração de Cores
```tsx
<BarChart>
  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
  <XAxis tick={{ fill: '#6b7280' }} />
  <YAxis tick={{ fill: '#6b7280' }} />
  <Bar dataKey="value" fill="#059669" radius={[8, 8, 0, 0]} />
</BarChart>
```

- **Grid**: `#f3f4f6` (gray-100)
- **Barras**: `#059669` (emerald-600)
- **Ticks**: `#6b7280` (gray-500)
- **Radius**: `8px` para suavidade

### Tooltip
```tsx
contentStyle={{
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  backgroundColor: 'white'
}}
```

---

## 🎯 Cards de KPI (Dashboard)

### Estrutura
```tsx
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
  <div className="flex items-center justify-between mb-4">
    <div className="bg-violet-50 text-violet-600 rounded-full p-3 text-2xl">
      📍
    </div>
  </div>
  <p className="text-gray-500 text-sm font-medium mb-1">LABEL</p>
  <h3 className="text-gray-900 text-3xl font-bold tracking-tight">1.234</h3>
  <p className="text-gray-500 text-xs mt-2">descrição</p>
</div>
```

### Cores de Ícones
- Pontos: `bg-violet-50 text-violet-600`
- Valores: `bg-blue-50 text-blue-600`
- Comissões: `bg-purple-50 text-purple-600`
- Despesas: `bg-orange-50 text-orange-600`
- Lucro: `bg-emerald-50 text-emerald-600`

---

## 📐 Espaçamentos

### Padding
- Cards: `p-6` (24px)
- Inputs: `px-4 py-2` (16px horizontal, 8px vertical)
- Badges: `px-3 py-1` (12px horizontal, 4px vertical)

### Gap
- Grid de cards: `gap-4` (16px)
- Botões inline: `gap-2` (8px)
- Elementos próximos: `gap-3` (12px)

### Margin
- Entre seções: `mb-6` (24px)
- Entre elementos: `mb-4` (16px)
- Labels/inputs: `mb-2` (8px)

---

## 🔤 Tipografia

### Títulos
- **Página**: `text-xl font-bold text-gray-900`
- **Seção**: `text-lg font-bold text-gray-900`
- **Card**: `text-sm font-medium text-gray-500`

### Valores
- **Principal**: `text-3xl font-bold tracking-tight text-gray-900`
- **Secundário**: `text-xl font-bold text-white` (em gradientes)
- **Pequeno**: `text-sm font-bold text-gray-700`

### Corpo
- **Normal**: `text-sm text-gray-600`
- **Pequeno**: `text-xs text-gray-500`
- **Placeholder**: `text-gray-400`

---

## ✨ Efeitos e Animações

### Transições
```tsx
className="transition-all duration-200"
```

### Hover States
- Botões: `hover:bg-emerald-700` (escurecer 100)
- Cards: `hover:bg-gray-50`
- Links: `hover:text-gray-900`

### Shadows
- Cards: `shadow-sm`
- Botões: `shadow-lg shadow-emerald-600/20`
- Modais: `shadow-2xl`

---

## 📦 Componentes Implementados

### ✅ Desktop
- [x] MacOSDesign.tsx (biblioteca base)
- [x] Dashboard.tsx (página principal)
- [x] AdminLayout.tsx (sidebar + header)

### ✅ Mobile
- [x] MobileLayout.tsx (header + bottom nav)
- [x] HistoricoLeituras.tsx (histórico)

### 🟡 Pendentes
- [ ] NovaLeituraMobile.tsx
- [ ] Pontos.tsx
- [ ] Rotas.tsx
- [ ] Operadores.tsx
- [ ] CaixaGeral.tsx
- [ ] Despesas.tsx
- [ ] ConfiguracaoCotas.tsx
- [ ] Relatorios.tsx

---

## 🎨 Princípios de Design

### 1. **Minimalismo**
- Sem gradientes excessivos
- Bordas suaves e discretas
- Uso generoso de espaço em branco

### 2. **Hierarquia Visual**
- Tamanhos de fonte claros (xs → 3xl)
- Cores semânticas (emerald = sucesso, rose = erro)
- Espaçamento consistente

### 3. **Acessibilidade**
- Contraste adequado (WCAG AA)
- Tamanhos de toque >= 44px (mobile)
- Labels descritivos

### 4. **Responsividade**
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Touch-friendly no mobile

### 5. **Consistência**
- Mesma paleta em Desktop/Mobile
- Padrões reutilizáveis
- Design System centralizado

---

## 🚀 Como Usar

### Aplicar em Novos Componentes

1. **Importar componentes base**:
```tsx
import { GlassCard, ButtonPrimary, InputField } from '../components/MacOSDesign';
```

2. **Usar classes Tailwind padrão**:
```tsx
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
  <ButtonPrimary>Ação Principal</ButtonPrimary>
</div>
```

3. **Seguir paleta de cores**:
- Primário: `emerald-600`
- Texto: `gray-900`, `gray-600`, `gray-500`
- Backgrounds: `white`, `gray-50`, `gray-100`

---

## 📝 Notas de Implementação

- Todas as mudanças são retrocompatíveis
- Sem breaking changes em APIs
- TypeScript compliant
- Zero erros de lint/compilação

---

**Última atualização**: 2024
**Versão**: 1.0.0
**Status**: ✅ Design System Implementado (Desktop + Mobile)
