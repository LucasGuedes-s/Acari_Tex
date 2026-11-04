// TESTE: rota de importação de OP por PDF (upload + análise, sem persistência)
// Execute com: node tests/importarPdf_test.js
//
// Cenários:
//   1. PDF digital com todos os campos        → 200 com dados extraídos
//   2. PDF com campos ausentes                → 200 com camposNaoEncontrados
//   3. número de OP já cadastrado             → 200 com aviso
//   4. PDF sem texto extraível                → 422 SEM_TEXTO
//   5. PDF inválido/corrompido                → 422 PDF_CORROMPIDO
//   6. formato não permitido / arquivo grande → 400 / 413 (upload middleware)
//   9. cancelamento                           → nada é persistido (create bloqueado)
//  10. usuário sem autorização no estabelecimento → 401 / 404
//
// O Prisma é substituído por mocks, então o teste não depende de banco.

const express = require('express')
const PDFDocument = require('pdfkit')
const { postImportarPdf, receberPdf } = require('../Controllers/PdfImportController')
const prisma = require('../config/prisma')

let falhas = 0
function verificar(nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas++
  console.log(
    `${ok ? '✔' : '✖'} ${nome}` +
      (ok ? '' : ` | esperado: ${JSON.stringify(esperado)} | obtido: ${JSON.stringify(obtido)}`)
  )
}

// ── mocks do Prisma ──────────────────────────────────────────
const CNPJ = '12345678000190'
let estabelecimentoExiste = true
let opExistente = null

prisma.estabelecimento.findUnique = async () => (estabelecimentoExiste ? { cnpj: CNPJ } : null)
prisma.etapa.findMany = async () => [
  { id_da_funcao: 1, descricao: 'Corte', tempo_padrao: 2 },
  { id_da_funcao: 2, descricao: 'Costura', tempo_padrao: 3 },
  { id_da_funcao: 3, descricao: 'Acabamento', tempo_padrao: null },
]
prisma.pecasOP.findUnique = async ({ where }) =>
  opExistente && opExistente.id_da_op === where.id_da_op ? opExistente : null

// a análise NÃO pode criar nada no banco
function proibir(nome, metodo) {
  prisma[nome][metodo] = async () => {
    throw new Error(`A análise não pode chamar ${nome}.${metodo}`)
  }
}
proibir('pecasOP', 'create')
proibir('etapa', 'create')
proibir('pecasEtapas', 'createMany')

// ── helpers ─────────────────────────────────────────────────
function gerarPdf(linhas) {
  const texto = Array.isArray(linhas) ? linhas.join('\n') : String(linhas)
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument()
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.text(texto)
    doc.end()
  })
}

function pdfImagem() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument()
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.rect(50, 50, 400, 600).fill('#0e6632')
    doc.end()
  })
}

function chamarController({ file, user }) {
  return new Promise((resolve) => {
    const req = { file, user }
    const res = {
      statusCode: 200,
      body: null,
      set() {
        return this
      },
      status(codigo) {
        this.statusCode = codigo
        return this
      },
      json(corpo) {
        this.body = corpo
        resolve({ status: this.statusCode, body: corpo })
      },
    }
    Promise.resolve(postImportarPdf(req, res)).catch((err) =>
      resolve({ status: 500, body: { erro: String(err.message) } })
    )
  })
}

function arquivo(nome, buffer, mimetype) {
  return { originalname: nome, buffer, mimetype, size: buffer.length }
}

function sobeServidorUpload() {
  const app = express()
  app.post('/upload-pdf', receberPdf, (req, res) =>
    res.status(200).json({ ok: true, nome: req.file.originalname })
  )
  return new Promise((resolve) => {
    const servidor = app.listen(0, () => resolve(servidor))
  })
}

async function enviarArquivo(porta, nome, conteudo, tipo) {
  const form = new FormData()
  form.append('arquivo', new Blob([conteudo], { type: tipo }), nome)
  const resposta = await fetch(`http://127.0.0.1:${ porta}/upload-pdf`, {
    method: 'POST',
    body: form,
  })
  return { status: resposta.status, body: await resposta.json() }
}

