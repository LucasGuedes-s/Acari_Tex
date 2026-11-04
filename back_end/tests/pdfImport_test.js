// TESTE: importação de OP por PDF (extração determinística, sem IA)
// Execute com: node tests/pdfImport_test.js
//
// Valida, sem banco:
//   1. extrairTextoPdf → PDF com texto, PDF sem texto (imagem), PDF inválido/corrompido
//   2. extrairDadosOp  → todos os campos identificados
//   3. extrairDadosOp  → campos ausentes ficam null (nada é inventado)
//   4. regras de parsing → quantidade, moeda, data, tempo
//   5. etapas → só relaciona etapas já cadastradas no estabelecimento
//   6. PDF real gerado pelo próprio sistema (se existir em ../peca-op-79.pdf)

const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')
const { extrairTextoPdf, extrairDadosOp } = require('../Services/pdfImport.service')

let falhas = 0
function verificar(nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas++
  console.log(
    `${ok ? '✔' : '✖'} ${nome}` +
      (ok ? '' : ` | esperado: ${JSON.stringify(esperado)} | obtido: ${JSON.stringify(obtido)}`)
  )
}

function gerarPdf(linhas) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4' })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    for (const linha of linhas) doc.text(linha)
    doc.end()
  })
}

// PDF só com desenhos — nenhuma página com texto selecionável
function gerarPdfSomenteImagem() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4' })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.rect(50, 50, 400, 600).fill('#0e6632')
    doc.circle(200, 300, 80).fill('#d0edda')
    doc.end()
  })
}

