/**
 * FERRAMENTA DE CORREÇÃO AUTOMÁTICA DE CÓDIGOS DUPLICADOS
 * =========================================================
 * 
 * Esta função busca todos os documentos no Firestore,
 * identifica duplicatos e renumera com a sequência correta.
 * 
 * ⚠️ IMPORTANTE: Teste em desenvolvimento antes de usar em produção!
 * 
 * COMO USAR:
 * 1. Copie esta função para um arquivo .ts no seu projeto
 * 2. Chame: await corrigirTodosOsCodigos()
 * 3. Monitorar o console para progresso
 * 4. Verifique o relatório de mudanças
 */

import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from './firebaseConfig';

interface DocumentoComCodigo {
  id: string;
  codigo: string;
  nome: string;
  [key: string]: any;
}

interface RelatorioMudanca {
  colecao: string;
  documentoId: string;
  codigoAntigo: string;
  codigoNovo: string;
  timestamp: Date;
}

interface RelatorioExecucao {
  datainicio: Date;
  dataFim: Date;
  durationMs: number;
  rotasProcessadas: number;
  rotasRenumeradas: number;
  pontosProcessados: number;
  pontosRenumerados: number;
  operadoresProcessados: number;
  operadoresRenumerados: number;
  mudancas: RelatorioMudanca[];
  erros: string[];
}

// Ordenação padronizada: primeiro por código (numérico, se houver), depois por nome, depois por id
const compareCodigoNome = (a: { codigo?: string; nome?: string; id?: string }, b: { codigo?: string; nome?: string; id?: string }) => {
  const codigoA = a.codigo || '';
  const codigoB = b.codigo || '';
  const byCodigo = codigoA.localeCompare(codigoB, undefined, { numeric: true, sensitivity: 'base' });
  if (byCodigo !== 0) return byCodigo;

  const nomeA = a.nome || '';
  const nomeB = b.nome || '';
  const byNome = nomeA.localeCompare(nomeB, undefined, { numeric: true, sensitivity: 'base' });
  if (byNome !== 0) return byNome;

  return (a.id || '').localeCompare(b.id || '');
};

/**
 * Agrupar rotas por seção para renumeração correta
 */
async function corrigirRotas(): Promise<{ rotas: DocumentoComCodigo[], mudancas: RelatorioMudanca[], erros: string[] }> {
  const mudancas: RelatorioMudanca[] = [];
  const erros: string[] = [];
  const rotasSnapshot = await getDocs(
    query(collection(db, 'rotas'), where('active', '==', true))
  );
  const rotasOriginais = rotasSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as DocumentoComCodigo[];

  console.log(`📍 Processando ${rotasOriginais.length} rotas...`);

  // Agrupar por seção
  const rotasPorSecao = new Map<string, DocumentoComCodigo[]>();
  for (const rota of rotasOriginais) {
    if (!rota.secaoId) {
      erros.push(`⚠️ Rota ${rota.id} não tem secaoId`);
      continue;
    }
    if (!rotasPorSecao.has(rota.secaoId)) {
      rotasPorSecao.set(rota.secaoId, []);
    }
    rotasPorSecao.get(rota.secaoId)!.push(rota);
  }

  // Corrigir cada seção
  let rotasRenumeradas = 0;

  for (const [secaoId, rotasDaSecao] of rotasPorSecao.entries()) {
    // Buscar código da seção e localidade
    const secaoDoc = await getDocs(
      query(collection(db, 'secoes'), where('__name__', '==', secaoId))
    );
    if (secaoDoc.empty) {
      erros.push(`⚠️ Seção ${secaoId} não encontrada`);
      continue;
    }

    const secao = secaoDoc.docs[0].data();
    const secaoCodigo = secao.codigo;

    if (!secaoCodigo) {
      erros.push(`⚠️ Seção ${secaoId} não tem código`);
      continue;
    }

    // Buscar localidade
    const localidadeDoc = await getDocs(
      query(collection(db, 'localidades'), where('__name__', '==', secao.localidadeId))
    );
    if (localidadeDoc.empty) {
      erros.push(`⚠️ Localidade ${secao.localidadeId} não encontrada`);
      continue;
    }

    const localidade = localidadeDoc.docs[0].data();
    const localidadeCodigo = localidade.codigo;

    if (!localidadeCodigo) {
      erros.push(`⚠️ Localidade ${secao.localidadeId} não tem código`);
      continue;
    }

    // Renumerar rotas da seção
    const rotasOrdenadas = rotasDaSecao.sort(compareCodigoNome);

    for (let i = 0; i < rotasOrdenadas.length; i++) {
      const rota = rotasOrdenadas[i];
      const sequencia = String(i + 1).padStart(2, '0');
      const codigoNovo = `${localidadeCodigo}${secaoCodigo}${sequencia}`;

      if (rota.codigo !== codigoNovo) {
        const codigoAntigo = rota.codigo || 'sem-codigo';
        try {
          await updateDoc(doc(db, 'rotas', rota.id), {
            codigo: codigoNovo
          });

          // Mantém o array in-memory sincronizado para fases seguintes
          rota.codigo = codigoNovo;

          mudancas.push({
            colecao: 'rotas',
            documentoId: rota.id,
            codigoAntigo,
            codigoNovo,
            timestamp: new Date()
          });

          rotasRenumeradas++;
          console.log(`  ✅ Rota ${rota.nome}: ${rota.codigo} → ${codigoNovo}`);
        } catch (error) {
          erros.push(`❌ Erro ao atualizar rota ${rota.id}: ${error}`);
        }
      }
    }
  }

  console.log(`✅ Rotas corrigidas: ${rotasRenumeradas}/${rotasOriginais.length}`);

  return {
    rotas: rotasOriginais,
    mudancas,
    erros
  };
}

