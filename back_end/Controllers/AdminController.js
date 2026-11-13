
const prisma = require('../config/prisma');
const Funcionarios = require('../Services/Funcionarios.services');

function formatarCNPJ(cnpj) {
  const numeros = String(cnpj || '').replace(/\D/g, '');

  if (numeros.length !== 14) {
    return null;
  }

  return numeros.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

// GET /admin/estabelecimentos
async function listarEstabelecimentos(req, res, next) {
  try {
    // Janela de atividade: últimas 72 horas
    const agora = new Date();
    const limite72Horas = new Date(
      agora.getTime() - 72 * 60 * 60 * 1000
    );

    // Busca a última produção registrada em cada estabelecimento
    const atividades = await prisma.producao.groupBy({
      by: ['id_Estabelecimento'],
      where: {
        data_inicio: {
          gte: limite72Horas,
          lte: agora
        }
      },
      _max: {
        data_inicio: true
      },
      _count: {
        _all: true
      }
    });

    // Mapa para localizar rapidamente a atividade de cada CNPJ
    const mapaAtividades = new Map(
      atividades.map((atividade) => [
        atividade.id_Estabelecimento,
        {
          ultima_atividade: atividade._max.data_inicio,
          registros_periodo: atividade._count._all
        }
      ])
    );

    const estabelecimentos = await prisma.estabelecimento.findMany({
      include: {
        usuarios: {
          select: {
            nome: true,
            email: true,
            status: true
          }
        },
        eficiencia_turma: {
          select: {
            eficiencia_percent: true,
            calculadoEm: true
          }
        }
      },
      orderBy: {
        nome: 'asc'
      }
    });

    const resultado = estabelecimentos.map((estabelecimento) => {
      const atividade = mapaAtividades.get(estabelecimento.cnpj);

      const funcionariosAtivos = estabelecimento.usuarios.filter(
        (usuario) => usuario.status !== 'inativo'
      );

      return {
        cnpj: estabelecimento.cnpj,
        nome: estabelecimento.nome,
        endereco: estabelecimento.endereco,
        telefone: estabelecimento.telefone,

        quantidade_funcionarios: estabelecimento.usuarios.length,
        funcionarios_ativos: funcionariosAtivos.length,

        eficiencia_atual:
          estabelecimento.eficiencia_turma?.eficiencia_percent ?? null,

        eficiencia_calculada_em:
          estabelecimento.eficiencia_turma?.calculadoEm ?? null,

        // Situação baseada na existência de produção nas últimas 72 horas
        status: atividade ? 'ativo' : 'inativo',
        ativo: Boolean(atividade),

        ultima_atividade: atividade?.ultima_atividade ?? null,
        registros_ultimas_72h: atividade?.registros_periodo ?? 0,

        funcionarios: estabelecimento.usuarios
      };
    });

    return res.status(200).json({
      estabelecimentos: resultado
    });
  } catch (error) {
    next(error);
  }
}

// POST /admin/estabelecimentos
async function cadastrarEstabelecimento(req, res, next) {
  try {
    const { nome, cnpj, endereco, telefone } = req.body;

    if (!nome || !cnpj) {
      return res.status(400).json({
        message: 'Nome e CNPJ são obrigatórios.'
      });
    }

    const cnpjFormatado = formatarCNPJ(cnpj);

    if (!cnpjFormatado) {
      return res.status(400).json({
        message: 'CNPJ inválido.'
      });
    }

    const existente = await prisma.estabelecimento.findUnique({
      where: {
        cnpj: cnpjFormatado
      }
    });

    if (existente) {
      return res.status(409).json({
        message: 'Já existe um estabelecimento cadastrado com esse CNPJ.'
      });
    }

    const estabelecimento = await prisma.estabelecimento.create({
      data: {
        nome: nome.trim(),
        cnpj: cnpjFormatado,
        endereco: endereco || null,
        telefone: telefone || null
      }
    });

    return res.status(201).json({
      message: 'Estabelecimento cadastrado com sucesso.',
      estabelecimento
    });
  } catch (error) {
    next(error);
  }
}

// POST /admin/funcionarios
async function cadastrarFuncionario(req, res, next) {
  try {
    const {
      cnpj,
      nome,
      email,
      idade,
      funcao,
      funcoes,
      fotoUrl
    } = req.body;

    if (!cnpj || !nome || !email || !idade || !funcao) {
      return res.status(400).json({
        message: 'Informe CNPJ, nome, e-mail, idade e função.'
      });
    }

    const cnpjFormatado = formatarCNPJ(cnpj);

    if (!cnpjFormatado) {
      return res.status(400).json({
        message: 'CNPJ inválido.'
      });
    }

    const estabelecimento = await prisma.estabelecimento.findUnique({
      where: {
        cnpj: cnpjFormatado
      }
    });

    if (!estabelecimento) {
      return res.status(404).json({
        message: 'Estabelecimento não encontrado.'
      });
    }

    // A permissão é definida pelo servidor.
    // O formulário não pode cadastrar um funcionário como administrador.
    const dadosFuncionario = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      idade: Number(idade),
      funcoes: funcoes || funcao,
      permissao: 'funcionario',
      fotoUrl: fotoUrl || null
    };

    const funcionario = await Funcionarios.postFuncionario(
      dadosFuncionario,
      cnpjFormatado
    );

    return res.status(201).json({
      message: 'Funcionário cadastrado com sucesso.',
      funcionario: {
        nome: funcionario.nome,
        email: funcionario.email,
        estabelecimentoCnpj: funcionario.estabelecimentoCnpj
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarEstabelecimentos,
  cadastrarEstabelecimento,
  cadastrarFuncionario
};
