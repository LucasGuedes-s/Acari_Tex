const estatisticas = require('../Services/Estatisticas.services');
async function estatisticasEquipe(req, usuario, res) {
  try {
    const resultado = await estatisticas.analisarProducaoFuncionarioDia(req, usuario);
    const cnpj = req.user.cnpj;

    if (!resultado || !Array.isArray(resultado.desempenho)) {
      console.warn("Nenhum dado de desempenho retornado:", resultado);
      return res?.status(200).json({ mensagem: "Sem dados de desempenho para hoje." });
    }

    for (const etapa of resultado.desempenho) {
      const promises = [];
      const LIMITE_MEDIA_BAIXA = 10;

      // 🔹 Notificação geral se média da etapa estiver baixa
      if (etapa.media < LIMITE_MEDIA_BAIXA) {
        const titulo = `Média baixa na etapa "${etapa.etapa}"`;
        const mensagemEtapa = `⚠️ A média da etapa "${etapa.etapa}" está baixa (${etapa.media}/h) às ${etapa.hora}. Verifique o desempenho da equipe.`;

        req.io.emit(`notificacao_${cnpj}`, {
          tipo: "info",
          mensagem: mensagemEtapa
        });

        promises.push(
          (async () => {
            const existente = await prisma.notificacoes.findFirst({
              where: {
                estabelecimentoCnpj: cnpj,
                titulo,
                etapa: etapa.etapa, // 👈 usa também a etapa
              },
            });

            if (existente) {
              await prisma.notificacoes.update({
                where: { id: existente.id },
                data: {
                  mensagem: mensagemEtapa,
                  criadaEm: new Date(),
                },
              });
            } else {
              await prisma.notificacoes.create({
                data: {
                  estabelecimentoCnpj: cnpj,
                  titulo,
                  mensagem: mensagemEtapa,
                  etapa: etapa.etapa, // 👈 salva a etapa
                  lida: false,
                  criadaEm: new Date(),
                },
              });
            }
          })()
        );
      }

      // 🔹 Notificação individual (abaixo da média)
      if (etapa.abaixoDaMedia) {
        const titulo = `Atenção: ${resultado.funcionario} abaixo da média`;
        const mensagem = `🚨 ${resultado.funcionario} está abaixo da média na etapa "${etapa.etapa}" com ${etapa.producao} peças/h, às ${etapa.hora} (média: ${etapa.media}/h).`;

        req.io.emit(`notificacao_${cnpj}`, {
          tipo: "warning",
          mensagem,
        });

        promises.push(
          (async () => {
            const existente = await prisma.notificacoes.findFirst({
              where: {
                estabelecimentoCnpj: cnpj,
                titulo,
                etapa: etapa.etapa, // 👈 mesma ideia aqui
              },
            });

            if (existente) {
              await prisma.notificacoes.update({
                where: { id: existente.id },
                data: {
                  mensagem,
                  criadaEm: new Date(),
                },
              });
            } else {
              await prisma.notificacoes.create({
                data: {
                  estabelecimentoCnpj: cnpj,
                  titulo,
                  mensagem,
                  etapa: etapa.etapa, 
                  lida: false,
                  criadaEm: new Date(),
                },
              });
            }
          })()
        );
      }

      await Promise.all(promises);
    }

    if (res) res.status(200).json({ resultado });
  } catch (err) {
    console.error(`Erro ao receber estatísticas:`, err.message);
    if (res) res.status(500).json({ erro: "Erro ao gerar estatísticas." });
  }
}

async function estatisticasPecas(req, res, next) {
    try {
        const projecoes = await estatisticas.projetarTodasProducoes(req);
        res.status(200).json({ projecoes });
    } catch (err) {
        console.error(`Erro ao obter projeções`, err.message);
        next(err);
    }
}
async function projetarProducao(req, res, next) {
    try {
        const projecoes = await estatisticas.producaoFinanceira(req);
        res.status(200).json({ projecoes });
    } catch (err) {
        console.error(`Erro ao obter projeções`, err.message);
        next(err);
    }

}
module.exports = {
    estatisticasEquipe,
    estatisticasPecas,
    projetarProducao
};