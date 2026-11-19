
const prisma = require('../config/prisma');

const STATUS_VALIDOS = [
  'não contatado',
  'em contato',
  'qualificado',
  'contrato em andamento',
  'cliente'
];

// Lista todos os leads
async function listarLeads(req, res) {
  try {
    const leads = await prisma.leads.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json(leads);
  } catch (error) {
    console.error('Erro ao listar leads:', error);

    return res.status(500).json({
      erro: 'Erro ao buscar leads.'
    });
  }
}

// Cadastra um novo lead
async function criarLead(req, res) {
  try {
    console.log('Dados recebidos para cadastro:', req.body);

    const {
      nome,
      cnpj,
      telefone,
      endereco,
      contato_nome,
      contato_email,
      contato_telefone
    } = req.body;

    if (!nome || !contato_nome) {
      return res.status(400).json({
        erro: 'Nome do estabelecimento e nome do contato são obrigatórios.'
      });
    }

    const lead = await prisma.leads.create({
      data: {
        nome: nome.trim(),
        cnpj: cnpj || null,
        telefone: telefone || null,
        endereco: endereco || null,
        contatoNome: contato_nome.trim(),
        contatoEmail: contato_email || null,
        contatoTelefone: contato_telefone || null,
        status: 'não contatado'
      }
    });

    return res.status(201).json(lead);
  } catch (error) {
    console.error('Erro ao criar lead:', error);
    console.log('Resposta do servidor:', error.response?.data);

    return res.status(500).json({
      erro: 'Erro ao cadastrar lead.'
    });
  }
}

// Atualiza o status do lead

async function atualizarStatusLead(req, res) {
  console.log('PATCH recebido:', req.params.id);
  console.log('Dados recebidos:', req.body);

  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const statusMap = {
      nao_contatado: 'não contatado',
      em_contato: 'em contato',
      qualificado: 'qualificado',
      contrato_em_andamento: 'contrato em andamento',
      cliente: 'cliente'
    };

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }

    if (!statusMap[status]) {
      return res.status(400).json({ erro: 'Status inválido.' });
    }

    const lead = await prisma.leads.findUnique({
      where: { id }
    });

    if (!lead) {
      return res.status(404).json({ erro: 'Lead não encontrado.' });
    }

    // Conversão para estabelecimento ao se tornar cliente
    if (status === 'cliente') {
      if (!lead.cnpj) {
        return res.status(400).json({
          erro: 'Informe o CNPJ antes de converter o lead em cliente.'
        });
      }

      const cnpj = lead.cnpj.replace(/\D/g, '');

      if (cnpj.length !== 14) {
        return res.status(400).json({
          erro: 'CNPJ inválido.'
        });
      }

      const cnpjFormatado = cnpj.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
      );

      await prisma.estabelecimento.upsert({
        where: { cnpj: cnpjFormatado },
        update: {},
        create: {
          cnpj: cnpjFormatado,
          nome: lead.nome,
          endereco: lead.endereco,
          telefone: lead.telefone
        }
      });
    }

    const leadAtualizado = await prisma.leads.update({
      where: { id },
      data: { status: statusMap[status] }
    });

    return res.status(200).json(leadAtualizado);

  } catch (error) {
    console.error('Erro ao atualizar status do lead:', error);

    return res.status(500).json({
      erro: 'Erro ao atualizar status do lead.',
      detalhe: error.message
    });
  }
}

module.exports = {
  listarLeads,
  criarLead,
  atualizarStatusLead
};
