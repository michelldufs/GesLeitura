/**
 * Serviço de validação de códigos para garantir unicidade e sequência correta
 * REGRA: Nunca permitir códigos duplicados em nenhuma hipótese
 * 
 * Estrutura de códigos:
 * - Rota: LocalidadeCodigo + SecaoCodigo + SequenciaRota (ex: 03 + 01 + 01 = 030101)
 * - Ponto: RotaCodigo + SequenciaPonto (ex: 030101 + 01 = 03010101)
 * - Operador: PontoCodigo + SequenciaOperador (ex: 03010101 + 01 = 0301010101)
 */

interface ValidacaoRota {
  valido: boolean;
  erro?: string;
  codigoDuplicado?: boolean;
  codigoSugerido?: string;
}

interface ValidacaoPonto {
  valido: boolean;
  erro?: string;
  codigoDuplicado?: boolean;
  codigoSugerido?: string;
}

interface ValidacaoOperador {
  valido: boolean;
  erro?: string;
  codigoDuplicado?: boolean;
  codigoSugerido?: string;
}

/**
 * Valida código de rota evitando duplicatas
 */
export const validarCodigoRota = (
  codigoNovo: string,
  rotasExistentes: { codigo?: string }[],
  isEdicao: boolean = false,
  codigoAtualEmEdicao?: string
): ValidacaoRota => {
  // Se estamos editando e o código não mudou, é válido
  if (isEdicao && codigoNovo === codigoAtualEmEdicao) {
    return { valido: true };
  }

  // Verificar se o código já existe
  const codigoDuplicado = rotasExistentes.some(
    r => r.codigo?.toUpperCase() === codigoNovo.toUpperCase()
  );

  if (codigoDuplicado) {
    return {
      valido: false,
      erro: `❌ Código "${codigoNovo}" já existe em outra rota. Códigos duplicados NÃO são permitidos!`,
      codigoDuplicado: true
    };
  }

  return { valido: true };
};

/**
 * Valida código de ponto evitando duplicatas
 */
export const validarCodigoPonto = (
  codigoNovo: string,
  pontosExistentes: { codigo?: string }[],
  isEdicao: boolean = false,
  codigoAtualEmEdicao?: string
): ValidacaoPonto => {
  // Se estamos editando e o código não mudou, é válido
  if (isEdicao && codigoNovo === codigoAtualEmEdicao) {
    return { valido: true };
  }

  // Verificar se o código já existe
  const codigoDuplicado = pontosExistentes.some(
    p => p.codigo?.toUpperCase() === codigoNovo.toUpperCase()
  );

  if (codigoDuplicado) {
    return {
      valido: false,
      erro: `❌ Código "${codigoNovo}" já existe em outro ponto. Códigos duplicados NÃO são permitidos!`,
      codigoDuplicado: true
    };
  }

  return { valido: true };
};

/**
 * Valida código de operador evitando duplicatas
 */
export const validarCodigoOperador = (
  codigoNovo: string,
  operadoresExistentes: { codigo?: string }[],
  isEdicao: boolean = false,
  codigoAtualEmEdicao?: string
): ValidacaoOperador => {
  // Se estamos editando e o código não mudou, é válido
  if (isEdicao && codigoNovo === codigoAtualEmEdicao) {
    return { valido: true };
  }

  // Verificar se o código já existe
  const codigoDuplicado = operadoresExistentes.some(
    o => o.codigo?.toUpperCase() === codigoNovo.toUpperCase()
  );

  if (codigoDuplicado) {
    return {
      valido: false,
      erro: `❌ Código "${codigoNovo}" já existe em outro operador. Códigos duplicados NÃO são permitidos!`,
      codigoDuplicado: true
    };
  }

  return { valido: true };
};

/**
 * Gera código de rota com sequência correta dentro da seção
 * Estrutura: LocalidadeCodigo + SecaoCodigo + SequenciaRota
 */
