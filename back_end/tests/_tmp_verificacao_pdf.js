// HARNESS DE VERIFICAÇÃO (temporário) — diagnóstico de diagramação do PDF
// Gera PDFs com dados sintéticos (sem banco) e analisa com pdfjs-dist:
//   1. nº de páginas e páginas em branco no final
//   2. sobreposição real de textos (bounding boxes)
// Execute com: node tests/_tmp_verificacao_pdf.js

const fs = require('fs')
const path = require('path')
const { gerarPDF } = require('../Services/relatorioProducaoService')

const OUT = path.join(__dirname, '_tmp_out')
fs.mkdirSync(OUT, { recursive: true })

// ── Dados sintéticos ──────────────────────────────────────────
function dadosPequenos() {
  const dia = {
    data: '2026-09-09',
    producaoConcluida: 1743,
    producao: 1810,
    meta: 1800,
    eficiencia: 91.0,
    funcionarios: 3,
    date: new Date('2026-09-09'),
  }
  const func = {
    nome: 'ANDREZA CRISTINA',
    email: 'andreza@x.com',
    foto: null,
    producao: 14338,
    producaoConcluida: 14338,
    eficienciaFicha: 65,
    eficienciaReferencia: 85,
    diasTrabalhados: 20,
  }
  return {
    producaoTotal: 1743,
    metaTotal: 1800,
    eficienciaGeral: 91.0,
    eficienciaGeralFicha: 88.4,
    funcionariosAtivos: 3,
    funcionariosComProducao: 3,
    opsCount: 1,
    diasTrabalhados: 1,
    producaoRegistradaTotal: 1810,
    tempoTrabalhadoTotal: 1440,
    tempoFichaTotal: 900,
    tempoReferenciaTotal: 1310,
    dias: [dia],
    rankingFuncionarios: [func],
    melhorDia: dia,
    piorDia: dia,
    melhorFuncionario: func,
    ops: [{ idOp: 79, descricao: 'Camiseta polo bordada manga curta', producao: 1743, producaoRegistrada: 1810, metaTotal: 1800, eficiencia: 91.0, funcionarios: 3 }],
    etapas: [{ descricao: 'Costura', producao: 1810, eficiencia: 90.2 }],
  }
}

function dadosGrandes() {
  const nomes = [
    'ANDREZA CRISTINA DA SILVA SANTOS PEREIRA OLIVEIRA',
    'JOÃO PEDRO GABRIEL DE ALMEIDA SOUZA JÚNIOR',
    'MARIA EDUARDA FERREIRA COSTA E SILVA',
    'CARLOS EDUARDO DOS SANTOS LIMA NETO',
    'FRANCISCA ALVES DE OLIVEIRA PIMENTEL',
    'ANTÔNIO MARCOS VIEIRA BARBOSA',
    'LUCIANA SOUZA CAVALCANTE MAGALHÃES',
    'ROBERTO CARLOS TEIXEIRA DUARTE',
    'PATRÍCIA REGINA NASCIMENTO ROCHA',
    'JOSÉ RIBAMAR ARAÚJO FONTES',
  ]
  const dia = d => ({
    data: `2026-09-${String(d).padStart(2, '0')}`,
    producaoConcluida: 800 + d * 37,
    producao: 830 + d * 39,
    meta: 900,
    eficiencia: 60 + (d % 40) + (d % 5) * 1.23,
    funcionarios: 10,
    date: new Date(`2026-09-${String(d).padStart(2, '0')}`),
  })
  const dias = Array.from({ length: 30 }, (_, i) => dia(i + 1))
  const func = i => ({
    nome: nomes[i % nomes.length],
    email: `f${i}@x.com`,
    foto: null,
    producao: 5000 + i * 611,
    producaoConcluida: 4900 + i * 599,
    eficienciaFicha: 55 + (i % 45),
    eficienciaReferencia: 60 + (i % 40),
    diasTrabalhados: 15 + (i % 10),
  })
  const ranking = Array.from({ length: 25 }, (_, i) => func(i))
  return {
    producaoTotal: 28340,
    metaTotal: 27000,
    eficienciaGeral: 82.55,
    eficienciaGeralFicha: 79.13,
    funcionariosAtivos: 25,
    funcionariosComProducao: 25,
    opsCount: 30,
    diasTrabalhados: 30,
    producaoRegistradaTotal: 29910,
    tempoTrabalhadoTotal: 43200,
    tempoFichaTotal: 27000,
    tempoReferenciaTotal: 35640,
    dias,
    rankingFuncionarios: ranking,
    melhorDia: dias[14],
    piorDia: dias[2],
    melhorFuncionario: ranking[0],
    ops: Array.from({ length: 30 }, (_, i) => ({
      idOp: 61 + i,
      descricao: `Blusa de tricô canelada gola redonda com mangas longas - Cor ${i + 1} - Coleção Primavera/Verão`,
      producao: 900 + i * 53,
      producaoRegistrada: 940 + i * 55,
      metaTotal: 900,
      eficiencia: 70 + (i % 30),
      funcionarios: 8,
    })),
    etapas: Array.from({ length: 18 }, (_, i) => ({
      descricao: `Etapa ${i + 1} - ${['Costura reta', 'Overloque', 'Revisão Intermediaria', 'Passadoria manual', 'Colocação de botões', 'Acabamento de barra'][i % 6]}`,
      producao: 300 + i * 47,
      eficiencia: 65 + (i % 30),
    })),
  }
}

