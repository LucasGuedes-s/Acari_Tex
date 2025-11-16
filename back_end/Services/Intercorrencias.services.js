const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function postIntercorrencia(req) {
    console.log('Chegou na service');
    const { descricao, registradaPor, tempo_perda, data_ocorrencia, notas } = req.body;
    const cnpj = req.user.cnpj;
    const novaIntercorrencia = await prisma.intercorrencias.create({
        data: {
            descricao,
            registradaPor: registradaPor,
            tempo_perda,
            data_ocorrencia: new Date(data_ocorrencia),
            notas,
            estabelecimento: {
                connect: { cnpj } 
            }
        }
    });
    return novaIntercorrencia;  
}

async function getIntercorrencias(req) {
  const cnpj = req.user.cnpj;

  const intercorrencias = await prisma.intercorrencias.findMany({
    where: {
      estabelecimentoCnpj: cnpj
    },
    orderBy: {
      data_ocorrencia: 'desc'
    }
  });

  return intercorrencias;
}

module.exports = {
    postIntercorrencia,
    getIntercorrencias
};