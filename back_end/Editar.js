import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function firstRunProducao(producoes, id_da_op, id_Estabelecimento) {

  for (const func of producoes) {
    const { id_funcionario, id_da_funcao, horarios } = func;
    console.log(`Registrando produção para o funcionário ${id_funcionario}, função ${id_da_funcao}`);
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
          data_inicio: new Date("2025-12-16T00:00:00.000Z") // ou use função getData()
        }
      });
    }
    console.log(`Produção registrada para o funcionário ${id_funcionario}`);
    }
}

const producaoDia = [
   /*{
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
      "11:30": 120,
      "14:00": 70,
      "15:00": 70,
      "16:00": 70,
      "17:30": 95
    }
  },
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
  */
 {
    id_funcionario: "analilian@gmail.com",
    id_da_funcao: 72,
    horarios: {
      "08:00": 31,
      "09:00": 33,
      "10:00": 45,
      "11:30": 63,
      "14:00": 55,
      "15:00": 35,
      "16:00": 16,
      "17:30": 70
    },
  },
 {
    id_funcionario: "dalcilenecavalcante@gmail.com",
    id_da_funcao: 69,
    horarios: {
      "08:00": 37,
      "09:00": 50,
      "10:00": 45,
      "11:30": 61,
      "14:00": 55,
      "15:00": 43,
      "16:00": 65,
      "17:30": 64
    },
  },
  {
    id_funcionario: "luceliamaria@gmail.com",
    id_da_funcao: 63,
    horarios: {
      "08:00": 70,
      "09:00": 70,
      "10:00": 70,
      "11:30": 110,
      "14:00": 0,
      "15:00": 90,
      "16:00": 80,
      "17:30": 20
    }
  },
  {
      id_funcionario: "cosmaferreira@gmail.com",
      id_da_funcao: 72,
      horarios: {
        "08:00": 67,
        "09:00": 15,
        "10:00": 60,
        "11:30": 70,
        "14:00": 60,
        "15:00": 67,
        "16:00": 60,
        "17:30": 80
    },
  },
  {
    id_funcionario: "tamaratuany@gmail.com",
    id_da_funcao: 73,
    horarios: {
      "08:00": 76,
      "09:00": 80,
      "10:00": 80,
      "11:30": 100,
      "14:00": 70,
      "15:00": 80,
      "16:00": 100,
      "17:30": 120
    }
  },
  {
    id_funcionario: "mariadasvitorias@gmail.com",
    id_da_funcao: 19,
    horarios: {
      "08:00": 38,
      "09:00": 57,
      "10:00": 36,
      "11:30": 84,
      "14:00": 55,
      "15:00": 60,
      "16:00": 53,
      "17:30": 104
    }
  },
  /*{
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
  },*/
  {
    id_funcionario: "juliamilena@gmail.com",
    id_da_funcao: 56,
    horarios: {
      "08:00": 39,
      "09:00": 43,
      "10:00": 47,
      "11:30": 71,
      "14:00": 54,
      "15:00": 20,
      "16:00": 17,
      "17:30": 0
    },
  },
  {
    id_funcionario: "marinaldooliveira@gmail.com",
    id_da_funcao: 74,
    horarios: {
      "08:00": 39,
      "09:00": 65,
      "10:00": 31,
      "11:30": 34,
      "14:00": 16,
      "15:00": 14,
      "16:00": 27,
      "17:30": 50
    },
  },
  {
    id_funcionario: "mariarosineide@gmail.com",
    id_da_funcao: 74,
    horarios: {
      "08:00": 39,
      "09:00": 57,
      "10:00": 46,
      "11:30": 56,
      "14:00": 16,
      "15:00": 31,
      "16:00": 29,
      "17:30": 45
    },
  },
  {
    id_funcionario: "milenarayane@gmail.com",
    id_da_funcao: 63,
    horarios: {
      "08:00": 57,
      "09:00": 45,
      "10:00": 45,
      "11:30": 65,
      "14:00": 60,
      "15:00": 50,
      "16:00": 31,
      "17:30": 80
    },
  },
  /*{
    id_funcionario: "raulthomaz@gmail.com",
    id_da_funcao: 62,
    horarios: {
      "08:00": 37,
      "09:00": 40,
      "10:00": 50,
      "11:30": 60,
      "14:00": 60,
      "15:00": 65,
      "16:00": 40,
      "17:30": 65
    },
  },*/
  {
    id_funcionario: "josejonatha@gmail.com",
    id_da_funcao: 49,
    horarios: {
      "08:00": 50,
      "09:00": 50,
      "10:00": 50,
      "11:30": 80,
      "14:00": 60,
      "15:00": 50,
      "16:00": 31,
      "17:30": 80
    },
  },
  {
    id_funcionario: "josivan@gmail.com",
    id_da_funcao: 49,
    horarios: {
      "08:00": 35,
      "09:00": 50,
      "10:00": 50,
      "11:30": 70,
      /*"14:00": 60,
      "15:00": 65,
      "16:00": 40,
      "17:30": 65*/
    },
  },
  {
    id_funcionario: "antoniomarcos@gmail.com",
    id_da_funcao: 49,
    horarios: {
      //"08:00": 22,
      "09:00": 50,
      //"10:00": 50,
      "11:30": 50,
      "14:00": 30,
      "15:00": 44,
      "16:00": 41,
      "17:30": 40
    },
  },
  {
    id_funcionario: "miguelpedro@gmail.com",
    id_da_funcao: 69,
    horarios: {
      "08:00": 45,
      "09:00": 50,
      "10:00": 50,
      "11:30": 54,
      "14:00": 40,
      "15:00": 57,
      "16:00": 45,
      "17:30": 60
    },
  },
  {
    id_funcionario: "genildaluciana@gmail.com",
    id_da_funcao: 66,
    horarios: {
      "08:00": 45,
      "09:00": 38,
      "10:00": 42,
      "11:30": 54,
      "14:00": 40,
      "15:00": 46,
      "16:00": 47,
      "17:30": 54
    },
  },
   {
    id_funcionario: "thamirabartiria@gmail.com",
    id_da_funcao: 71,
    horarios: {
      "08:00": 20,
      "09:00": 39,
      "10:00": 47,
      "11:30": 71,
      "14:00": 57,
      "15:00": 58,
      "16:00": 60,
      "17:30": 88
    },
  },
  {
    id_funcionario: "fernandacecilia@gmail.com",
    id_da_funcao: 70,
    horarios: {
      "08:00": 45,
      "09:00": 50,
      "10:00": 50,
      "11:30": 54,
      "14:00": 40,
      "15:00": 46,
      "16:00": 47,
      "17:30": 58
    },
  }
  // ... adicione todos os outros funcionários aqui
];

firstRunProducao(producaoDia, 47, "12.373.991/0001-37")
  .then(() => {
    console.log("Produções registradas com sucesso!");
    prisma.$disconnect();
  })
  .catch((err) => {
    console.error("Erro ao registrar produções:", err);
    prisma.$disconnect();
  });
