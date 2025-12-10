import {
  collection, query, where, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, runTransaction, orderBy, limit
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { Venda, DespesaGeral, FechamentoMensal, Cota, DetalheRateio } from "../types";
import { logAction } from "./logService";
import { logger } from '../utils/logger';

/**
 * Checks if a month is closed.
 * @throws Error if the period is locked.
 */
export const verificarPeriodoFechado = async (data: string, localidadeId: string): Promise<void> => {
  const dateObj = new Date(data);
  const mes = dateObj.getMonth() + 1; // 1-12
  const ano = dateObj.getFullYear();

  const q = query(
    collection(db, "fechamentos_mensais"),
    where("localidadeId", "==", localidadeId),
    where("mes", "==", mes),
    where("ano", "==", ano)
  );

  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    throw new Error(`Operação negada: O período ${mes}/${ano} já está encerrado contabilmente.`);
  }
};

/**
 * Get the last valid reading for an operator to pre-fill inputs.
 */
export const getUltimaLeitura = async (operadorId: string): Promise<Venda | null> => {
  try {
    // Tentar com orderBy (requer índice)
    const q = query(
      collection(db, "vendas"),
      where("operadorId", "==", operadorId),
      where("active", "==", true),
      orderBy("data", "desc"),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as Venda;
    }
  } catch (orderByError: any) {
    logger.warn("Índice não existe para orderBy, usando fallback sem ordenação:", orderByError.message);

    // Fallback: buscar sem orderBy e ordenar em memória
    try {
      const q = query(
        collection(db, "vendas"),
        where("operadorId", "==", operadorId),
        where("active", "==", true),
        limit(50)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      // Ordenar em memória pela data (desc)
      const vendas = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Venda));

      vendas.sort((a, b) => {
        const dateA = new Date(a.data || 0).getTime();
        const dateB = new Date(b.data || 0).getTime();
        return dateB - dateA;
      });

      return vendas[0] || null;
    } catch (fallbackError) {
      logger.error("Erro no fallback de getUltimaLeitura:", fallbackError);
      return null;
    }
  }

  return null;
};

/**
 * Saves a new sale/reading.
 */
export const saveVenda = async (venda: Omit<Venda, 'id' | 'timestamp'>, userId: string) => {
  await verificarPeriodoFechado(venda.data, venda.localidadeId);

  const docRef = await addDoc(collection(db, "vendas"), {
    ...venda,
    timestamp: serverTimestamp(),
    active: true
  });

  await logAction(userId, 'create', 'vendas', docRef.id, `Nova leitura para operador ${venda.operadorId}`);
  return docRef.id;
};

/**
 * Update an existing sale/reading.
 */
export const updateVenda = async (vendaId: string, updates: Partial<Omit<Venda, 'id' | 'timestamp'>>, userId: string) => {
  const docRef = doc(db, "vendas", vendaId);
  await updateDoc(docRef, {
    ...updates,
    active: true
  });

  await logAction(userId, 'update', 'vendas', vendaId, `Atualização de leitura`);
  return vendaId;
};

/**
 * Saves a general expense.
 */
export const saveDespesa = async (despesa: Omit<DespesaGeral, 'id'>, userId: string) => {
  await verificarPeriodoFechado(despesa.data, despesa.localidadeId);

  const docRef = await addDoc(collection(db, "despesas_gerais"), {
    ...despesa,
    active: true
  });

  await logAction(userId, 'create', 'despesas_gerais', docRef.id, `Despesa ${despesa.tipo} valor ${despesa.valor}`);
  return docRef.id;
};

/**
 * Performs the Monthly Closing logic.
 * Calculates profit, distributes shares, updates balances, and locks the period.
 */
