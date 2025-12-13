#!/usr/bin/env ts-node
/**
 * DEMONSTRAÇÃO: Como o Sistema de Proteção Funciona
 * 
 * Este arquivo mostra exemplos práticos de como a validação
 * previne códigos duplicados.
 */

import {
  gerarProximoCodigoRota,
  gerarProximoCodigoPonto,
  gerarProximoCodigoOperador,
  validarCodigoRota,
  validarCodigoPonto,
  validarCodigoOperador
} from './services/codigoValidator';

// ============================================
// EXEMPLO 1: Gerando Códigos de Rotas
// ============================================
console.log('📍 EXEMPLO 1: Gerando Códigos de Rotas\n');

const rotasExistentes = [
  { codigo: '030101' },
  { codigo: '030102' }
];

const proximoCodigoRota = gerarProximoCodigoRota('03', '01', rotasExistentes);
console.log('Próximo código de rota:', proximoCodigoRota);
// Output: 030103 ✓ (não duplica!)

// ============================================
// EXEMPLO 2: Bloqueando Rota Duplicada
// ============================================
console.log('\n🚫 EXEMPLO 2: Tentando Rota Duplicada\n');

const validacao = validarCodigoRota('030101', rotasExistentes);
if (!validacao.valido) {
  console.log('❌ Erro:', validacao.erro);
  // Output: ❌ Erro: Código "030101" já existe em outra rota...
}

// ============================================
// EXEMPLO 3: Gerando Códigos de Pontos
// ============================================
console.log('\n📍 EXEMPLO 3: Gerando Códigos de Pontos\n');

const pontosExistentes = [
  { codigo: '03010101' },
  { codigo: '03010102' }
];

const proximoCodigoPonto = gerarProximoCodigoPonto('030101', pontosExistentes);
console.log('Próximo código de ponto:', proximoCodigoPonto);
// Output: 03010103 ✓ (não duplica!)

// ============================================
// EXEMPLO 4: Gerando Códigos de Operadores
// ============================================
console.log('\n📍 EXEMPLO 4: Gerando Códigos de Operadores\n');

const operadoresExistentes = [
  { codigo: '0301010101' },
  { codigo: '0301010102' },
  { codigo: '0301010103' }
];

const proximoCodigoOperador = gerarProximoCodigoOperador(
  '03010101',
  operadoresExistentes
);
console.log('Próximo código de operador:', proximoCodigoOperador);
// Output: 0301010104 ✓ (não duplica!)

// ============================================
// EXEMPLO 5: Múltiplas Rotas em Seções
// ============================================
console.log('\n📍 EXEMPLO 5: Múltiplas Rotas em Diferentes Seções\n');

const rotasComMultiplasSecoes = [
  // Seção 01
  { codigo: '030101' },
  { codigo: '030102' },
  // Seção 02
  { codigo: '030201' }
];

// Próxima rota na seção 01
const proxRota01 = gerarProximoCodigoRota('03', '01', rotasComMultiplasSecoes);
console.log('Próxima rota na seção 01:', proxRota01); // 030103

// Próxima rota na seção 02
const proxRota02 = gerarProximoCodigoRota('03', '02', rotasComMultiplasSecoes);
console.log('Próxima rota na seção 02:', proxRota02); // 030202

// ============================================
// RESULTADO ESPERADO
// ============================================
console.log('\n' + '='.repeat(50));
console.log('✅ PROTEÇÃO ATIVA');
console.log('='.repeat(50));
console.log(`
ANTES DO SISTEMA:
❌ Rotas com mesmo código: 0301, 0301 (DUPLICADO!)
❌ Pontos ficavam órfãos
❌ Operadores não funcionavam

DEPOIS DO SISTEMA:
✅ Rotas sequenciais: 030101, 030102, 030103
✅ Pontos sequenciais: 03010101, 03010102, 03010103
✅ Operadores sequenciais: 0301010101, 0301010102, etc

TENTANDO DUPLICAR:
❌ Sistema bloqueia instantaneamente
❌ Mensagem clara: "Código já existe!"
❌ Registro nunca é salvo
`);

export {};