// ── cenários ────────────────────────────────────────────────
async function principal() {
  const pdfCompleto = await gerarPdf([
    'ORDEM DE PRODUÇÃO',
    'OP: 42',
    'Descrição: Camiseta manga curta',
    'Referência: CAM-001',
    'Cliente: Guararapes',
    'Quantidade: 1.500',
    'Valor por Peça: R$ 1.234,56',
    'Data de Entrega: 10/06/2026',
    'Tempo padrão (min): 12',
    'Observações: Produção em 2 lotes',
    'Etapas: Corte, Costura, Acabamento, Impressão',
  ].join('\n'))

  // 1. PDF com todos os campos
  const completo = await chamarController({
    file: arquivo('op42.pdf', pdfCompleto, 'application/pdf'),
    user: { cnpj: CNPJ },
  })
  verificar('cenário 1 → status 200', completo.status, 200)
  verificar('cenário 1 → descrição', completo.body.campos.descricao, 'Camiseta manga curta')
  verificar('cenário 1 → quantidade com milhar', completo.body.campos.quantidade_pecas, 1500)
  verificar('cenário 1 → número da OP', completo.body.informacoes.numero_op, 42)
  verificar('cenário 1 → referência informativa', completo.body.informacoes.referencia, 'CAM-001')
  verificar(
    'cenário 1 → etapas do estabelecimento',
    completo.body.etapas.map((e) => e.descricao),
    ['Corte', 'Costura', 'Acabamento']
  )
  verificar('cenário 1 → etapa extra sinalizada', completo.body.etapasNaoReconhecidas, ['Impressão'])
  verificar('cenário 1 → arquivo não persistido', completo.body.arquivo.nome, 'op42.pdf')

  // 2. PDF com campos ausentes
  const parcial = await chamarController({
    file: arquivo('op.pdf', await gerarPdf(['Peça: Calça Jeans', 'Quantidade: 30']), 'application/pdf'),
    user: { cnpj: CNPJ },
  })
  verificar('cenário 2 → status 200', parcial.status, 200)
  verificar(
    'cenário 2 → campos ausentes informados',
    parcial.body.camposNaoEncontrados,
    ['valor_peca', 'data_entrega', 'pedido_por', 'tempo_padrao', 'observacoes']
  )
  verificar(
    'cenário 2 → aviso de preenchimento manual',
    parcial.body.avisos.some((a) => a.toLowerCase().includes('preencha')),
    true
  )

  // 3. número de OP já cadastrado
  opExistente = { id_da_op: 42, id_Estabelecimento: CNPJ, descricao: 'Outra peça' }
  const duplicada = await chamarController({
    file: arquivo('op42.pdf', pdfCompleto, 'application/pdf'),
    user: { cnpj: CNPJ },
  })
  verificar(
    'cenário 3 → aviso de OP já cadastrada',
    duplicada.body.avisos.some((a) => a.includes('Já existe uma OP com o número 42')),
    true
  )
  verificar('cenário 3 → OP existente identificada', duplicada.body.informacoes.opExistente.id_da_op, 42)
  opExistente = null

  // 4. PDF sem texto (digitalizado)
  const semTexto = await chamarController({
    file: arquivo('digitalizado.pdf', await pdfImagem(), 'application/pdf'),
    user: { cnpj: CNPJ },
  })
  verificar('cenário 4 → status 422', semTexto.status, 422)
  verificar('cenário 4 → código SEM_TEXTO', semTexto.body.codigo, 'SEM_TEXTO')
  verificar('cenário 4 → sinaliza ausência de OCR', semTexto.body.semTextoExtraivel, true)

  // 5. PDF inválido/corrompido
  const corrompido = await chamarController({
    file: arquivo('quebrado.pdf', Buffer.from('%PDF-1.4 sem estrutura'), 'application/pdf'),
    user: { cnpj: CNPJ },
  })
  verificar('cenário 5 → status 422', corrompido.status, 422)
  verificar('cenário 5 → código PDF_CORROMPIDO', corrompido.body.codigo, 'PDF_CORROMPIDO')

  const naoPdf = await chamarController({
    file: arquivo('foto.jpg', Buffer.from('nada aqui'), 'image/jpeg'),
    user: { cnpj: CNPJ },
  })
  verificar('cenário 6 → arquivo sem assinatura PDF rejeitado', naoPdf.body.codigo, 'ARQUIVO_INVALIDO')

  const semArquivo = await chamarController({ file: null, user: { cnpj: CNPJ } })
  verificar('cenário 6 → sem arquivo → 400', semArquivo.status, 400)

  // 10. autorização
  const semToken = await chamarController({
    file: arquivo('op.pdf', pdfCompleto, 'application/pdf'),
    user: null,
  })
  verificar('cenário 10 → sem usuário → 401', semToken.status, 401)

  estabelecimentoExiste = false
  const outroEstabelecimento = await chamarController({
    file: arquivo('op.pdf', pdfCompleto, 'application/pdf'),
    user: { cnpj: CNPJ },
  })
  verificar('cenário 10 → estabelecimento inexistente → 404', outroEstabelecimento.status, 404)
  estabelecimentoExiste = true

  // 6. upload: tipo e tamanho (middleware multer)
  const servidor = await sobeServidorUpload()
  const porta = servidor.address().port

  const txt = await enviarArquivo(porta, 'documento.txt', Buffer.from('ola'), 'text/plain')
  verificar('upload → formato não permitido → 400', txt.status, 400)
  verificar('upload → código ARQUIVO_NAO_PERMITIDO', txt.body.codigo, 'ARQUIVO_NAO_PERMITIDO')

  const pdfOk = await enviarArquivo(porta, 'op.pdf', pdfCompleto, 'application/pdf')
  verificar('upload → PDF aceito → 200', pdfOk.status, 200)

  const grande = await enviarArquivo(
    porta,
    'grande.pdf',
    Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(9 * 1024 * 1024, 0)]),
    'application/pdf'
  )
  verificar('upload → arquivo acima de 8 MB → 413', grande.status, 413)
  verificar('upload → código ARQUIVO_GRANDE', grande.body.codigo, 'ARQUIVO_GRANDE')

  servidor.close()

  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`)
  process.exit(falhas === 0 ? 0 : 1)
}

principal().catch((err) => {
  console.error('\nERRO NO TESTE:', err)
  process.exit(1)
})