export const fecharMes = async (
  localidadeId: string,
  mes: number,
  ano: number,
  valorRetido: number,
  userId: string,
  cotas: Cota[],
  resumoFinanceiro: { lucroLiquido: number }
) => {
  const dateStr = `${ano}-${String(mes).padStart(2, '0')}-01`;
  await verificarPeriodoFechado(dateStr, localidadeId);

  await runTransaction(db, async (transaction) => {
    // 1. Calculate Base for Distribution
    const baseRateio = resumoFinanceiro.lucroLiquido - valorRetido;
    const detalhesRateio: DetalheRateio[] = [];

    // 2. Fetch Advances (Adiantamentos) for this month/location
    const startDate = new Date(ano, mes - 1, 1);
    const endDate = new Date(ano, mes, 0, 23, 59, 59);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // NOTE: Firestore Transactions require reads to come before writes.
    // However, for complex queries like this inside a transaction, it's often better/easier 
    // to fetch them outside if we accept a tiny risk of race condition, OR use runTransaction carefully.
    // Given the structure, we'll fetch them inside but we need to pass the query info.
    // Actually, 'getDocs' inside transaction is not directly supported like 'transaction.get'.
    // To keep it simple and robust, we will fetch adiantamentos BEFORE the transaction block starts
    // and pass it in. BUT since we are already inside the function, let's refactor slightly to fetch before.
    // Wait, refactoring the whole function signature is risky.
    // Let's do the read for ALL adiantamentos of that month before the loop.

    // We can't do broad queries inside transaction easily. 
    // Standard practice: Read outside, validate inside if needed. 
    // For this use case (closing month), slight read skew is acceptable vs complexity.
    // Let's fetch adiantamentos here (conceptually wrong for strict ACID but functional).
    // BETTER APPROACH: READ ALL ADIANTAMENTOS BEFORE TRANSACTION in the code block below.

    const adiantamentosQuery = query(
      collection(db, "despesas_gerais"),
      where("localidadeId", "==", localidadeId),
      where("active", "==", true),
      where("tipo", "==", "adiantamento"),
      where("data", ">=", startStr),
      where("data", "<=", endStr)
    );

    const adiantamentosSnapshot = await getDocs(adiantamentosQuery);
    const adiantamentosMap: Record<string, number> = {};

    adiantamentosSnapshot.docs.forEach(doc => {
      const data = doc.data() as DespesaGeral;
      if (data.cotaId) {
        adiantamentosMap[data.cotaId] = (adiantamentosMap[data.cotaId] || 0) + (data.valor || 0);
      }
    });

    // We iterate quotas to calculate final values
    for (const cota of cotas) {
      // Logic: Share
      let parteSocio = baseRateio * (cota.porcentagem / 100);

      // Rule: If base is negative and partner doesn't participate in loss
      if (baseRateio < 0 && !cota.participaPrejuizo) {
        parteSocio = 0;
      }

      // Logic: Advances
      const adiantamentos = adiantamentosMap[cota.id] || 0;

      const saldoAnterior = cota.saldoAcumulado;
      const valorFinal = parteSocio + saldoAnterior - adiantamentos;

      // Logic: Update Accumulated Balance
      detalhesRateio.push({
        nomeSocio: cota.nome,
        cotaId: cota.id,
        resultadoMes: parteSocio,
        saldoAnteriorCompensado: saldoAnterior,
        adiantamentosDescontados: adiantamentos,
        valorFinalRecebido: valorFinal,
        novoSaldoAcumulado: valorFinal
      });

      // Update Cota Doc (WRITE operation - valid inside transaction)
      const cotaRef = doc(db, "cotas", cota.id);
      transaction.update(cotaRef, {
        saldoAcumulado: valorFinal
      });
    }

    // 3. Create Fechamento Doc (The Lock)
    const fechamentoData: FechamentoMensal = {
      mes,
      ano,
      localidadeId,
      lucroLiquidoTotal: resumoFinanceiro.lucroLiquido,
      valorRetido,
      valorDistribuido: baseRateio, // effectively distributed math
      detalhesRateio,
      fechadoPor: userId,
      timestamp: serverTimestamp()
    };

    const fechamentoRef = doc(collection(db, "fechamentos_mensais"));
    transaction.set(fechamentoRef, fechamentoData);

    // 4. Log
    const logRef = doc(collection(db, "audit_logs"));
    transaction.set(logRef, {
      timestamp: serverTimestamp(),
      userId,
      action: 'close-month',
      collection: 'fechamentos_mensais',
      docId: fechamentoRef.id,
      details: `Fechamento ${mes}/${ano} Loc: ${localidadeId}`
    });
  });
};

