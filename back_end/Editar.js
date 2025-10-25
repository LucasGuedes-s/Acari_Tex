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
          data_inicio: new Date("2025-10-22T00:00:00.000Z") // ou use função getData()
        }
      });
    }

    }
}
const producaoDia = [
  {
    id_funcionario: "milenarayane@gmail.com",
    id_da_funcao: 63,
    horarios: {
      "08:00": 20,
      "09:00": 40,
      "10:00": 45,
      "11:30": 67,
      "14:00": 20,
      "15:00": 57,
      "16:00": 50,
      "17:30": 75
    },
  },
];
/* ===== EXEMPLO DE USO =====
const producaoDia = [
  {
    id_funcionario: "luceliamaria@gmail.com",
    id_da_funcao: 19,
    horarios: {
      "08:00": 27,
      "09:00": 50,
      "10:00": 50,
      "11:30": 75,
      "14:00": 60,
      "15:00": 60,
      "16:00": 63,
      "17:30": 65
    }
  },
  {
    id_funcionario: "tamaratuany@gmail.com",
    id_da_funcao: 73,
    horarios: {
      "08:00": 0,
      "09:00": 40,
      "10:00": 49,
      "11:30": 45,
      "14:00": 25,
      "15:00": 35,
      "16:00": 50,
      "17:30": 30
    }
  },
  {
    id_funcionario: "mariadasvitorias@gmail.com",
    id_da_funcao: 19,
    horarios: {
      "08:00": 12,
      "09:00": 20,
      "10:00": 10,
      "11:30": 40,
      "14:00": 50,
      "15:00": 35,
      "16:00": 30,
      "17:30": 58
    }
  },
  {
    id_funcionario: "luanaregina@gmail.com",
    id_da_funcao: 63,
    horarios: {
      "08:00": 30,
      "09:00": 20,
      "10:00": 30,
      "11:30": 40,
      "14:00": 40,
      "15:00": 20,
      "16:00": 20,
      "17:30": 50
    }
  },
  {
    id_funcionario: "juliamilena@gmail.com",
    id_da_funcao: 56,
    horarios: {
      "08:00": 12,
      "09:00": 14,
      "10:00": 8,
      "11:30": 20,
      "14:00": 9,
      "15:00": 10,
      "16:00": 10,
      "17:30": 12
    },
  },
  {
    id_funcionario: "marinaldooliveira@gmail.com",
    id_da_funcao: 74,
    horarios: {
      "08:00": 65,
      "09:00": 60,
      "10:00": 58,
      "11:30": 87,
      "14:00": 60,
      "15:00": 97,
      "16:00": 60,
      "17:30": 0
    },
  },
  {
    id_funcionario: "mariarosineide@gmail.com",
    id_da_funcao: 74,
    horarios: {
      "08:00": 60,
      "09:00": 60,
      "10:00": 58,
      "11:30": 87,
      "14:00": 60,
      "15:00": 97,
      "16:00": 60,
      "17:30": 0
    },
  },
  {
    id_funcionario: "milenarayane@gmail.com",
    id_da_funcao: 23,
    horarios: {
      "08:00": 20,
      "09:00": 40,
      "10:00": 45,
      "11:30": 67,
      "14:00": 20,
      "15:00": 57,
      "16:00": 50,
      "17:30": 75
    },
  },
  {
    id_funcionario: "raulthomaz@gmail.com",
    id_da_funcao: 62,
    horarios: {
      "08:00": 55,
      "09:00": 55,
      "10:00": 30,
      "11:30": 95,
      "14:00": 60,
      "15:00": 40,
      "16:00": 60,
      "17:30": 0
    },
  },
  {
    id_funcionario: "josejonatha@gmail.com",
    id_da_funcao: 49,
    horarios: {
      "08:00": 20,
      "09:00": 40,
      "10:00": 45,
      "11:30": 67,
      "14:00": 45,
      "15:00": 57,
      "16:00": 50,
      "17:30": 90
    },
  },
  {
    id_funcionario: "josivan@gmail.com",
    id_da_funcao: 49,
    horarios: {
      "08:00": 0,
      "09:00": 0,
      "10:00": 5,
      "11:30": 19,
      "14:00": 0,
      "15:00": 0,
      "16:00": 0,
      "17:30": 0
    },
  },
  {
    id_funcionario: "antoniomarcos@gmail.com",
    id_da_funcao: 49,
    horarios: {
      "08:00": 6,
      "09:00": 9,
      "10:00": 10,
      "11:30": 5,
      "14:00": 0,
      "15:00": 10,
      "16:00": 0,
      "17:30": 0
    },
  },
  {
    id_funcionario: "miguelpedro@gmail.com",
    id_da_funcao: 69,
    horarios: {
      "08:00": 25,
      "09:00": 15,
      "10:00": 20,
      "11:30": 30,
      "14:00": 20,
      "15:00": 20,
      "16:00": 22,
      "17:30": 20
    },
  },
  {
    id_funcionario: "genildaluciana@gmail.com",
    id_da_funcao: 66,
    horarios: {
      "08:00": 44,
      "09:00": 40,
      "10:00": 40,
      "11:30": 73,
      "14:00": 50,
      "15:00": 60,
      "16:00": 50,
      "17:30": 72
    },
  },
    {
    id_funcionario: "fernandacecilia@gmail.com",
    id_da_funcao: 70,
    horarios: {
      "08:00": 12,
      "09:00": 8,
      "10:00": 9,
      "11:30": 16,
      "14:00": 26,
      "15:00": 17,
      "16:00": 17,
      "17:30": 31
    },
  }
  // ... adicione todos os outros funcionários aqui
]; */

firstRunProducao(producaoDia, 41, "12.373.991/0001-37")
  .then(() => {
    console.log("Produções registradas com sucesso!");
    prisma.$disconnect();
  })
  .catch((err) => {
    console.error("Erro ao registrar produções:", err);
    prisma.$disconnect();
  });
