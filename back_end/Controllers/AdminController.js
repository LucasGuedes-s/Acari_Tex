
const prisma = require('../config/prisma');
const Funcionarios = require('../Services/Funcionarios.services');
const bcrypt = require('bcrypt');

const {
  obterEvolucaoProducao
} = require('../Services/dashboardProducaoService');

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
// GET /admin/estabelecimentos
async function listarEstabelecimentos(req, res, next) {
  try {
    const agora = new Date();

    // Janela de atividade: últimas 72 horas
    const limite72Horas = new Date(
      agora.getTime() - 72 * 60 * 60 * 1000
    );

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
        }
      },
      orderBy: {
        nome: 'asc'
      }
    });

    // Limita os cálculos simultâneos para evitar sobrecarregar o banco.
    const LIMITE_CONCORRENCIA = 3;
    const resultado = new Array(estabelecimentos.length);

    let indice = 0;

    async function processarEstabelecimentos() {
      while (indice < estabelecimentos.length) {
        const posicao = indice++;
        const estabelecimento = estabelecimentos[posicao];

        try {
          // Mantém a mesma fonte de cálculo do dashboard.
          const dadosProducao = await obterEvolucaoProducao(
            estabelecimento.cnpj,
            { dias: 30 }
          );

          const eficienciaAtual =
            dadosProducao.resumo.eficienciaUtilizada ??
            dadosProducao.resumo.eficienciaReferencia;
            
          const atividade = mapaAtividades.get(estabelecimento.cnpj);

          const funcionariosAtivos = estabelecimento.usuarios.filter(
            (usuario) => usuario.status !== 'inativo'
          );

          resultado[posicao] = {
            cnpj: estabelecimento.cnpj,
            nome: estabelecimento.nome,
            endereco: estabelecimento.endereco,
            telefone: estabelecimento.telefone,

            quantidade_funcionarios: estabelecimento.usuarios.length,
            funcionarios_ativos: funcionariosAtivos.length,

            eficiencia_atual: eficienciaAtual,
            eficiencia_calculada_em: eficienciaAtual !== null
              ? agora
              : null,

            status: atividade ? 'ativo' : 'inativo',
            ativo: Boolean(atividade),
            ultima_atividade: atividade?.ultima_atividade ?? null,
            registros_ultimas_72h: atividade?.registros_periodo ?? 0,

            funcionarios: estabelecimento.usuarios
          };
        } catch (erro) {
          console.error(
            `Erro ao calcular eficiência do estabelecimento ${estabelecimento.cnpj}:`,
            erro
          );

          const atividade = mapaAtividades.get(estabelecimento.cnpj);

          const funcionariosAtivos = estabelecimento.usuarios.filter(
            (usuario) => usuario.status !== 'inativo'
          );

          resultado[posicao] = {
            cnpj: estabelecimento.cnpj,
            nome: estabelecimento.nome,
            endereco: estabelecimento.endereco,
            telefone: estabelecimento.telefone,

            quantidade_funcionarios: estabelecimento.usuarios.length,
            funcionarios_ativos: funcionariosAtivos.length,

            eficiencia_atual: null,
            eficiencia_calculada_em: null,

            status: atividade ? 'ativo' : 'inativo',
            ativo: Boolean(atividade),
            ultima_atividade: atividade?.ultima_atividade ?? null,
            registros_ultimas_72h: atividade?.registros_periodo ?? 0,

            funcionarios: estabelecimento.usuarios
          };
        }
      }
    }

    await Promise.all(
      Array.from(
        {
          length: Math.min(
            LIMITE_CONCORRENCIA,
            estabelecimentos.length
          )
        },
        () => processarEstabelecimentos()
      )
    );

    return res.status(200).json({
      estabelecimentos: resultado
    });

  } catch (error) {
    console.error('Erro ao listar estabelecimentos:', error);
    next(error);
  }
}

// POST /admin/estabelecimentos
async function cadastrarEstabelecimento(req, res, next) {
  try {
    const {
      nome,
      cnpj,
      endereco,
      telefone,
      gestor
    } = req.body;

    // Validação dos dados do estabelecimento
    if (!nome || !cnpj) {
      return res.status(400).json({
        message: 'Nome e CNPJ são obrigatórios.'
      });
    }

    // Validação dos dados do primeiro usuário
    if (
      !gestor?.nome ||
      !gestor?.email ||
      !gestor?.idade ||
      !gestor?.senha
    ) {
      return res.status(400).json({
        message: 'Informe nome, e-mail, idade e senha do administrador.'
      });
    }

    const idade = Number(gestor.idade);
    const email = gestor.email.trim().toLowerCase();
    const senhaTexto = String(gestor.senha);

    if (!Number.isInteger(idade) || idade < 14 || idade > 100) {
      return res.status(400).json({
        message: 'Idade inválida.'
      });
    }

    if (senhaTexto.length < 8 || senhaTexto.length > 72) {
      return res.status(400).json({
        message: 'A senha deve ter entre 8 e 72 caracteres.'
      });
    }

    const cnpjFormatado = formatarCNPJ(cnpj);

    if (!cnpjFormatado) {
      return res.status(400).json({
        message: 'CNPJ inválido.'
      });
    }

    // Verifica se o e-mail já está cadastrado
    const usuarioExistente = await prisma.usuarios.findUnique({
      where: { email }
    });

    if (usuarioExistente) {
      return res.status(409).json({
        message: 'Já existe um usuário com esse e-mail.'
      });
    }

    // Criptografa a senha antes de salvar
    const senhaHash = await bcrypt.hash(senhaTexto, 10);

    // Cria estabelecimento e administrador na mesma transação
    const resultado = await prisma.$transaction(async (tx) => {
      const estabelecimento = await tx.estabelecimento.create({
        data: {
          nome: nome.trim(),
          cnpj: cnpjFormatado,
          endereco: endereco || null,
          telefone: telefone || null
        }
      });

      const administrador = await tx.usuarios.create({
        data: {
          nome: gestor.nome.trim(),
          email,
          senha: senhaHash,
          idade,
          telefone: gestor.telefone || null,
          funcoes: 'Administrador',
          permissoes: 1,
          foto: 'https://pub-f5850e3c1d5b490ea1e15aacf2014355.r2.dev/uploads/648199935_18057936629679738_8568387996695226498_n.jpg',
          estabelecimentoCnpj: estabelecimento.cnpj
        },
        select: {
          nome: true,
          email: true,
          estabelecimentoCnpj: true,
          permissoes: true
        }
      });

      return {
        estabelecimento,
        administrador
      };
    });

    return res.status(201).json({
      message: 'Estabelecimento e administrador cadastrados com sucesso.',
      estabelecimento: resultado.estabelecimento,
      administrador: resultado.administrador
    });

  } catch (error) {
    console.error('Erro ao cadastrar estabelecimento:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'O CNPJ ou e-mail informado já está cadastrado.'
      });
    }

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
      fotoUrl,
      senha,
      telefone
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

    const dadosFuncionario = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      idade: Number(idade),
      funcoes: funcoes || funcao,
      permissoes: 1, // 1 = funcionário administrador, 2 = funcionário comum
      fotoUrl: fotoUrl || null,
      senha,
      telefone
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
