const { PrismaClient } = require('@prisma/client');
const { get } = require('../Routes/EstoqueTecido.router');
prisma = new PrismaClient()
function getData() {
    const agora = new Date();
    const offsetBrasil = -3;
    const utc = agora.getTime() + agora.getTimezoneOffset() * 60000;
    const brasil = new Date(utc + 3600000 * offsetBrasil);

    brasil.setHours(0, 0, 0, 0);
    return brasil;
}
function criarDataLocal(data) {
    const [ano, mes, dia] = data.split('-')

    return new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia),
    )
}
async function salvarMetaDia(data) {

    const metaDia = await prisma.metaDia.upsert({

        where: {
            estabelecimentoCnpj_data: {
                estabelecimentoCnpj: data.estabelecimento,
                data: getData(),
            },
        },

        update: {},

        create: {
            estabelecimentoCnpj: data.estabelecimento,
            data: getData(),
            registradoPor: data.usuario || null,
        },
    })

    // REMOVE PEÇAS ANTIGAS
    await prisma.metaDiaPeca.deleteMany({
        where: {
            metaDiaId: metaDia.id,
        },
    })

    // SALVA PEÇAS
    if (data.pecas?.length) {

        await prisma.metaDiaPeca.createMany({

            data: data.pecas.map(peca => ({
                metaDiaId: metaDia.id,

                id_da_op: Number(
                    peca.id_da_op
                ),

                meta: Number(
                    peca.meta || 0
                ),
            })),

            skipDuplicates: true,
        })
    }

    // REMOVE CONFIGURAÇÕES ANTIGAS DOS FUNCIONÁRIOS
    await prisma.metaDiaFuncionario.deleteMany({
        where: {
            metaDiaId: metaDia.id,
        },
    })

    // SALVA FUNCIONÁRIOS E ETAPAS
    if (data.funcionarios?.length) {

        await prisma.metaDiaFuncionario.createMany({

            data: data.funcionarios.map(func => ({

                metaDiaId: metaDia.id,

                funcionarioId:
                    func.funcionarioId,

                etapaPadraoId:
                    func.etapaPadraoId || null,
            })),

            skipDuplicates: true,
        })
    }

    return await prisma.metaDia.findUnique({

        where: {
            id: metaDia.id,
        },

        include: {

            pecas: {
                include: {
                    peca: true,
                },
            },

            funcionarios: {
                include: {
                    funcionario: true,
                    etapa: true,
                },
            },
        },
    })
}
async function buscarMetaDia({ estabelecimento, data }) {
    const [ano, mes, dia] = data.split('-').map(Number)

    const dataDia = new Date(
        Date.UTC(ano, mes - 1, dia, 0, 0, 0)
    )

    const inicioDiaUTC = new Date(
        Date.UTC(ano, mes - 1, dia, 0, 0, 0)
    )

    const fimDiaUTC = new Date(
        Date.UTC(ano, mes - 1, dia, 23, 59, 59, 999)
    )

    const todas = await prisma.metaDia.findMany({
        where: {
            estabelecimentoCnpj: estabelecimento,
        },
    })

    console.log('AQUJIs')

    const metaDia = await prisma.metaDia.findFirst({
        where: {
            estabelecimentoCnpj: estabelecimento,
            data: dataDia,
        },

        include: {
            pecas: {
                include: {
                    peca: true,
                },
            },

            funcionarios: {
                include: {
                    funcionario: {
                        select: {
                            nome: true,
                            foto: true,
                            funcoes: true,
                            permissoes: true,
                        },
                    },

                    etapa: true,
                },
            },
        },
    })
    console.log(JSON.stringify(metaDia.funcionarios, null, 2))
    if (!metaDia) {
        return null
    }

    const producoes = await prisma.producao.findMany({
        where: {
            id_Estabelecimento: estabelecimento,
            data_inicio: {
                gte: inicioDiaUTC,
                lte: fimDiaUTC,
            },
        },

        include: {
            producao_etapa: true,
            producao_peca: true,
        },

        orderBy: [
            {
                id_funcionario: 'asc',
            },
            {
                horaNumero: 'asc',
            },
        ],
    })

    const producoesAgrupadas = {}

    for (const prod of producoes) {
        if (!producoesAgrupadas[prod.id_funcionario]) {
            producoesAgrupadas[prod.id_funcionario] = []
        }

        producoesAgrupadas[prod.id_funcionario].push(prod)
    }

    metaDia.funcionarios = metaDia.funcionarios.map(func => ({
        ...func,
        producoes:
            producoesAgrupadas[func.funcionarioId] || [],
    }))

    return metaDia
}
module.exports = {
    buscarMetaDia,
    salvarMetaDia,
}

