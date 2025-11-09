import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function firstRunProducao(producoes, id_da_op, id_Estabelecimento) {

  for (const func of producoes) {
    const { id_funcionario, id_da_funcao, horarios } = func;

    // Busca a etapa relacionada
    const etapaRelacionada = await prisma.pecasEtapas.findUnique({
      where: {
        id_da_op_id_da_funcao: {
          id_da_op: id_da_op,
          id_da_funcao: id_da_funcao
        }
      }
    })


    if (!etapaRelacionada) {
      console.log(`Etapa não encontrada para função ${id_da_funcao} e OP ${id_da_op}`);
      continue;
    }

    for (const [hora, quantidade] of Object.entries(horarios)) {
      // Soma do que já foi produzido nessa etapa
      const totalEtapaProduzido = await prisma.producao.aggregate({
        _sum: { quantidade_pecas: true },
        where: { id_da_op, id_da_funcao }
      });

      // Cria o registro de produção
      await prisma.producao.create({
        data: {
          id_da_op,
          id_funcionario,
          id_Estabelecimento,
          id_da_funcao,
          quantidade_pecas: quantidade,
          hora_registro: hora,
          data_inicio: new Date("2025-10-29T00:00:00.000Z") // ou use função getData()
        }
      });
    }

    }
}

const producaoDia = [
   {
    id_funcionario: "analilian@gmail.com",
    id_da_funcao: 72,
    horarios: {
      "08:00": 40,
      "09:00": 20,
      "10:00": 51,
      "11:30": 51,
      "14:00": 72,
      "15:00": 61,
      "16:00": 67,
      "17:30": 101
    },
  },
  {
    id_funcionario: "luceliamaria@gmail.com",
    id_da_funcao: 63,
    horarios: {
      "08:00": 70,
      "09:00": 70,
      "10:00": 70,
      "11:30": 100,
      "14:00": 80,
      "15:00": 74,
      "16:00": 50,
      "17:30": 50
    }
  },
    {
    id_funcionario: "mariadasvitorias@gmail.com",
    id_da_funcao: 63,
    horarios: {
      "08:00": 65,
      "09:00": 69,
      "10:00": 78,
      "11:30": 102,
      "14:00": 40,
      "15:00": 78,
      "16:00": 34,
      "17:30": 70
    }
  },
];
/*
const producaoDia = [
   {
    id_funcionario: "analilian@gmail.com",
    id_da_funcao: 72,
    horarios: {
      "08:00": 40,
      "09:00": 20,
      "10:00": 51,
      "11:30": 51,
      "14:00": 72,
      "15:00": 61,
      "16:00": 67,
      "17:30": 101
    },
  },
  {
    id_funcionario: "dalcilenecavalcante@gmail.com",
    id_da_funcao: 69,
    horarios: {
      "08:00": 88,
      "09:00": 80,
      "10:00": 85,
      "11:30": 95,
      "14:00": 75,
      "15:00": 72,
      "16:00": 75,
      "17:30": 3
    },
  },
  {
    id_funcionario: "cosmaferreira@gmail.com",
    id_da_funcao: 72,
    horarios: {
      "08:00": 40,
      "09:00": 40,
      "10:00": 8,
      "11:30": 51,
      "14:00": 51,
      "15:00": 55,
      "16:00": 55,
      "17:30": 12
    },
  },
  {
    id_funcionario: "luceliamaria@gmail.com",
    id_da_funcao: 19,
    horarios: {
      "08:00": 70,
      "09:00": 70,
      "10:00": 70,
      "11:30": 100,
      "14:00": 80,
      "15:00": 74,
      "16:00": 50,
      "17:30": 50
    }
  },
  {
    id_funcionario: "tamaratuany@gmail.com",
    id_da_funcao: 73,
    horarios: {
      "08:00": 70,
      "09:00": 76,
      "10:00": 85,
      "11:30": 90,
      "14:00": 70,
      "15:00": 70,
      "16:00": 71,
      "17:30": 124
    }
  },
  {
    id_funcionario: "mariadasvitorias@gmail.com",
    id_da_funcao: 19,
    horarios: {
      "08:00": 65,
      "09:00": 69,
      "10:00": 78,
      "11:30": 102,
      "14:00": 40,
      "15:00": 78,
      "16:00": 34,
      "17:30": 70
    }
  },
  {
    id_funcionario: "luanaregina@gmail.com",
    id_da_funcao: 63,
    horarios: {
      "08:00": 40,
      "09:00": 40,
      "10:00": 50,
      "11:30": 0,
      "14:00": 45,
      "15:00": 55,
      "16:00": 70,
      "17:30": 110
    }
  },
  {
    id_funcionario: "juliamilena@gmail.com",
    id_da_funcao: 56,
    horarios: {
      "08:00": 35,
      "09:00": 28,
      "10:00": 26,
      "11:30": 42,
      "14:00": 29,
      "15:00": 29,
      "16:00": 30,
      "17:30": 59
    },
  },
  {
    id_funcionario: "marinaldooliveira@gmail.com",
    id_da_funcao: 74,
    horarios: {
      "08:00": 10,
      //"09:00": 0,
      //"10:00": 0,
      "11:30": 60,
      "14:00": 60,
      "15:00": 508,
      "16:00": 60,
      "17:30": 40
    },
  },
  {
    id_funcionario: "mariarosineide@gmail.com",
    id_da_funcao: 74,
    horarios: {
      "08:00": 60,
      "09:00": 70,
      "10:00": 73,
      "11:30": 100,
      "14:00": 70,
      "15:00": 25,
      //"16:00": 35,
      "17:30": 40
    },
  },
  {
    id_funcionario: "milenarayane@gmail.com",
    id_da_funcao: 63,
    horarios: {
      "08:00": 85,
      "09:00": 70,
      "10:00": 75,
      "11:30": 100,
      "14:00": 65,
      "15:00": 58,
      "16:00": 60,
      "17:30": 65    },
  },
  /*{
    id_funcionario: "raulthomaz@gmail.com",
    id_da_funcao: 62,
    horarios: {
      "08:00": 40,
      "09:00": 63,
      "10:00": 65,
      "11:30": 88,
      "14:00": 65,
      "15:00": 30,
      "16:00": 0,
      "17:30": 100
    },
  },
  {
    id_funcionario: "josejonatha@gmail.com",
    id_da_funcao: 49,
    horarios: {
      "08:00": 85,
      "09:00": 70,
      "10:00": 75,
      "11:30": 100,
      "14:00": 65,
      "15:00": 58,
      "16:00": 60,
      "17:30": 65
    },
  },
  {
    id_funcionario: "josivan@gmail.com",
    id_da_funcao: 49,
    horarios: {
      //"08:00": 4,
      "09:00": 32,
      "10:00": 36,
      "11:30": 50,
      "14:00": 34,
      "15:00": 22,
      "16:00": 44,
      //"17:30": 0
    },
  },
  {
    id_funcionario: "antoniomarcos@gmail.com",
    id_da_funcao: 49,
    horarios: {
      "08:00": 78,
      "09:00": 64,
      "10:00": 62,
      "11:30": 47,
      "14:00": 30,
      "15:00": 25,
      "16:00": 46,
      "17:30": 30
    },
  },
  {
    id_funcionario: "miguelpedro@gmail.com",
    id_da_funcao: 69,
    horarios: {
      "08:00": 22,
      "09:00": 30,
      "10:00": 30,
      "11:30": 35,
      "14:00": 27,
      "15:00": 21,
      //"16:00": 25,
      //"17:30": 35
    },
  },
  {
    id_funcionario: "genildaluciana@gmail.com",
    id_da_funcao: 66,
    horarios: {
      "08:00": 70,
      "09:00": 72,
      "10:00": 86,
      "11:30": 115,
      "14:00": 67,
      "15:00": 69,
      "16:00": 125,
      "17:30": 105
    },
  },
   {
    id_funcionario: "thamirabartiria@gmail.com",
    id_da_funcao: 71,
    horarios: {
      "08:00": 57,
      "09:00": 57,
      "10:00": 60,
      "11:30": 65,
      "14:00": 57,
      "15:00": 57,
      "16:00": 60,
      "17:30": 70
    },
  },
  {
    id_funcionario: "fernandacecilia@gmail.com",
    id_da_funcao: 70,
    horarios: {
      "08:00": 49,
      "09:00": 30,
      "10:00": 38,
      "11:30": 35,
      "14:00": 27,
      "15:00": 20,
      "16:00": 11,
      "17:30": 12
    },
  }
  // ... adicione todos os outros funcionários aqui
]; */

firstRunProducao(producaoDia, 45, "12.373.991/0001-37")
  .then(() => {
    console.log("Produções registradas com sucesso!");
    prisma.$disconnect();
  })
  .catch((err) => {
    console.error("Erro ao registrar produções:", err);
    prisma.$disconnect();
  });
