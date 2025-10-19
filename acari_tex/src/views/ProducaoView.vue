<template>
  <div>
    <div>
      <SidebarNav style="z-index: 1" />
    </div>
    <carregandoTela v-if="loading" />
    <main v-else class="content-wrapper flex-grow-1">
      <div class="container-fluid my-4 mt-md-0 mt-3">
        <div class="row justify-content-center userinfor">
          <NavBarUser class="d-none d-md-block"  />
        </div>

        <section class="row justify-content-center text-center">
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-kanban" title="Não iniciadas" :subcount="pecasNaoIniciadas.op"
              :count="pecasNaoIniciadas.pecas" class="bg-light-pink" />
          </div>
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-graph-up-arrow" title="Em andamento" :subcount="pecasEmProgresso.op"
              :count="pecasEmProgresso.pecas" class="bg-light-blue" />
          </div>
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-truck" title="Aguardando coleta" :subcount="pecasColeta.op"
              :count="pecasColeta.pecas" class="bg-green" />
          </div>
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-check-circle" title="Concluídas" :subcount="pecasConcluidas.op"
              :count="pecasConcluidas.pecas" class="bg-light-green" />
          </div>

          <DashboardCard class="d-none d-md-block bg-light-pink" icon="bi-kanban" title="Peças não iniciadas"
            :subcount="pecasNaoIniciadas.op" :count="pecasNaoIniciadas.pecas" />
          <DashboardCard class="d-none d-md-block bg-light-blue" icon="bi-graph-up-arrow" title="Em andamento"
            :subcount="pecasEmProgresso.op" :count="pecasEmProgresso.pecas" />
          <DashboardCard class="d-none d-md-block bg-green" icon="bi-truck" title="Aguardando coleta"
            :subcount="pecasColeta.op" :count="pecasColeta.pecas" />
          <DashboardCard class="d-none d-md-block bg-light-green" icon="bi-check-circle" title="Concluídas"
            :subcount="pecasConcluidas.op" :count="pecasConcluidas.pecas" />
        </section>

        <div class="row mt-4 kanban-board">
          <div class="col" v-for="(lista, status) in pecasFiltradas" :key="status">
            <h5 class="text-center mb-3">{{ traduzStatus(status) }}</h5>

            <draggable class="kanban-column" :list="lista" :group="{ name: 'pecas' }" item-key="id"
              @change="onKanbanChange($event, status)">
              <template #item="{ element }">
                <div class="kanban-item" :class="element.status" @click="abrirOpcoesStatus(element)">
                  <i class="bi bi-box-seam me-2"></i>
                  {{ element.descricao }}
                </div>
              </template>
            </draggable>

            <!-- aviso se tiver mais -->
            <div v-if="status === 'finalizado' && pecas.finalizado.length > 6" class="text-center mt-2">
              <small class="text-muted">+{{ pecas.finalizado.length - 6 }} concluídas</small>
            </div>
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
import carregandoTela from '@/components/carregandoTela.vue';
import Swal from 'sweetalert2';
import router from '@/router';
export default {
  name: 'DashboardTecidos',
  components: {
    SidebarNav,
    NavBarUser,
    DashboardCard,
    draggable,
    carregandoTela
  },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      loading: true,
      pecas: {
        nao_iniciado: [],
        em_progresso: [],
        coleta: [],
        finalizado: [],
      },
    };
  },
  computed: {
    pecasNaoIniciadas() {
      const lista = this.pecas?.nao_iniciado || [];
      const totalPecas = lista.reduce((sum, item) => sum + (item.quantidade_pecas || 0), 0);
      return { op: lista.length, pecas: totalPecas };
    },
    pecasEmProgresso() {
      const lista = this.pecas?.em_progresso || [];
      const totalPecas = lista.reduce((sum, item) => sum + (item.quantidade_pecas || 0), 0);
      return { op: lista.length, pecas: totalPecas };
    },
    pecasColeta() {
      const lista = this.pecas?.coleta || [];
      const totalPecas = lista.reduce((sum, item) => sum + (item.quantidade_pecas || 0), 0);
      return { op: lista.length, pecas: totalPecas };
    },
    pecasFiltradas() {
      const out = { ...this.pecas };
      if (Array.isArray(out.finalizado)) {
        out.finalizado = out.finalizado.slice(-6);
      }

      return out;
    },
    pecasConcluidas() {
      const lista = this.pecas?.finalizado || [];
      const totalPecas = lista.reduce((sum, item) => sum + (item.quantidade_pecas || 0), 0);
      return { op: lista.length, pecas: totalPecas };
    },
  },
  methods: {
    verificarAutenticacao() {
      const token = this.store.pegar_token;
      const usuario = this.store.pegar_usuario;

      if (!token || !usuario) {
        router.push('/');
      }
    },
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
          status: k,
        }));
      }
      return out;
    },

    async fetchData() {
      try {
        this.loading = true;
        const token = this.store.pegar_token;
        const { data } = await api.get("/pecas", {
          headers: { Authorization: `${token}` },
        });
        console.log(data.peca)
        this.pecas = this.normalizePecas(data.peca);
        this.loading = false;
      } catch (error) {
        this.loading = false;
        console.error("Erro ao buscar os dados:", error);
      }
    },
    async abrirOpcoesStatus(item) {
      const { value: novoStatus } = await Swal.fire({
        title: 'Alterar Status',
        input: 'select',
        inputOptions: {
          nao_iniciado: 'Não iniciadas',
          em_progresso: 'Em andamento',
          coleta: 'Aguardando coleta',
          finalizado: 'Concluídas'
        },
        inputValue: item.status,
        showCancelButton: true,
        confirmButtonText: 'Alterar',
        cancelButtonText: 'Cancelar'
      });

      if (novoStatus && novoStatus !== item.status) {
        try {
          await this.atualizarStatusNoServidor(item.id, novoStatus);
          item.status = novoStatus;
          this.fetchData();
        } catch (error) {
          console.error('Erro ao alterar status por clique:', error);
        }
      }
    },

    async atualizarStatusNoServidor(itemId, novoStatus) {
      const token = this.store.pegar_token;
      const resposta = await api.post(
        `/update/status`,
        { id_da_op: itemId, status: novoStatus },
        { headers: { Authorization: `${token}` } }
      );
      if (resposta.status === 200) {
        Swal.fire({
          toast: true,               // ativa estilo de notificação
          position: 'top-end',       // canto superior direito
          icon: 'success',           // 'success', 'error', 'warning', 'info', 'question'
          title: 'Status da peça atualizado!',
          showConfirmButton: false,  // sem botão de confirmação
          timer: 5000,               // desaparece sozinho em 3s
          timerProgressBar: true,    // barra de tempo
        });
      }
      else {
        Swal.fire({
          toast: true,               // ativa estilo de notificação
          position: 'top-end',       // canto superior direito
          icon: 'error',           // 'success', 'error', 'warning', 'info', 'question'
          title: 'Peça cadastrada com sucesso!',
          showConfirmButton: false,  // sem botão de confirmação
          timer: 5000,               // desaparece sozinho em 3s
          timerProgressBar: true,    // barra de tempo
        });
      }
    },

    async onKanbanChange(evt, colunaDestino) {
      try {
        if (evt?.added) {
          const movedItem = evt.added.element;
          if (!movedItem) return;

          if (movedItem.status !== colunaDestino) {
            await this.atualizarStatusNoServidor(movedItem.id, colunaDestino);
            movedItem.status = colunaDestino; // atualiza localmente para refletir a cor
          }
        }

      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        this.fetchData();
      }
    },
  },
  mounted() {
    this.verificarAutenticacao();
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
}

.kanban-item.finalizado {
  background: #66cc99;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0px;
  }
}
@media (min-width: 768px) and (max-width: 1024px) {
  .content-wrapper {
    padding-left: 0px;
  }
  .user{
    display: none;
  }
  .userinfor{
    display: none;
  }
}
</style>
