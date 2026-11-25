
const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

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
      contato_telefone,
      contato_idade,
      senha_administrador
    } = req.body;

    if (!nome || !contato_nome) {
      return res.status(400).json({
        erro: 'Nome do estabelecimento e nome do contato são obrigatórios.'
      });
    }

    if (
      !Number.isInteger(Number(contato_idade)) ||
      Number(contato_idade) <= 0 ||
      !senha_administrador ||
      senha_administrador.length < 8
    ) {
      return res.status(400).json({
        erro: 'Informe uma idade válida e uma senha com pelo menos 8 caracteres.'
      });
    }

    const senhaAdministradorHash = await bcrypt.hash(
      senha_administrador,
      10
    );

    const lead = await prisma.leads.create({
      data: {
        nome: nome.trim(),
        cnpj: cnpj || null,
        telefone: telefone || null,
        endereco: endereco || null,
        contatoNome: contato_nome.trim(),
        contatoEmail: contato_email || null,
        contatoTelefone: contato_telefone || null,
        contatoIdade: Number(contato_idade),
        senhaAdministradorHash,
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
      return res.status(404).json({
        erro: 'Lead não encontrado.'
      });
    }

    const leadAtualizado = await prisma.$transaction(async (tx) => {

      if (status === 'cliente') {
        if (!lead.cnpj) {
          throw new Error('Informe o CNPJ antes de converter o lead em cliente.');
        }

        const cnpj = lead.cnpj.replace(/\D/g, '');

        if (cnpj.length !== 14) {
          throw new Error('CNPJ inválido.');
        }

        const cnpjFormatado = cnpj.replace(
          /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
          '$1.$2.$3/$4-$5'
        );

        // Cria ou localiza o estabelecimento
        await tx.estabelecimento.upsert({
          where: { cnpj: cnpjFormatado },
          update: {},
          create: {
            cnpj: cnpjFormatado,
            nome: lead.nome,
            endereco: lead.endereco,
            telefone: lead.telefone
          }
        });

        // Verifica se o administrador já foi criado
        const email = lead.contatoEmail?.trim().toLowerCase();

        if (!email) {
          throw new Error('O e-mail do administrador não foi informado.');
        }

        const usuarioExistente = await tx.usuarios.findUnique({
          where: { email }
        });

        if (usuarioExistente) {
          if (usuarioExistente.estabelecimentoCnpj !== cnpjFormatado) {
            throw new Error(
              'Este e-mail já está vinculado a outro estabelecimento.'
            );
          }
        } else {
          // Valida os dados necessários para criar o administrador
          if (
            !lead.contatoIdade ||
            !lead.senhaAdministradorHash
          ) {
            throw new Error(
              'Os dados de idade e senha do administrador não foram cadastrados no lead.'
            );
          }

          // Cria o primeiro usuário administrador
          await tx.usuarios.create({
            data: {
              nome: lead.contatoNome,
              email,
              senha: lead.senhaAdministradorHash,
              idade: lead.contatoIdade,
              telefone: lead.contatoTelefone || null,
              foto: '',
              funcoes: 'Administrador',
              permissoes: 1,
              status: 'ativo',
              Estabelecimento: {
                connect: {
                  cnpj: cnpjFormatado
                }
              }
            }
          });
        }

        // Remove o hash da senha armazenado no lead
        await tx.leads.update({
          where: { id },
          data: {
            status: 'cliente',
            senhaAdministradorHash: null
          }
        });

        return tx.leads.findUnique({
          where: { id }
        });
      }

      return tx.leads.update({
        where: { id },
        data: {
          status: statusMap[status]
        }
      });
    });

    return res.status(200).json({
      mensagem: 'Status atualizado com sucesso.',
      lead: leadAtualizado
    });

  } catch (error) {
    console.error('Erro ao atualizar status do lead:', error);

    return res.status(400).json({
      erro: error.message || 'Erro ao atualizar status do lead.'
    });
  }
}


module.exports = {
  listarLeads,
  criarLead,
  atualizarStatusLead
};