/**
 * Agrupar pontos por rota para renumeração correta
 */
async function corrigirPontos(rotasCorrigidas: DocumentoComCodigo[]): Promise<{ mudancas: RelatorioMudanca[], erros: string[] }> {
  const mudancas: RelatorioMudanca[] = [];
  const erros: string[] = [];
  const pontosSnapshot = await getDocs(
    query(collection(db, 'pontos'), where('active', '==', true))
  );
  const pontosOriginais = pontosSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as DocumentoComCodigo[];

  console.log(`📍 Processando ${pontosOriginais.length} pontos...`);

  // Agrupar por rota
  const pontosPorRota = new Map<string, DocumentoComCodigo[]>();
  for (const ponto of pontosOriginais) {
    if (!ponto.rotaId) {
      erros.push(`⚠️ Ponto ${ponto.id} não tem rotaId`);
      continue;
    }
    if (!pontosPorRota.has(ponto.rotaId)) {
      pontosPorRota.set(ponto.rotaId, []);
    }
    pontosPorRota.get(ponto.rotaId)!.push(ponto);
  }

  // Corrigir cada rota
  let pontosRenumerados = 0;

  for (const [rotaId, pontosDaRota] of pontosPorRota.entries()) {
    const rotaCorrigida = rotasCorrigidas.find(r => r.id === rotaId);
    if (!rotaCorrigida) {
      erros.push(`⚠️ Rota ${rotaId} não encontrada`);
      continue;
    }

    const rotaCodigo = rotaCorrigida.codigo;
    if (!rotaCodigo) {
      erros.push(`⚠️ Rota ${rotaId} não tem código`);
      continue;
    }

    // Renumerar pontos da rota
    const pontosOrdenados = pontosDaRota.sort(compareCodigoNome);

    for (let i = 0; i < pontosOrdenados.length; i++) {
      const ponto = pontosOrdenados[i];
      const sequencia = String(i + 1).padStart(2, '0');
      const codigoNovo = `${rotaCodigo}${sequencia}`;

      if (ponto.codigo !== codigoNovo) {
        const codigoAntigo = ponto.codigo || 'sem-codigo';
        try {
          await updateDoc(doc(db, 'pontos', ponto.id), {
            codigo: codigoNovo
          });

          // Mantém o array in-memory sincronizado para fases seguintes
          ponto.codigo = codigoNovo;

          mudancas.push({
            colecao: 'pontos',
            documentoId: ponto.id,
            codigoAntigo,
            codigoNovo,
            timestamp: new Date()
          });

          pontosRenumerados++;
          console.log(`  ✅ Ponto ${ponto.nome}: ${ponto.codigo} → ${codigoNovo}`);
        } catch (error) {
          erros.push(`❌ Erro ao atualizar ponto ${ponto.id}: ${error}`);
        }
      }
    }
  }

  console.log(`✅ Pontos corrigidos: ${pontosRenumerados}/${pontosOriginais.length}`);

  return {
    mudancas,
    erros
  };
}