export const gerarProximoCodigoRota = (
  localidadeCodigo: string,
  secaoCodigo: string,
  rotasExistentesNaSecao: { codigo?: string }[]
): string => {
  // Filtrar rotas que começam com localidade + seção
  const prefixo = `${localidadeCodigo}${secaoCodigo}`;
  const rotasComPrefixo = rotasExistentesNaSecao.filter(r =>
    r.codigo?.startsWith(prefixo)
  );

  // Próximo número de sequência
  const proximoNumero = rotasComPrefixo.length + 1;
  const sequencia = String(proximoNumero).padStart(2, '0');

  return `${prefixo}${sequencia}`;
};

/**
 * Gera código de ponto com sequência correta dentro da rota
 * Estrutura: RotaCodigo + SequenciaPonto
 */
export const gerarProximoCodigoPonto = (
  rotaCodigo: string,
  pontosExistentesNaRota: { codigo?: string }[]
): string => {
  // Filtrar pontos que começam com rota
  const pontosComRota = pontosExistentesNaRota.filter(p =>
    p.codigo?.startsWith(rotaCodigo)
  );

  // Próximo número de sequência
  const proximoNumero = pontosComRota.length + 1;
  const sequencia = String(proximoNumero).padStart(2, '0');

  return `${rotaCodigo}${sequencia}`;
};

/**
 * Gera código de operador com sequência correta dentro do ponto
 * Estrutura: PontoCodigo + SequenciaOperador
 */
export const gerarProximoCodigoOperador = (
  pontoCodigo: string,
  operadoresExistentesNoPonto: { codigo?: string }[]
): string => {
  // Filtrar operadores que começam com ponto
  const operadoresComPonto = operadoresExistentesNoPonto.filter(o =>
    o.codigo?.startsWith(pontoCodigo)
  );

  // Próximo número de sequência
  const proximoNumero = operadoresComPonto.length + 1;
  const sequencia = String(proximoNumero).padStart(2, '0');

  return `${pontoCodigo}${sequencia}`;
};

/**
 * Verifica se há códigos duplicados em um array
 */
export const verificarDuplicatas = (codigos: string[]): { temDuplicatas: boolean; duplicados: string[] } => {
  const unicas = new Set();
  const duplicados: string[] = [];

  for (const codigo of codigos) {
    if (unicas.has(codigo.toUpperCase())) {
      if (!duplicados.includes(codigo.toUpperCase())) {
        duplicados.push(codigo.toUpperCase());
      }
    } else {
      unicas.add(codigo.toUpperCase());
    }
  }

  return {
    temDuplicatas: duplicados.length > 0,
    duplicados
  };
};

/**
 * Extrai informações do código para debug/análise
 */
export const analisarCodigo = (codigo: string): {
  localidadeCodigo: string;
  secaoCodigo?: string;
  rotaCodigo?: string;
  sequencia: string;
  tamanho: number;
} => {
  const tam = codigo.length;
  
  if (tam === 4) {
    // Rota: LL + SS + 00
    return {
      localidadeCodigo: codigo.substring(0, 2),
      secaoCodigo: codigo.substring(2, 4),
      sequencia: '',
      tamanho: tam
    };
  } else if (tam === 6) {
    // Rota: LL + SS + 00
    return {
      localidadeCodigo: codigo.substring(0, 2),
      secaoCodigo: codigo.substring(2, 4),
      sequencia: codigo.substring(4, 6),
      tamanho: tam
    };
  } else if (tam === 8) {
    // Ponto: LL + SS + RR + 00
    return {
      localidadeCodigo: codigo.substring(0, 2),
      secaoCodigo: codigo.substring(2, 4),
      rotaCodigo: codigo.substring(4, 6),
      sequencia: codigo.substring(6, 8),
      tamanho: tam
    };
  } else if (tam === 10) {
    // Operador: LL + SS + RR + PP + 00
    return {
      localidadeCodigo: codigo.substring(0, 2),
      secaoCodigo: codigo.substring(2, 4),
      rotaCodigo: codigo.substring(4, 8),
      sequencia: codigo.substring(8, 10),
      tamanho: tam
    };
  }

  return {
    localidadeCodigo: '',
    sequencia: '',
    tamanho: tam
  };
};