async function principal() {
  const etapasEstabelecimento = [
    { id_da_funcao: 1, descricao: 'Corte', tempo_padrao: 2 },
    { id_da_funcao: 2, descricao: 'Costura', tempo_padrao: 3 },
    { id_da_funcao: 3, descricao: 'Acabamento', tempo_padrao: 4 },
    { id_da_funcao: 4, descricao: 'Revisão Final', tempo_padrao: null },
  ]

  // ─────────────────────────────────────────────────────────
  // 1. Extração de texto
  // ─────────────────────────────────────────────────────────
  const pdfCompleto = await gerarPdf([
    'Linha Tex',
    'Documento de Identificação Logística',
    'OP: 79',
    'Descrição: Camiseta manga curta',
    'Quantidade de Peças: 500',
    'Pedido por: Guararapes',
    'Tempo padrão (min): 20',
    'Data de Entrega: 10/06/2026',
    'Valor por Peça: R$ 4,50',
    'Observações: Entregar sem etiqueta',
  ])
  const extraido = await extrairTextoPdf(pdfCompleto)
  verificar('PDF digital retorna texto', extraido.caracteres > 100, true)

  const pdfVazio = await gerarPdfSomenteImagem()
  let codigoSemTexto = null
  try {
    await extrairTextoPdf(pdfVazio)
  } catch (e) {
    codigoSemTexto = e.codigo
  }
  verificar('PDF sem texto selecionável → SEM_TEXTO', codigoSemTexto, 'SEM_TEXTO')

  let codigoInvalido = null
  try {
    await extrairTextoPdf(Buffer.from('isto nao é um pdf'))
  } catch (e) {
    codigoInvalido = e.codigo
  }
  verificar('arquivo sem assinatura %PDF → ARQUIVO_INVALIDO', codigoInvalido, 'ARQUIVO_INVALIDO')

  let codigoCorrompido = null
  try {
    await extrairTextoPdf(Buffer.from('%PDF-1.4\nlixo sem estrutura de xref'))
  } catch (e) {
    codigoCorrompido = e.codigo
  }
  verificar('PDF corrompido → PDF_CORROMPIDO', codigoCorrompido, 'PDF_CORROMPIDO')

  let codigoVazio = null
  try {
    await extrairTextoPdf(Buffer.alloc(0))
  } catch (e) {
    codigoVazio = e.codigo
  }
  verificar('buffer vazio → ARQUIVO_VAZIO', codigoVazio, 'ARQUIVO_VAZIO')

  // ─────────────────────────────────────────────────────────
  // 2. PDF digital com todos os campos
  // ─────────────────────────────────────────────────────────
  const completo = extrairDadosOp(extraido.texto, [])
  verificar('número da OP', completo.informacoes.numero_op, 79)
  verificar('descrição', completo.campos.descricao, 'Camiseta manga curta')
  verificar('quantidade', completo.campos.quantidade_pecas, 500)
  verificar('pedido por (cliente)', completo.campos.pedido_por, 'Guararapes')
  verificar('tempo padrão', completo.campos.tempo_padrao, 20)
  verificar('data de entrega', completo.campos.data_entrega, '2026-06-10')
  verificar('valor da peça (vírgula decimal)', completo.campos.valor_peca, 4.5)
  verificar('observações', completo.campos.observacoes, 'Entregar sem etiqueta')
  verificar('nenhum campo ausente', completo.camposNaoEncontrados, [])

  // ─────────────────────────────────────────────────────────
  // 3. PDF com campos ausentes → ficam null, nada é inventado
  // ─────────────────────────────────────────────────────────
  const parcial = extrairDadosOp(
    ['ORDEM DE PRODUÇÃO', 'Peça: Calça Jeans', 'Quantidade: 120'].join('\n'),
    []
  )
  verificar('descrição (rótulo "Peça")', parcial.campos.descricao, 'Calça Jeans')
  verificar('quantidade simples', parcial.campos.quantidade_pecas, 120)
  verificar('número da OP não inventado', parcial.informacoes.numero_op, null)
  verificar(
    'campos ausentes sinalizados',
    parcial.camposNaoEncontrados,
    ['valor_peca', 'data_entrega', 'pedido_por', 'tempo_padrao', 'observacoes']
  )
  verificar('valor nulo quando ausente', parcial.campos.valor_peca, null)

  // "Quantidade de Peças: 500" e "Valor por Peça: R$ 4,50" não podem virar descrição
  const semDescricao = extrairDadosOp('Valor por Peça: R$ 4,50\nQuantidade de Peças: 500', [])
  verificar('não confunde "Peças:" com descrição', semDescricao.campos.descricao, null)
  verificar('quantidade mesmo sem rótulo de descrição', semDescricao.campos.quantidade_pecas, 500)

  // ─────────────────────────────────────────────────────────
  // 4. Regras de parsing
  // ─────────────────────────────────────────────────────────
  const milhar = extrairDadosOp('Quantidade: 1.500', [])
  verificar('quantidade com milhar (1.500)', milhar.campos.quantidade_pecas, 1500)

  const moedaSimples = extrairDadosOp('Valor: R$ 1.234,56', [])
  verificar('moeda com milhar e decimal', moedaSimples.campos.valor_peca, 1234.56)

  const dataValida = extrairDadosOp('Entrega: 25/12/2026', [])
  verificar('data no formato brasileiro', dataValida.campos.data_entrega, '2026-12-25')

  const dataInvalida = extrairDadosOp('Data de Entrega: 40/13/2026', [])
  verificar('data impossível fica nula', dataInvalida.campos.data_entrega, null)

  const dataAusente = extrairDadosOp('Data de Entrega: Não definida', [])
  verificar('"Não definida" não vira data', dataAusente.campos.data_entrega, null)

  const qtdZero = extrairDadosOp('Quantidade: 0', [])
  verificar('quantidade zero é inválida', qtdZero.campos.quantidade_pecas, null)

  const obsVazia = extrairDadosOp('Observações: Nenhuma observação', [])
  verificar('observação placeholder fica nula', obsVazia.campos.observacoes, null)

  // ─────────────────────────────────────────────────────────
  // 5. Etapas: só as cadastradas no estabelecimento
  // ─────────────────────────────────────────────────────────
  const textoEtapas = [
    'OP: 120',
    'Descrição: Camiseta',
    'Etapas: Corte, Costura (3 min), Acabamento, Impressão',
  ].join('\n')
  const comEtapas = extrairDadosOp(textoEtapas, etapasEstabelecimento)
  verificar(
    'etapas relacionadas ao cadastro',
    comEtapas.etapas.map((e) => e.descricao),
    ['Corte', 'Costura', 'Acabamento']
  )
  verificar(
    'ordem do documento preservada',
    comEtapas.etapas.map((e) => e.id_da_funcao),
    [1, 2, 3]
  )
  verificar('tempo informado no documento', comEtapas.etapas[1].tempo_documento, 3)
  verificar('etapa não cadastrada é sinalizada', comEtapas.etapasNaoReconhecidas, ['Impressão'])
  verificar('etapa inexistente não é criada', comEtapas.etapas.some((e) => e.id_da_funcao === 99), false)

  const semEtapas = extrairDadosOp('OP: 5\nDescrição: Shorts', [])
  verificar('sem etapa no documento → lista vazia', semEtapas.etapas, [])

  // ─────────────────────────────────────────────────────────
  // 6. PDF real gerado pelo sistema (quando presente)
  // ─────────────────────────────────────────────────────────
  const pdfReal = path.join(__dirname, '..', 'peca-op-79.pdf')
  if (fs.existsSync(pdfReal)) {
    const textoReal = await extrairTextoPdf(fs.readFileSync(pdfReal))
    const real = extrairDadosOp(textoReal.texto, [])
    verificar('PDF real → número da OP', real.informacoes.numero_op, 79)
    verificar('PDF real → quantidade', real.campos.quantidade_pecas, 500)
    verificar('PDF real → pedido por', real.campos.pedido_por, 'Guararapes')
    verificar('PDF real → descrição preenchida', Boolean(real.campos.descricao), true)
  } else {
    console.log('• peca-op-79.pdf não encontrado — teste do PDF real ignorado')
  }

  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`)
  process.exit(falhas === 0 ? 0 : 1)
}

principal().catch((err) => {
  console.error('\nERRO NO TESTE:', err)
  process.exit(1)
})