// ── Análise com pdfjs ─────────────────────────────────────────
async function analisar(arquivo) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(fs.readFileSync(arquivo))
  const pdf = await pdfjs.getDocument({
    data,
    standardFontDataUrl: path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'standard_fonts').replace(/\\/g, '/') + '/',
    isEvalSupported: false,
  }).promise

  const paginas = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const { items } = await page.getTextContent()
    const caixas = items
      .filter(it => it.str && it.str.trim())
      .map(it => {
        const [, , , , x, y] = it.transform
        return { str: it.str, x, y, w: it.width, h: it.height }
      })
    paginas.push(caixas)
  }

  const brancasNoFim = []
  for (let i = paginas.length - 1; i >= 0; i--) {
    if (paginas[i].length === 0) brancasNoFim.unshift(i + 1)
    else break
  }

  // sobreposição de textos: interseção > 1pt em ambos os eixos
  const sobreposicoes = []
  paginas.forEach((caixas, pi) => {
    for (let i = 0; i < caixas.length; i++) {
      for (let j = i + 1; j < caixas.length; j++) {
        const a = caixas[i], b = caixas[j]
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
        if (ox > 1 && oy > 1) {
          sobreposicoes.push({ pagina: pi + 1, a: a.str.slice(0, 40), b: b.str.slice(0, 40), ox: +ox.toFixed(1), oy: +oy.toFixed(1) })
        }
      }
    }
  })

  const comRodape = paginas.filter(c => c.some(it => /Página \d+ de \d+/.test(it.str))).length

  return {
    arquivo: path.basename(arquivo),
    paginas: paginas.length,
    brancasNoFim,
    comRodape,
    sobreposicoes,
    resumoPaginas: paginas.map((c, i) => c[0] ? `p${i + 1}: "${c[0].str.slice(0, 34)}" (${c.length} itens)` : `p${i + 1}: VAZIA`),
  }
}

// ── Execução ──────────────────────────────────────────────────
;(async () => {
  const periodos = [
    { label: '01/09/2026 a 09/09/2026', tipo: 'Relatório Personalizado' },
    { label: '01/09/2026 a 30/09/2026', tipo: 'Relatório Mensal' },
  ]
  const casos = [
    { nome: 'pequeno', dados: dadosPequenos(), periodo: periodos[0] },
    { nome: 'grande', dados: dadosGrandes(), periodo: periodos[1] },
  ]

  let problemas = 0
  for (const caso of casos) {
    const buf = await gerarPDF(caso.dados, caso.periodo.label, caso.periodo.tipo, 'Linha Tex Confecções')
    const arquivo = path.join(OUT, `relatorio-${caso.nome}.pdf`)
    fs.writeFileSync(arquivo, buf)
    const r = await analisar(arquivo)

    console.log(`\n═══ ${r.arquivo} ═══`)
    console.log(`páginas: ${r.paginas} | rodapés presentes: ${r.comRodape} | brancas no fim: ${JSON.stringify(r.brancasNoFim)}`)
    r.resumoPaginas.forEach(l => console.log('  ' + l))
    if (r.brancasNoFim.length) { problemas++; console.log(`  ✖ páginas em branco no final: ${r.brancasNoFim.join(', ')}`) }
    if (r.comRodape !== r.paginas) { problemas++; console.log(`  ✖ nem toda página tem rodapé (${r.comRodape}/${r.paginas})`) }
    if (r.sobreposicoes.length) {
      problemas++
      console.log(`  ✖ ${r.sobreposicoes.length} sobreposição(ões) de texto:`)
      r.sobreposicoes.slice(0, 12).forEach(s =>
        console.log(`     p${s.pagina} ox=${s.ox} oy=${s.oy} | "${s.a}" ✕ "${s.b}"`))
      if (r.sobreposicoes.length > 12) console.log(`     ... e mais ${r.sobreposicoes.length - 12}`)
    } else {
      console.log('  ✔ nenhuma sobreposição de texto')
    }
  }

  console.log(problemas === 0 ? '\n✅ LAYOUT OK' : `\n❌ ${problemas} problema(s) encontrado(s)`)
  process.exit(problemas === 0 ? 0 : 1)
})()