/**
 * Agrupar operadores por ponto para renumeração correta
 */
async function corrigirOperadores(pontosCorrigidos: DocumentoComCodigo[]): Promise<{ mudancas: RelatorioMudanca[], erros: string[] }> {
  const mudancas: RelatorioMudanca[] = [];
  const erros: string[] = [];
  const operadoresSnapshot = await getDocs(
    query(collection(db, 'operadores'), where('active', '==', true))
  );
  const operadoresOriginais = operadoresSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as DocumentoComCodigo[];

  console.log(`📍 Processando ${operadoresOriginais.length} operadores...`);

  // Agrupar por ponto
  const operadoresPorPonto = new Map<string, DocumentoComCodigo[]>();
  for (const operador of operadoresOriginais) {
    if (!operador.pontoId) {
      erros.push(`⚠️ Operador ${operador.id} não tem pontoId`);
      continue;
    }
    if (!operadoresPorPonto.has(operador.pontoId)) {
      operadoresPorPonto.set(operador.pontoId, []);
    }
    operadoresPorPonto.get(operador.pontoId)!.push(operador);
  }

  // Corrigir cada ponto
  let operadoresRenumerados = 0;

  for (const [pontoId, operadoresNoPonto] of operadoresPorPonto.entries()) {
    const pontoCorrigido = pontosCorrigidos.find(p => p.id === pontoId);
    if (!pontoCorrigido) {
      erros.push(`⚠️ Ponto ${pontoId} não encontrado`);
      continue;
    }

    const pontoCodigo = pontoCorrigido.codigo;
    if (!pontoCodigo) {
      erros.push(`⚠️ Ponto ${pontoId} não tem código`);
      continue;
    }

    // Renumerar operadores do ponto
    const operadoresOrdenados = operadoresNoPonto.sort(compareCodigoNome);

    for (let i = 0; i < operadoresOrdenados.length; i++) {
      const operador = operadoresOrdenados[i];
      const sequencia = String(i + 1).padStart(2, '0');
      const codigoNovo = `${pontoCodigo}${sequencia}`;

      if (operador.codigo !== codigoNovo) {
        try {
          await updateDoc(doc(db, 'operadores', operador.id), {
            codigo: codigoNovo
          });

          mudancas.push({
            colecao: 'operadores',
            documentoId: operador.id,
            codigoAntigo: operador.codigo || 'sem-codigo',
            codigoNovo,
            timestamp: new Date()
          });

          operadoresRenumerados++;
          console.log(`  ✅ Operador ${operador.nome}: ${operador.codigo} → ${codigoNovo}`);
        } catch (error) {
          erros.push(`❌ Erro ao atualizar operador ${operador.id}: ${error}`);
        }
      }
    }
  }

  console.log(`✅ Operadores corrigidos: ${operadoresRenumerados}/${operadoresOriginais.length}`);

  return {
    mudancas,
    erros
  };
}

/**
 * FUNÇÃO PRINCIPAL: Corrigir todos os códigos
 */
