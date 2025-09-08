<template>
  <div>
    <div>
      <SidebarNav style="z-index: 1" />
    </div>
    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid my-4 mt-md-0 mt-3">
        <div class="row justify-content-center">
          <NavBarUser class="d-none d-md-block" />
        </div>

        <section class="row justify-content-center text-center">
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-kanban" title="Não iniciadas" :count="pecasNaoIniciadas" class="bg-light-pink" />
          </div>
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-graph-up-arrow" title="Em andamento" :count="pecasEmProgresso"
              class="bg-light-blue" />
          </div>
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-truck" title="Aguardando coleta" :count="pecasColeta" class="bg-green" />
          </div>
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-check-circle" title="Concluídas" :count="pecasConcluidas" class="bg-light-green" />
          </div>

          <DashboardCard class="d-none d-md-block bg-light-pink" icon="bi-kanban" title="Não iniciadas"
            :count="pecasNaoIniciadas" />
          <DashboardCard class="d-none d-md-block bg-light-blue" icon="bi-graph-up-arrow" title="Em andamento"
            :count="pecasEmProgresso" />
          <DashboardCard class="d-none d-md-block bg-green" icon="bi-truck" title="Aguardando coleta"
            :count="pecasColeta" />
          <DashboardCard class="d-none d-md-block bg-light-green" icon="bi-check-circle" title="Concluídas"
            :count="pecasConcluidas" />
        </section>

        <div class="row mt-4 kanban-board">
          <div class="col" v-for="(lista, status) in pecas" :key="status">
            <h5 class="text-center mb-3">{{ traduzStatus(status) }}</h5>

            <draggable class="kanban-column" :list="pecas[status]" :group="{ name: 'pecas' }" item-key="id"
              @change="onKanbanChange($event, status)">
              <template #item="{ element }">
                <div class="kanban-item" :class="element.status">
                  <i class="bi bi-box-seam me-2"></i>
                  {{ element.descricao }}
                </div>
              </template>
            </draggable>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import NavBarUser from '@/components/NavBarUser.vue';
import { useAuthStore } from '@/store/store';
import DashboardCard from '@/components/DashboardCard.vue';
import draggable from 'vuedraggable';
import api from '@/Axios';

export default {
  name: 'DashboardTecidos',
  components: {
    SidebarNav,
    NavBarUser,
    DashboardCard,
    draggable,
  },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      pecas: {
        nao_iniciado: [],
        em_progresso: [],
        coleta: [],
        finalizado: [],
      },
    };
  },
  computed: {
    pecasNaoIniciadas() { return this.pecas?.nao_iniciado?.length || 0; },
    pecasEmProgresso() { return this.pecas?.em_progresso?.length || 0; },
    pecasConcluidas() { return this.pecas?.finalizado?.length || 0; },
    pecasColeta() { return this.pecas?.coleta?.length || 0; },
  },
  methods: {
    traduzStatus(status) {
      const mapa = {
        nao_iniciado: "Não iniciadas",
        em_progresso: "Em andamento",
        coleta: "Aguardando coleta",
        finalizado: "Concluídas",
      };
      return mapa[status] || status;
    },

    normalizePecas(raw) {
      const keys = ['nao_iniciado', 'em_progresso', 'coleta', 'finalizado'];
      const out = {};
      for (const k of keys) {
        const list = Array.isArray(raw?.[k]) ? raw[k] : [];
        out[k] = list.map(item => ({
          ...item,
          id: item.id ?? item.id_da_op ?? item._id ?? item.codigo, // garante um id
          status: k, // status atual para colorir
        }));
      }
      return out;
    },

    async fetchData() {
      try {
        const token = this.store.pegar_token;
        const { data } = await api.get("/pecas", {
          headers: { Authorization: `${token}` },
        });
        this.pecas = this.normalizePecas(data.peca);
      } catch (error) {
        console.error("Erro ao buscar os dados:", error);
      }
    },

    async atualizarStatusNoServidor(itemId, novoStatus) {
      const token = this.store.pegar_token;
      await api.post(
        `/update/status`,
        { id_da_op: itemId, status: novoStatus },
        { headers: { Authorization: `${token}` } }
      );
    },

    async onKanbanChange(evt, colunaDestino) {
      // evt tem { added, moved, removed } dependendo da ação
      try {
        if (evt?.added) {
          const movedItem = evt.added.element;
          if (!movedItem) return;

          // só atualiza no backend se realmente trocou de coluna
          if (movedItem.status !== colunaDestino) {
            await this.atualizarStatusNoServidor(movedItem.id, colunaDestino);
            movedItem.status = colunaDestino; // atualiza localmente para refletir a cor
          }
        }
        // evt.moved => reordenação dentro da mesma coluna (não precisa chamar API)
        // evt.removed => saiu de uma coluna (a confirmação é tratada no 'added' da coluna destino)
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        // rollback simples: recarrega do servidor
        this.fetchData();
      }
    },
  },
  mounted() {
    this.fetchData();
  },
};
</script>

<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
}

.row {
  margin-top: 30px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.kanban-board {
  display: flex;
  gap: 1rem;
}

.kanban-column {
  background: #f9f9f9;
  border-radius: 8px;
  min-height: 300px;
  padding: 10px;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
}

.kanban-item {
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  cursor: grab;
  transition: 0.2s;
  color: #fff;
  font-weight: 500;
}

.kanban-item:hover {
  opacity: 0.9;
  transform: scale(1.02);
}

/* Cores por status */
.kanban-item.nao_iniciado {
  background: #ffb3b3;
  /* rosa claro */
}

.kanban-item.em_progresso {
  background: #4da6ff;
  /* azul */
}

.kanban-item.coleta {
  background: #66cc66;
  /* verde médio */
}

.kanban-item.finalizado {
  background: #66cc99;
  /* verde suave */
}

@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 80px;
  }
}
</style>
