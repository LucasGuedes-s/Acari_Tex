<template>
  <div>
    <div>
      <SidebarNav style="z-index: 1" />
    </div>
    <main class="content-wrapper  flex-grow-1">
      <!-- Exibindo a lista de peças -->
      <div class="container-fluid my-4 mt-md-0 mt-3">
        <!-- Linha do Usuário e Cards -->
        <div class="row justify-content-center">
          <NavBarUser class="d-none d-md-block" />
        </div>
      <div class="row justify-content-center text-center">
          <DashboardCard icon="bi-kanban" title="Não iniciadas" :count="pecasNaoIniciadas" class="bg-light-pink" />
          <DashboardCard icon="bi-graph-up-arrow" title="Em andamento" :count="pecasEmProgresso" class="bg-light-blue" />
          <DashboardCard icon="bi-truck" title="Aguardando coleta" :count="pecasColeta" class="bg-green" />
          <DashboardCard icon="bi-check-circle" title="Concluídas" :count="pecasConcluidas" class="bg-light-green" />
          <ListaPecas :pecasPorStatus="pecasPorStatus" />

        </div>
      </div>
    </main>
  </div>
</template>
<script>
import SidebarNav from '@/components/Sidebar.vue';
import NavBarUser from '@/components/NavBarUser.vue';
import ListaPecas from '@/components/PecasVue.vue';
import { useAuthStore } from '@/store/store';
import Axios from 'axios';
import DashboardCard from '@/components/DashboardCard.vue';

export default {
  name: 'DashboardTecidos',
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      pecasPorStatus: {},
      pecas: {
        finalizado: [],
        em_progresso: [],
        nao_iniciado: [],
        coleta: [],
      },
    };

  },

  computed: {
    pecasNaoIniciadas() {
      return this.pecas?.Iniciado?.length || 0;
    },
    pecasEmProgresso() {
      return this.pecas?.em_progresso?.length || 0;
    },
    pecasConcluidas() {
      return this.pecas?.finalizado?.length || 0;
    },
    pecasColeta() {
      return this.pecas?.coleta?.length || 0;
    }
  },
  methods: {
    async fetchData() {
      try {
        const token = this.store.pegar_token;
        const response = await Axios.get("http://localhost:3333/pecas", {
          headers: { Authorization: `${token}` },
        });
        this.pecas = response.data.peca;
        this.pecasPorStatus = response.data.peca || {}; // Garante que sempre seja um objeto
      } catch (error) {
        console.error("Erro ao buscar os dados:", error);
        this.pecasPorStatus = {}; // Evita erro caso a API falhe
      }
    },
  },
  mounted() {
    this.fetchData();
  },
  components: {
    SidebarNav,
    NavBarUser,
    ListaPecas,
    DashboardCard
  },
};
</script>


<style scoped>
.content-wrapper {
  padding-left: 200px; /* Espaço para a sidebar */
  width: 100%;
}
.container-fluid {
  max-width: 1200px; /* Define um limite para não ficar muito largo */
  margin: auto; /* Centraliza o conteúdo */
}

@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 80px; /* Remove a margem lateral */
    z-index: 0;
  }
}
</style>