export async function corrigirTodosOsCodigos(): Promise<RelatorioExecucao> {
  const dataInicio = new Date();
  console.log('\n🔧 INICIANDO CORREÇÃO DE CÓDIGOS DUPLICADOS\n');
  console.log(`⏰ Início: ${dataInicio.toLocaleString('pt-BR')}\n`);

  const todasAsMudancas: RelatorioMudanca[] = [];
  const todosOsErros: string[] = [];

  try {
    // PASSO 1: Corrigir Rotas
    console.log('📍 ETAPA 1: Corrigindo Rotas...\n');
    const { rotas: rotasCorrigidas, mudancas: mudancasRotas, erros: errosRotas } = await corrigirRotas();
    todasAsMudancas.push(...mudancasRotas);
    todosOsErros.push(...errosRotas);

    // PASSO 2: Corrigir Pontos
    console.log('\n📍 ETAPA 2: Corrigindo Pontos...\n');
    const { mudancas: mudancasPontos, erros: errosPontos } = await corrigirPontos(rotasCorrigidas);
    todasAsMudancas.push(...mudancasPontos);
    todosOsErros.push(...errosPontos);

    // Buscar pontos atualizados
    const pontosSnapshot = await getDocs(
      query(collection(db, 'pontos'), where('active', '==', true))
    );
    const pontosCorrigidos = pontosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DocumentoComCodigo[];

    // PASSO 3: Corrigir Operadores
    console.log('\n📍 ETAPA 3: Corrigindo Operadores...\n');
    const { mudancas: mudancasOperadores, erros: errosOperadores } = await corrigirOperadores(pontosCorrigidos);
    todasAsMudancas.push(...mudancasOperadores);
    todosOsErros.push(...errosOperadores);

  } catch (error) {
    console.error('❌ Erro geral na correção:', error);
    todosOsErros.push(`❌ Erro geral: ${error}`);
  }

  const dataFim = new Date();
  const duracao = dataFim.getTime() - dataInicio.getTime();

  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL');
  console.log('='.repeat(60) + '\n');

  const rotasProcessadas = todasAsMudancas.filter(m => m.colecao === 'rotas').length;
  const pontosProcessados = todasAsMudancas.filter(m => m.colecao === 'pontos').length;
  const operadoresProcessados = todasAsMudancas.filter(m => m.colecao === 'operadores').length;

  console.log(`✅ Rotas corrigidas: ${rotasProcessadas}`);
  console.log(`✅ Pontos corrigidos: ${pontosProcessados}`);
  console.log(`✅ Operadores corrigidos: ${operadoresProcessados}`);
  console.log(`\n⏱️ Tempo total: ${(duracao / 1000).toFixed(2)}s`);

  if (todosOsErros.length > 0) {
    console.log(`\n⚠️ Avisos/Erros: ${todosOsErros.length}`);
    todosOsErros.forEach(erro => console.log(`   ${erro}`));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CORREÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('='.repeat(60) + '\n');

  return {
    datainicio: dataInicio,
    dataFim,
    durationMs: duracao,
    rotasProcessadas: rotasProcessadas,
    rotasRenumeradas: rotasProcessadas,
    pontosProcessados,
    pontosRenumerados: pontosProcessados,
    operadoresProcessados,
    operadoresRenumerados: operadoresProcessados,
    mudancas: todasAsMudancas,
    erros: todosOsErros
  };
}

/**
 * COMO USAR:
 * 
 * 1. Importe em um componente:
 *    import { corrigirTodosOsCodigos } from './services/corrigirCodigos';
 * 
 * 2. Crie um botão de teste:
 *    <button onClick={() => corrigirTodosOsCodigos()}>
 *      Corrigir Códigos
 *    </button>
 * 
 * 3. Ou execute em um useEffect:
 *    useEffect(() => {
 *      if (window.location.search.includes('corrigir')) {
 *        corrigirTodosOsCodigos();
 *      }
 *    }, []);
 * 
 * 4. Monitore o console para progresso
 * 
 * ⚠️ IMPORTANTE:
 * - Faça um backup antes de executar
 * - Teste em desenvolvimento primeiro
 * - Verifique o console para erros
 * - Não feche a página até terminar
 */