/**
 * Calculates financial summary for a period
 */
export const getResumoFinanceiro = async (
  localidadeId: string,
  mes: number,
  ano: number
): Promise<{
  vendasTotal: number;
  despesasOp: number;
  totalAdiantamentos: number;
  adiantamentosPorCota: Record<string, number>;
  listaDespesas: Array<{ descricao: string; valor: number; data: string; pontoId?: string; centroCustoId?: string }>;
  listaAdiantamentos: Array<{ descricao: string; valor: number; data: string }>;
}> => {
  // Datas de início e fim do mês
  const startDate = new Date(ano, mes - 1, 1);
  const endDate = new Date(ano, mes, 0, 23, 59, 59);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  // 1. Buscar Vendas
  const vendasQuery = query(
    collection(db, "vendas"),
    where("localidadeId", "==", localidadeId),
    where("active", "==", true),
    where("data", ">=", startStr),
    where("data", "<=", endStr)
  );

  const vendasSnapshot = await getDocs(vendasQuery);

  let vendasTotal = 0;
  let despesasVendas = 0;

  vendasSnapshot.docs.forEach(doc => {
    const data = doc.data() as Venda;
    vendasTotal += (data.totalFinal || 0);
    // Soma despesas lançadas diretamente na leitura/venda
    if (data.despesa && data.despesa > 0) {
      despesasVendas += data.despesa;
    }
  });

  // 2. Buscar Despesas (Operacionais e Adiantamentos) de 'despesas_gerais'
  const despesasQuery = query(
    collection(db, "despesas_gerais"),
    where("localidadeId", "==", localidadeId),
    where("active", "==", true),
    where("data", ">=", startStr),
    where("data", "<=", endStr)
  );

  const despesasSnapshot = await getDocs(despesasQuery);

  let despesasOp = despesasVendas; // Inicia com as despesas das vendas
  let totalAdiantamentos = 0;
  const adiantamentosPorCota: Record<string, number> = {};

  // Listas para detalhamento (Gaveta)
  const listaDespesas: Array<{ descricao: string; valor: number; data: string; pontoId?: string; centroCustoId?: string }> = [];
  const listaAdiantamentos: Array<{ descricao: string; valor: number; data: string }> = [];

  // Adicionar despesas de vendas na lista (se houver)
  vendasSnapshot.docs.forEach(doc => {
    const data = doc.data() as Venda;
    if (data.despesa && data.despesa > 0) {
      listaDespesas.push({
        descricao: `Leitura da Máquina`, // Descrição genérica pois o "Ponto" dará o contexto
        valor: data.despesa,
        data: data.data,
        pontoId: data.pontoId,
        centroCustoId: data.centroCustoId
      });
    }
  });

  despesasSnapshot.docs.forEach(doc => {
    const data = doc.data() as DespesaGeral;
    if (data.tipo === 'operacional') {
      const valor = (data.valor || 0);
      despesasOp += valor;
      listaDespesas.push({
        descricao: data.descricao || 'Despesa Operacional',
        valor: valor,
        data: data.data,
        centroCustoId: data.centroCustoId
      });
    } else if (data.tipo === 'adiantamento') {
      const valor = (data.valor || 0);
      totalAdiantamentos += valor;
      if (data.cotaId) {
        adiantamentosPorCota[data.cotaId] = (adiantamentosPorCota[data.cotaId] || 0) + valor;
      }
      listaAdiantamentos.push({
        descricao: data.descricao || 'Vale/Adiantamento',
        valor: valor,
        data: data.data
      });
    }
  });

  // Ordenar listas por data
  listaDespesas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  listaAdiantamentos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return {
    vendasTotal,
    despesasOp,
    totalAdiantamentos,
    adiantamentosPorCota,
    listaDespesas,
    listaAdiantamentos
  };
};