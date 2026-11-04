'use strict';

/**
 * Cadastrar OP por PDF — etapa de ANÁLISE do documento.
 *
 * Recebe o PDF, extrai os dados com regras determinísticas (sem IA) e
 * devolve um JSON estruturado para conferência do usuário.
 *
 * Regras importantes:
 *  - NADA é persistido aqui: a OP só é criada no fluxo existente
 *    (POST /adicionar/peca) depois da confirmação do usuário;
 *  - o arquivo vive apenas em memória durante a requisição (multer
 *    memoryStorage) e é descartado junto com o buffer ao final — nada é
 *    gravado em disco nem enviado para serviços externos;
 *  - a consulta é restrita ao estabelecimento do usuário autenticado.
 */

const multer = require('multer');
const prisma = require('../config/prisma');
const {
  extrairTextoPdf,
  extrairDadosOp,
  TAMANHO_MAXIMO_BYTES,
} = require('../Services/pdfImport.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: TAMANHO_MAXIMO_BYTES,
    files: 1,
    fields: 5,
  },
  fileFilter: (req, file, cb) => {
    const extensaoOk = /\.pdf$/i.test(file.originalname || '');
    const tipoOk = file.mimetype === 'application/pdf';
    if (extensaoOk && tipoOk) return cb(null, true);
    const err = new Error('Tipo de arquivo não permitido. Envie um arquivo PDF.');
    err.codigo = 'ARQUIVO_NAO_PERMITIDO';
    cb(err);
  },
});

// middleware de upload que converte erros do multer em resposta JSON
function receberPdf(req, res, next) {
  upload.single('arquivo')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        erro: `Arquivo muito grande. O limite é de ${Math.floor(
          TAMANHO_MAXIMO_BYTES / (1024 * 1024)
        )} MB.`,
        codigo: 'ARQUIVO_GRANDE',
      });
    }
    return res.status(400).json({
      erro: err.message || 'Falha ao receber o arquivo.',
      codigo: err.codigo || 'UPLOAD_INVALIDO',
    });
  });
}

async function postImportarPdf(req, res) {
  try {
    const cnpj = req.user && req.user.cnpj;
    if (!cnpj) {
      return res.status(401).json({ erro: 'Usuário não autenticado.', codigo: 'SEM_TOKEN' });
    }

    const estabelecimento = await prisma.estabelecimento.findUnique({
      where: { cnpj },
      select: { cnpj: true },
    });
    if (!estabelecimento) {
      return res
        .status(404)
        .json({ erro: 'Estabelecimento não encontrado.', codigo: 'SEM_ESTABELECIMENTO' });
    }

    const arquivo = req.file;
    if (!arquivo || !arquivo.buffer || !arquivo.buffer.length) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado.', codigo: 'SEM_ARQUIVO' });
    }

    let resultado;
    try {
      resultado = await extrairTextoPdf(arquivo.buffer);
    } catch (err) {
      const status =
        err.codigo === 'SEM_TEXTO'
          ? 422
          : err.codigo === 'ARQUIVO_VAZIO'
          ? 400
          : 422;
      return res.status(status).json({
        erro: err.message,
        codigo: err.codigo || 'PDF_INVALIDO',
        semTextoExtraivel: Boolean(err.semTextoExtraivel),
      });
    }

    // Etapas já cadastradas no estabelecimento (somente leitura)
    const etapas = await prisma.etapa.findMany({
      where: { id_Estabelecimento: cnpj },
      select: { id_da_funcao: true, descricao: true, tempo_padrao: true },
      orderBy: { descricao: 'asc' },
    });

    const dados = extrairDadosOp(resultado.texto, etapas);
    const avisos = [];

    // Número da OP: o sistema não possui campo próprio (id_da_op é automático),
    // mas verificamos se o número encontrado já existe para avisar o usuário.
    const numero = dados.informacoes.numero_op;
    let opExistente = null;
    if (numero) {
      const existente = await prisma.pecasOP.findUnique({
        where: { id_da_op: numero },
        select: { id_da_op: true, id_Estabelecimento: true, descricao: true },
      });
      if (existente) {
        opExistente = {
          id_da_op: existente.id_da_op,
          noMesmoEstabelecimento: existente.id_Estabelecimento === cnpj,
          descricao: existente.descricao || null,
        };
        avisos.push(
          existente.id_Estabelecimento === cnpj
            ? `Já existe uma OP com o número ${numero} cadastrada neste estabelecimento.`
            : `O número ${numero} pertence a uma OP de outro estabelecimento.`
        );
      }
    }

    if (dados.etapasNaoReconhecidas.length) {
      avisos.push(
        'Algumas etapas do documento não correspondem às etapas cadastradas. ' +
          'Selecione manualmente na etapa "Processo de Produção".'
      );
    }
    if (dados.camposNaoEncontrados.length) {
      avisos.push(
        'Preencha manualmente os campos que não foram identificados antes de confirmar.'
      );
    }

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({
      arquivo: {
        nome: arquivo.originalname,
        tamanho: arquivo.size || arquivo.buffer.length,
      },
      paginas: resultado.paginas,
      campos: dados.campos,
      camposNaoEncontrados: dados.camposNaoEncontrados,
      informacoes: {
        numero_op: numero,
        referencia: dados.informacoes.referencia,
        opExistente,
      },
      etapas: dados.etapas,
      etapasNaoReconhecidas: dados.etapasNaoReconhecidas,
      avisos,
    });
  } catch (err) {
    console.error('Erro ao importar OP por PDF:', err.message);
    return res
      .status(500)
      .json({ erro: 'Erro ao processar o PDF. Tente novamente.', codigo: 'ERRO_INTERNO' });
  }
}

module.exports = { postImportarPdf, receberPdf };
