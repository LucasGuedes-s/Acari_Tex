<template>
  <div class="row align-items-stretch">
    <!-- COLUNA DE NOTIFICAÇÕES -->
    <div class="col-12 col-md-4 mb-3">
      <div class="card border-0 shadow-sm h-100 text-start p-3 bg-white">
        <div class="card-body d-flex flex-column p-2">
          <div class="d-flex align-items-center mb-2">
            <i class="bi bi-bell me-2" style="font-size: 1.5rem;"></i>
            <h6 class="card-title mb-0">Notificações</h6>
          </div>

          <div v-if="loading" class="text-center text-muted small">
            Carregando notificações...
          </div>

          <div v-else-if="notificacoes.length === 0" class="text-center text-muted small">
            Nenhuma notificação no momento.
          </div>

          <div v-else class="notificacoes-list">
            <div
              v-for="notif in notificacoes"
              :key="notif.id"
              class="notificacao-item mb-2 p-2 rounded shadow-sm"
              :class="{ 'bg-light': !notif.lida, 'bg-body-tertiary': notif.lida }"
            >
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="mb-1 fw-semibold small">{{ notif.titulo }}</h6>
                  <p class="mb-1 text-muted very-small">{{ notif.mensagem }}</p>
                  <small class="text-secondary">{{ formatarData(notif.criadaEm) }}</small>
                </div>
                <button
                  v-if="!notif.lida"
                  class="btn btn-sm btn-sm-notif"
                  @click="marcarComoLida(notif.id)"
                >
                  ✔
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- COLUNA DE RESUMO -->
    <div class="col-12 col-md-8 mb-3">
      <div class="card border-0 shadow h-100 p-4 text-start bg-white">
        <div class="card-body">
          <h4 class="card-title mb-3">{{ textTitle }}</h4>
          <p class="card-text fs-6">
            {{ resumo }}
            <br v-if="melhorFuncionario">
            <span v-if="melhorFuncionario" class="destaque-funcionario">
              <img 
                :src="melhorFuncionario.foto" 
                :alt="melhorFuncionario.nome" 
                class="foto-funcionario">
              <strong>{{ melhorFuncionario.nome }}</strong>  - ({{ melhorFuncionario.quantidade }} peças)
            </span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Lista de notificações */
.notificacoes-list {
  max-height: 300px; 
  overflow-y: auto;
  padding-right: 4px;
}

.notificacao-item {
  background-color: #f9f9f9;
  border-left: 3px solid var(--verde-escuro);
  transition: background-color 0.2s;
  font-size: 0.85rem; 
}

.notificacao-item:hover {
  background-color: #eef5ff;
}

.btn-sm-notif {
  border-radius: 6px;
  font-size: 0.7rem;
  background-color: var(--verde-escuro);
  color: white;
  padding: 0.25rem 0.4rem;
}
.btn-sm-notif:hover{
  background-color: #076d00;
  color: white;
}

.very-small {
  font-size: 0.75rem;
}

.destaque-funcionario {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 8px;
  margin-top: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.foto-funcionario {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  margin-right: 8px;
  border: 2px solid var(--verde-escuro); /* borda azul */
}

.notificacoes-list {
  max-height: 300px; 
  overflow-y: auto;
  padding-right: 4px;
}

.notificacao-item {
  background-color: #f9f9f9;
  border-left: 3px solid var(--verde-escuro);
  transition: background-color 0.2s;
  font-size: 0.85rem; /* texto menor */
}

.notificacao-item:hover {
  background-color: #eef5ff;
}

.btn-sm-notif {
  border-radius: 6px;
  font-size: 0.7rem;
  padding: 0.25rem 0.4rem;
}

.very-small {
  font-size: 0.75rem;
}
</style>

<script>
import { useAuthStore } from "@/store/store";
import api from "@/Axios";
import Swal from "sweetalert2";

export default {
  name: "ContainersGerais",
  props: {
    textTitle: {
      type: String,
      default: "Resumo"
    },
    textContent: {
      type: String,
      default: "Nenhum dado disponível para exibição."
    }
  },
  data() {
    return {
      notificacoes: [],
      loading: true,
      resumo: null,
      melhorFuncionario: null
    };
  },
  methods: {
    async carregarNotificacoes() {
      try {
        const store = useAuthStore();
        const token = store.pegar_token;

        const response = await api.get("/notificacoes", {
          headers: { Authorization: `${token}` }
        });
        console.log("Notificações carregadas:", response.data);
        this.notificacoes = response.data.notificacoes || [];
        this.resumo = response.data.resumoProducao || [];
        this.melhorFuncionario = response.data.melhorFuncionario || null;

      } catch (error) {
        console.error("Erro ao carregar notificações:", error);
      } finally {
        this.loading = false;
      }
    },

    async marcarComoLida(id) {
      try {
        const store = useAuthStore();
        const token = store.pegar_token;

        await api.put(`/notificacoes/${id}/lida`, { lida: true }, {
          headers: { Authorization: `${token}` }
        });
        Swal.fire({
          icon: "success",
          title: "Notificação marcada como lida!",
          timer: 1500,
          showConfirmButton: false
        });
        // Atualiza localmente
        this.notificacoes = this.notificacoes.map(n =>
          n.id === id ? { ...n, lida: true } : n
        );
      } catch (error) {
        console.error("Erro ao marcar como lida:", error);
      }
    },
  resumoHtml() {
    if (!this.melhorFuncionario) {
      return this.resumo;
    }

    // Exibe a foto e o nome do melhor funcionário
    return `${this.resumo} <br>
      <strong>Profissional que mais produziu hoje:</strong> 
      <img src="${this.melhorFuncionario.foto}" alt="${this.melhorFuncionario.nome}" 
           style="width:30px; height:30px; border-radius:50%; vertical-align:middle; margin-right:5px;">
      ${this.melhorFuncionario.nome} (${this.melhorFuncionario.quantidade} peças)`;
  },
    formatarData(data) {
      const d = new Date(data);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  },
  mounted() {
    this.carregarNotificacoes();
  }
};
</script>
