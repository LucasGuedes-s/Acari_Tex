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
                  class="btn btn-sm btn-outline-primary btn-sm-notif"
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
          <p class="card-text fs-6">{{ textContent }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
      loading: true
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

        this.notificacoes = response.data.notificacoes || [];
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

        await api.patch(`/notificacoes/${id}`, { lida: true }, {
          headers: { Authorization: `${token}` }
        });

        // Atualiza localmente
        this.notificacoes = this.notificacoes.map(n =>
          n.id === id ? { ...n, lida: true } : n
        );
      } catch (error) {
        console.error("Erro ao marcar como lida:", error);
      }
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
