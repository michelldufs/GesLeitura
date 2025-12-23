export type UserRole =
  | 'admin'
  | 'socio'
  | 'gerente'
  | 'financeiro'
  | 'operacional'
  | 'supervisor'
  | 'coleta';

export interface AuditLog {
  id?: string;
  timestamp: any; // Firestore Timestamp
  userId: string;
  action: 'create' | 'update' | 'soft-delete' | 'close-month';
  collection: string;
  docId: string;
  details: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  displayName?: string;
  role: UserRole;
  allowedLocalidades: string[]; // IDs
  active: boolean;
}

export interface Localidade {
  id: string;
  codigo?: string;
  nome: string;
  active: boolean;
}

export interface Secao {
  id: string;
  codigo?: string;
  nome: string;
  localidadeId: string;
  active: boolean;
}

export interface Rota {
  id: string;
  codigo?: string;
  nome: string;
  secaoId: string;
  localidadeId: string;
  active: boolean;
}

export interface Ponto {
  id: string;
  codigo?: string;
  nome: string;
  rotaId: string;
  localidadeId: string;
  comissao?: number;
  endereco?: string;
  telefone?: string;
  qtdEquipamentos?: number;
  participaDespesa?: boolean;
  coletoresVinculados?: string[]; // UIDs dos coletores autorizados
  active: boolean;
}

export interface Operador {
  id: string;
  codigo?: string;
  nome: string;
  fatorConversao?: number;
  pontoId: string;
  localidadeId: string;
  active: boolean;
}

export interface Cota {
  id: string;
  nome: string;
  porcentagem: number;
  localidadeId: string;
  participaPrejuizo: boolean;
  saldoAcumulado: number;
  active: boolean;
}

export interface Venda {
  id?: string;
  data: string; // YYYY-MM-DD
  timestamp: any;
  operadorId: string;
  pontoId: string;
  rotaId: string;
  localidadeId: string;
  coletorId?: string; // UID do coletor que registrou (para histórico)
  coletorNome?: string; // Nome do coletor (para relatórios)

  // Readings
  entradaAnterior: number;
  entradaAtual: number;
  totalEntrada: number;

  saidaAnterior: number;
  saidaAtual: number;
  totalSaida: number;

  totalGeral: number; // (Entrada - Saída)

  // Financials
  comissaoPorcentagem: number;
  valorComissao: number;
  despesa: number; // Expenses paid at the machine
  centroCustoId?: string; // Centro de custo da despesa
  totalFinal: number; // Net cash to company

  status_conferencia: 'pendente' | 'conferido';
  fotoUrl: string; // URL da foto no Firebase Storage
  descricao?: string; // Observação ou descrição da despesa/leitura
  editedBy?: string; // ID do usuário que fez a última edição
  editorName?: string; // Nome do usuário que fez a última edição
  editedAt?: any; // Data da última edição
  userId: string;
  active: boolean;
}

export interface DespesaGeral {
  id?: string;
  data: string;
  valor: number;
  descricao: string;
  userId: string;
  userName?: string;
  localidadeId: string;
  tipo: 'operacional' | 'adiantamento';
  centroCustoId?: string; // ID do centro de custo
  cotaId?: string; // Required if adiantamento
  active: boolean;
  // --- Novos campos para agendamento e recorrência ---
  agendadaPara?: string; // Data futura para execução (YYYY-MM-DD)
  recorrencia?: 'nenhuma' | 'semanal' | 'quinzenal' | 'mensal';
  totalParcelas?: number; // Total de parcelas (se parcelada)
  parcelaAtual?: number; // Número da parcela atual
  idDespesaPai?: string; // Para vincular parcelas/recorrências
  status?: 'paga' | 'pendente'; // Status do pagamento
}

export interface CentroCusto {
  id?: string;
  nome: string;
  descricao?: string;
  localidadeId: string;
  active: boolean;
}

export interface FechamentoMensal {
  id?: string;
  mes: number;
  ano: number;
  localidadeId: string;
  lucroLiquidoTotal: number;
  valorRetido: number;
  valorDistribuido: number;
  detalhesRateio: DetalheRateio[];
  fechadoPor: string;
  timestamp: any;
}

export interface DetalheRateio {
  nomeSocio: string;
  cotaId: string;
  resultadoMes: number;
  saldoAnteriorCompensado: number;
  adiantamentosDescontados: number;
  valorFinalRecebido: number; // Or value to pay/debt
  novoSaldoAcumulado: number;
}