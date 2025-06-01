<template>
  <div class="container lista-pecas">
    <div v-for="(pecas, status) in pecasVisiveis" :key="status" class="coluna card shadow-sm p-4 border-0">
      <h3 class="text-center titulo">{{ formatarStatus(status) }}</h3>
      <div class="table-responsive">
        <table class="table table-striped">
          <thead class="cabecalho-tabela">
            <tr>
              <th>Descrição</th>
              <th>Pedido Por</th>
              <th>Data do Pedido</th>
              <th>Data de Entrega</th>
              <th class="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="peca in pecas" :key="peca.id_da_op">
              <td>{{ peca.descricao }}</td>
              <td>{{ peca.pedido_por }}</td>
              <td>{{ formatarData(peca.data_do_pedido) }}</td>
              <td>{{ formatarData(peca.data_de_entrega) }}</td>
              <td class="text-center">
                <button class="btn btn-alterar me-2" @click="updateStatus(peca.id_da_op)">
                  Alterar Status
                </button>
                <button class="btn btn-detalhar" @click="detalharPeca(peca)">
                  Detalhar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import Axios from 'axios';
import Swal from 'sweetalert2';
import { useAuthStore } from '@/store/store';

export default {
  name: "ListaPecas",
  props: {
    pecasPorStatus: {
      type: Object,
      required: true,
      default: () => ({}) // Garantindo que sempre recebe um objeto
    }
  },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  computed: {
    pecasVisiveis() {
      return Object.fromEntries(
        Object.entries(this.pecasPorStatus || {}).filter(([, pecas]) => Array.isArray(pecas) && pecas.length > 0)
      );
    }
  },
  methods: {
  async updateStatus(id_da_op) {
    const token = this.store.pegar_token;
    const { value: status } = await Swal.fire({
      title: 'Selecione o novo status',
      input: 'select',
      inputOptions: {
        'Não Iniciado': 'Não iniciado',
        'Em andamento': 'Em andamento',
        'Aguardando coleta': 'Aguardando coleta',
        'Finalizado': 'Concluído'
      },
      inputPlaceholder: 'Escolha um status',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    });

    console.log(`Status selecionado: ${status}`);
    const id_da_op = id_da_op;
    
    await Axios.post("http://localhost:3333/update/status", {
      id_da_op,
      status
    }, {
      headers: {
        Authorization: `${token}`
      }
    }).then(response => {
      console.log(response.data);
      Swal.fire('Status atualizado com sucesso!', '', 'success');
    }).catch(error => {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao atualizar status',
        timer: 4000,
      });
    });
  },

  formatarData(data) {
    return data ? new Date(data).toLocaleDateString("pt-BR") : "Não informado";
  },

  formatarStatus(status) {
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  },

  alterarStatus(peca) {
    alert(`Alterar status da peça: ${peca.descricao}`);
  },

  detalharPeca(peca) {
    alert(`Detalhes da peça: ${peca.descricao}`);
  }
}

}
</script>

<style scoped>
/* Layout principal */
.lista-pecas {
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin-top: 10px;
}

/* Cartões (caixas dos status) */
.coluna {
  border-radius: 12px;
  background: #ffffff;
  transition: transform 0.2s ease-in-out;
  border-left: 5px solid #00692b;
}

.coluna:hover {
  transform: translateY(-3px);
}

/* Título do status */
.titulo {
  margin-bottom: 20px;
  font-size: 1.4rem;
  font-weight: bold;
  color: #00692b;
}

/* Tabela */
.cabecalho-tabela {
  background: #00692b;
  color: white;
}

.table td,
.table th {
  vertical-align: middle;
}

.table tbody tr:hover {
  background: #e6f4ea;
}

/* Botões */
.btn-alterar {
  background: #00692b;
  color: white;
  border-radius: 5px;
  padding: 6px 12px;
  border: none;
  transition: background 0.2s ease-in-out, transform 0.1s;
}

.btn-alterar:hover {
  background: #004f21;
  transform: scale(1.05);
}

.btn-detalhar {
  background: #e6f4ea;
  color: #00692b;
  border-radius: 5px;
  padding: 6px 12px;
  border: 1px solid #00692b;
  transition: background 0.2s ease-in-out, transform 0.1s;
}

.btn-detalhar:hover {
  background: #c1e2cc;
  transform: scale(1.05);
}
</style>
