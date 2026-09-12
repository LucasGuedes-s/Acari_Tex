// ═══════════════════════════════════════════════════════════════
// TESTE: isEtapaFinal + filtro de producao da rota hoje
// Execute com: node tests/isEtapaFinal_test.js
// ═══════════════════════════════════════════════════════════════

function isEtapaFinal(descricaoEtapa) {
  if (!descricaoEtapa) return false;
  var d = descricaoEtapa.toLowerCase();
  if (
    d.includes('revisão intermediaria') ||
    d.includes('revisao intermediaria') ||
    d.includes('revisão intermediária')
  ) {
    return false;
  }
  return (
    d.includes('final') ||
    d.includes('revisão final') ||
    d.includes('revisao final') ||
    d.includes('revisão') ||
    d.includes('revisao') ||
    d.includes('acabamento') ||
    d.includes('qualidade') ||
    d.includes('revisar peça pronta') ||
    d.includes('revisar peca pronta') ||
    d.includes('expedição') ||
    d.includes('expedicao')
  );
}

function horaParaMinutos(hora) {
  if (!hora || typeof hora !== 'string') return 0;
  var cleaned = String(hora).trim().replace(/[^\d:]/g, '');
  var parts = cleaned.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

// ═══════════════════════════════════════════════════════════════
// TESTES DA FUNCAO isEtapaFinal
// ═══════════════════════════════════════════════════════════════

var testes = [
  // [descricao, esperado]
  ['Costura', false],
  ['Bainha', false],
  ['Revisão Intermediaria', false],
  ['revisao intermediaria', false],
  ['REVISÃO INTERMEDIARIA', false],
  ['Revisão Final', true],
  ['revisao final', true],
  ['REVISAO FINAL', true],
  ['Acabamento', true],
  ['ACABAMENTO', true],
  ['Qualidade', true],
  ['QUALIDADE', true],
  ['Expedição', true],
  ['expedicao', true],
  ['EXPEDIÇÃO', true],
  ['Revisão', true],
  ['revisao', true],
  ['Revisar Peça Pronta', true],
  ['Revisar Peca Pronta', true],
  ['Final', true],
  ['final', true],
  ['Corte', false],
  ['Preparação', false],
  ['Lavagem', false],
  ['', false],
  [null, false],
  [undefined, false],
  ['REVISÃO INTERMEDIÁRIA', false],
  ['Etapa qualquer', false],
  ['Revisão Finalizada', true],
  ['expedição total', true],
];

var passou = 0;
var falhou = 0;

console.log('═══════════════════════════════════════════════════════════════');
console.log('TESTES DA FUNCAO isEtapaFinal');
console.log('═══════════════════════════════════════════════════════════════\n');

for (var i = 0; i < testes.length; i++) {
  var entrada = testes[i][0];
  var esperado = testes[i][1];
  var resultado = isEtapaFinal(entrada);
  var status = resultado === esperado ? '✅ PASSOU' : '❌ FALHOU';
  if (resultado === esperado) {
    passou++;
  } else {
    falhou++;
    console.log(status + ' | isEtapaFinal(' + JSON.stringify(entrada) + ') = ' + resultado + ' (esperado: ' + esperado + ')');
  }
}

console.log('\nResultado: ' + passou + ' passaram, ' + falhou + ' falharam\n');

// ═══════════════════════════════════════════════════════════════
// TESTE DO FILTRO INTEGRADO (hora + etapa final)
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('TESTE DO FILTRO INTEGRADO (hora + etapa final)');
console.log('═══════════════════════════════════════════════════════════════\n');

// minutosAgora = 10:00 = 600 minutos
var minutosAgora = 600;

var producoesSimuladas = [
  { hora_registro: '08:00', producao_etapa: { descricao: 'Costura' }, quantidade_pecas: 100 },
  { hora_registro: '08:30', producao_etapa: { descricao: 'Bainha' }, quantidade_pecas: 100 },
  { hora_registro: '09:00', producao_etapa: { descricao: 'Revisão Intermediaria' }, quantidade_pecas: 100 },
  { hora_registro: '09:30', producao_etapa: { descricao: 'Revisão Final' }, quantidade_pecas: 80 },
  { hora_registro: '10:30', producao_etapa: { descricao: 'Acabamento' }, quantidade_pecas: 50 },  // futuro
  { hora_registro: '09:45', producao_etapa: { descricao: 'Expedição' }, quantidade_pecas: 60 },
  { hora_registro: '09:50', producao_etapa: { descricao: 'Qualidade' }, quantidade_pecas: 30 },
];

var filtradas = producoesSimuladas.filter(function(p) {
  if (!p.hora_registro) return false;
  if (horaParaMinutos(p.hora_registro) > minutosAgora) return false;
  var descricaoEtapa = (p.producao_etapa && p.producao_etapa.descricao) || '';
  return isEtapaFinal(descricaoEtapa);
});

console.log('Minutos agora: ' + minutosAgora + ' (10:00)');
console.log('Producoes simuladas: ' + producoesSimuladas.length);
console.log('Producoes filtradas: ' + filtradas.length);
console.log('');

var totalPecasFiltradas = 0;
for (var fi = 0; fi < filtradas.length; fi++) {
  totalPecasFiltradas += filtradas[fi].quantidade_pecas;
  console.log('  ✅ ' + filtradas[fi].hora_registro + ' | ' + filtradas[fi].producao_etapa.descricao + ' | ' + filtradas[fi].quantidade_pecas + ' pecas');
}

console.log('\nTotal pecas finalizadas: ' + totalPecasFiltradas);
console.log('Esperado: 170 (80 Revisão Final + 60 Expedição + 30 Qualidade)');
console.log('Nao devem aparecer: Costura(100), Bainha(100), Revisão Intermediaria(100), Acabamento futuro(50)');

var ok = totalPecasFiltradas === 170 && filtradas.length === 3;
console.log('\nResultado: ' + (ok ? '✅ PASSOU' : '❌ FALHOU'));

if (!ok) {
  console.log('\nDetalhes:');
  console.log('  Total pecas esperado: 170, obtido: ' + totalPecasFiltradas);
  console.log('  Filtradas esperado: 3, obtido: ' + filtradas.length);
}

// ═══════════════════════════════════════════════════════════════
// TESTE EXCLUSAO DE PRODUCOES FUTURAS
// ═══════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('TESTE EXCLUSAO DE PRODUCOES FUTURAS');
console.log('═══════════════════════════════════════════════════════════════\n');

var producoesFuturas = [
  { hora_registro: '11:00', producao_etapa: { descricao: 'Revisão Final' }, quantidade_pecas: 50 },
  { hora_registro: '15:00', producao_etapa: { descricao: 'Expedição' }, quantidade_pecas: 30 },
];

var filtradasFuturas = producoesFuturas.filter(function(p) {
  if (!p.hora_registro) return false;
  if (horaParaMinutos(p.hora_registro) > minutosAgora) return false;
  var descricaoEtapa = (p.producao_etapa && p.producao_etapa.descricao) || '';
  return isEtapaFinal(descricaoEtapa);
});

var okFuturas = filtradasFuturas.length === 0;
console.log('Producoes futuras (11:00 e 15:00) com minutosAgora=600:');
console.log('  Filtradas: ' + filtradasFuturas.length + ' (esperado: 0)');
console.log('Resultado: ' + (okFuturas ? '✅ PASSOU' : '❌ FALHOU'));

// ═══════════════════════════════════════════════════════════════
// RESUMO FINAL
// ═══════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════');
var todosOk = falhou === 0 && ok && okFuturas;
console.log('RESULTADO FINAL: ' + (todosOk ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'));
console.log('═══════════════════════════════════════════════════════════════\n');

process.exit(todosOk ? 0 : 1);
