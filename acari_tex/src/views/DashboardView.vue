<template>
  <div>
    <SidebarNav />
    <NavBarUser class="d-none d-md-block" />
    <main class="flex-grow-1 container my-4 mt-md-0 mt-3">
      <div class="row">
        <!-- Card: Não iniciadas -->
        <div class="col-12 col-sm-6 col-md-3 mb-3">
          <div class="card border-0 shadow h-100 text-center bg-light-pink">
            <div class="card-body">
              <div class="d-flex justify-content-center align-items-center mb-3">
                <i class="bi bi-kanban" style="font-size: 2rem;"></i>
              </div>
              <h3 class="card-title mb-1">{{ pecasNaoIniciadas }}</h3>
              <p class="card-text">Não iniciadas</p>
            </div>
          </div>
        </div>

        <!-- Card: Em andamento -->
        <div class="col-12 col-sm-6 col-md-3 mb-3">
          <div class="card border-0 shadow h-100 text-center bg-light-blue">
            <div class="card-body">
              <div class="d-flex justify-content-center align-items-center mb-3">
                <i class="bi bi-graph-up-arrow" style="font-size: 2rem;"></i>
              </div>
              <h3 class="card-title mb-1">{{ pecasEmProgresso }}</h3>
              <p class="card-text">Em andamento</p>
            </div>
          </div>
        </div>

        <!-- Card: Aguardando coleta -->
        <div class="col-12 col-sm-6 col-md-3 mb-3">
          <div class="card border-0 shadow h-100 text-center bg-green">
            <div class="card-body">
              <div class="d-flex justify-content-center align-items-center mb-3">
                <i class="bi bi-truck" style="font-size: 2rem;"></i>
              </div>
              <h3 class="card-title mb-1">{{ pecasColeta }}</h3>
              <p class="card-text">Aguardando coleta</p>
            </div>
          </div>
        </div>

        <!-- Card: Concluídas -->
        <div class="col-12 col-sm-6 col-md-3 mb-3">
          <div class="card border-0 shadow h-100 text-center bg-light-green">
            <div class="card-body">
              <div class="d-flex justify-content-center align-items-center mb-3">
                <i class="bi bi-check-circle" style="font-size: 2rem;"></i>
              </div>
              <h3 class="card-title mb-1">{{ pecasConcluidas }}</h3>
              <p class="card-text">Concluídas</p>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-12 justify-content-left">
          <canvas id="pecasChart" width="800" height="400" style="background-color: #ffff;"></canvas>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import NavBarUser from '@/components/NavBarUser.vue';
import { useAuthStore } from '@/store/store';
import { Chart, registerables } from 'chart.js';
import Axios from 'axios';

Chart.register(...registerables);

export default {
  name: 'DashboardHome',
  setup() {
    const store = useAuthStore();
    return {
      store,
    };
  },
  data() {
    return {
      id: 1,
      pecas: {
        finalizado: [],
        em_progresso: [],
        Iniciado: [],
        coleta: [],
      },
      chartInstance: null,
    };
  },
  computed: {
    pecasNaoIniciadas() {
      return this.pecas.Iniciado.length;
    },
    pecasEmProgresso() {
      return this.pecas.em_progresso.length;
    },
    pecasConcluidas() {
      return this.pecas.finalizado.length;
    },
    pecasColeta() {
      return this.pecas.coleta.length;
    },
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      try {
        const token = this.store.pegar_token;
        const response = await Axios.get("http://localhost:3333/pecas", {
          headers: {
            Authorization: `${token}`,
          },
        });
        this.pecas = response.data.peca;
        this.renderChart();
      } catch (error) {
        console.error("Erro ao buscar os dados:", error);
      }
    },
    renderChart() {
      const ctx = document.getElementById('pecasChart').getContext('2d');

      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      this.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Não Iniciadas', 'Em Andamento', 'Aguardando Coleta', 'Concluídas'],
          datasets: [
            {
              label: 'Quantidade de Peças',
              data: [
                this.pecasNaoIniciadas,
                this.pecasEmProgresso,
                this.pecasColeta,
                this.pecasConcluidas,
              ],
              backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)'
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)'
              ],
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            title: {
              display: true,
              text: 'Status das Peças',
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Status',
              },
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Quantidade',
              },
            },
          },
        },
      });
    },
  },
  components: {
    SidebarNav,
    NavBarUser,
  },
};
</script>

<style scoped>
.container {
  margin-left: 200px;
}
.row {
  margin-top: 100px;
}
#pecasChart {
  max-width: 800px;
  max-height: 800px;
  margin: auto;
}
</style>