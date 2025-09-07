<template>
  <div class="d-flex flex-column flex-md-row">
    <SidebarNav style="z-index: 1" />

    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid my-4 mt-md-0 mt-3">
      <div class="row justify-content-center">
        <NavBarUser class="d-none d-md-block" />
      </div>
        <section class="row justify-content-center text-center">
          <DashboardCard icon="bi-kanban" title="Não iniciadas" :count="pecasNaoIniciadas" class="bg-light-pink" />
          <DashboardCard icon="bi-graph-up-arrow" title="Em andamento" :count="pecasEmProgresso"
            class="bg-light-blue" />
          <DashboardCard icon="bi-truck" title="Aguardando coleta" :count="pecasColeta" class="bg-green" />
          <DashboardCard icon="bi-check-circle" title="Concluídas" :count="pecasConcluidas" class="bg-light-green" />
        </section>
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

import Producao from '@/components/Producao.vue';
import GraficoProducaoTotal from '@/components/GraficoProducaoTotal.vue';
import { useAuthStore } from '@/store/store';
import { Chart, registerables } from 'chart.js';
import api from '@/Axios'
Chart.register(...registerables);
import { io } from 'socket.io-client';
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
    this.socket = io('http://localhost:3333'); // Conecta ao servidor Socket.IO
    this.socket.on('nova_peca', () => {
      this.fetchData(); // Recarrega os dados quando uma nova peça é adicionada
    });
  },
  methods: {
    async fetchData() {
      try {
        const token = this.store.pegar_token;
        const response = await api.get("/pecas", {
          headers: { Authorization: `${token}` },
        });
        this.pecas = response.data.peca;
        this.$nextTick(this.renderCharts);
      } catch (error) {
        console.error("Erro ao buscar os dados:", error);
      }
    },
    renderCharts() {
      const barCanvas = this.$refs.pecasBarChart;
      const lineCanvas = this.$refs.pecasLineChart;

      if (!barCanvas || !lineCanvas) {
        console.warn("Canvas ainda não está disponível.");
        return;
      }

      const barCtx = barCanvas.getContext('2d');
      const lineCtx = lineCanvas.getContext('2d');

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

      this.chartInstances.barChart = new Chart(barCtx, {
        type: 'bar',
        data: chartData,
        options: chartOptions,
      });

      this.chartInstances.lineChart = new Chart(lineCtx, {
        type: 'line',
        data: chartData,
        options: chartOptions,
      });
    }
  }
};
</script>

<style scoped>
.d-flex {
  display: flex;
  flex-direction: row;
  height: 100vh;
}

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
canvas {
  max-width: 100%;
  height: auto;
  background-color: white;
}

@media (max-width: 768px) {
  .d-flex {
    flex-direction: column;
    height: auto;
  }

  .content-wrapper {
    padding-left: 0px;
    z-index: 0;
  }
}
</style>
