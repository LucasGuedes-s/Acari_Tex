<template>
  <div class="d-flex flex-column flex-md-row">
    <!-- Sidebar fixa -->
    <SidebarNav style="z-index: 1"/>

    <!-- Conteúdo Principal -->
    <main class="content-wrapper flex-grow-1">
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
        </div>

        <!-- Gráficos -->

        <div class="row justify-content-center">
          <GraficoProducaoTotal class="mb-4" />
          <Producao />

          <div class="col-12 col-md-6 mb-3 d-flex justify-content-center">
            <canvas ref="pecasBarChart" width="800" height="400"></canvas>
          </div>
          <div class="col-12 col-md-6 mb-3 d-flex justify-content-center">
            <canvas ref="pecasLineChart" width="800" height="400"></canvas>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import NavBarUser from '@/components/NavBarUser.vue';
import DashboardCard from '@/components/DashboardCard.vue';
import { useAuthStore } from '@/store/store';
import { Chart, registerables } from 'chart.js';
import Axios from 'axios';
import Producao from '@/components/Producao.vue';
import GraficoProducaoTotal from '@/components/GraficoProducaoTotal.vue';
Chart.register(...registerables);

export default {
  name: 'DashboardHome',
  components: { SidebarNav, NavBarUser, DashboardCard, Producao, GraficoProducaoTotal },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      pecas: {
        finalizado: [],
        em_progresso: [],
        nao_iniciado: [],
        coleta: [],
      },
      chartInstances: {
        barChart: null,
        lineChart: null,
      },
    };
  },
  computed: {
    pecasNaoIniciadas() {
      return this.pecas?.nao_iniciado?.length || 0;
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
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      try {
        const token = this.store.pegar_token;
        const response = await Axios.get("http://localhost:3333/pecas", {
          headers: { Authorization: `${token}` },
        });
        this.pecas = response.data.peca;
        this.$nextTick(this.renderCharts);
      } catch (error) {
        console.error("Erro ao buscar os dados:", error);
      }
    },
    renderCharts() {
      const barCtx = this.$refs.pecasBarChart.getContext('2d');
      const lineCtx = this.$refs.pecasLineChart.getContext('2d');

      if (this.chartInstances.barChart) this.chartInstances.barChart.destroy();
      if (this.chartInstances.lineChart) this.chartInstances.lineChart.destroy();

      const chartData = {
        labels: ['Não Iniciadas', 'Em Andamento', 'Aguardando Coleta', 'Concluídas'],
        datasets: [{
          label: 'Quantidade de Peças',
          data: [
            this.pecasNaoIniciadas,
            this.pecasEmProgresso,
            this.pecasColeta,
            this.pecasConcluidas,
          ],
          backgroundColor: ['#FF6384', '#36A2EB', '#4BC0C0', '#9966FF'],
          borderColor: ['#FF6384', '#36A2EB', '#4BC0C0', '#9966FF'],
          borderWidth: 1,
        }],
      };

      const chartOptions = {
        responsive: true,
        plugins: {
          legend: { display: true, position: 'top' },
          title: { display: true, text: 'Status das Peças' },
        },
        scales: {
          x: { title: { display: true, text: 'Status' } },
          y: { beginAtZero: true, title: { display: true, text: 'Quantidade' } },
        },
      };

      this.chartInstances.barChart = new Chart(barCtx, { type: 'bar', data: chartData, options: chartOptions });
      this.chartInstances.lineChart = new Chart(lineCtx, { type: 'line', data: chartData, options: chartOptions });
    },
  },
};
</script>

<style scoped>
.d-flex {
  display: flex;
  flex-direction: row; /* Coloca sidebar e conteúdo lado a lado */
  height: 100vh; /* Garante que o conteúdo ocupe toda a altura da tela */
}

.content-wrapper {
  flex-grow: 1;
  padding-left: 200px; /* Espaço para a sidebar */
  width: 100%;
}

.container-fluid {
  max-width: 1200px; /* Define um limite para não ficar muito largo */
  margin: auto; /* Centraliza o conteúdo */
}

.row {
  margin-top: 30px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center; /* Centraliza os elementos */
}

canvas {
  max-width: 100%;
  height: auto;
  background-color: white;
}

/* Garante espaçamento adequado em telas menores */
@media (max-width: 768px) {
  .d-flex {
    flex-direction: column; /* Sidebar fica acima do conteúdo */
    height: auto;
  }
  .content-wrapper {
    padding-left: 80px; /* Remove a margem lateral */
    z-index: 0;
  }
}
</style>
