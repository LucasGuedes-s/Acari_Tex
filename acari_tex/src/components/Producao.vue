<template>
  <div>
    <div v-if="temProducao" class="row justify-content-center charts-container">
      <div class="chart-wrapper bar-chart-wrapper">
        <canvas ref="funcionarioBarChart"></canvas>
      </div>
      <div class="chart-wrapper pie-chart-wrapper">
        <canvas ref="equipePieChart"></canvas>
      </div>
    </div>
  </div>
</template>
<style scoped>
.charts-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
  align-items: stretch;
  /* força os gráficos terem mesma altura */
}

.chart-wrapper {
  flex-grow: 1;
  height: 400px;
  /* mesma altura para todos */
  display: flex;
  justify-content: center;
  align-items: center;
}

.bar-chart-wrapper {
  flex: 2;
}

.pie-chart-wrapper {
  flex: 1;
}

canvas {
  width: 100% !important;
  height: 100% !important;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* Ajustes para telas pequenas (mobile) */
@media (max-width: 767px) {
  .charts-container {
    flex-direction: column;
    /* gráficos um abaixo do outro */
    align-items: center;
  }

  .chart-wrapper {
    width: 100%;
    height: 350px;
    /* altura reduzida para caber melhor no mobile */
  }
}
</style>

<script>
import { Chart } from 'chart.js';
import { useAuthStore } from '@/store/store';
import api from '@/Axios';
import { io } from 'socket.io-client';

export default {
  name: 'ProducaoCharts',
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      equipeLabels: [],        // Labels para gráfico de equipes
      equipeData: [],          // Dados para gráfico de equipes
      funcionarioLabels: [],   // Labels para gráfico de funcionários
      funcionarioData: [],     // Dados para gráfico de funcionários
      chartInstances: {}, 
      temProducao: false,     
    };
  },
  mounted() {
    this.fetchData();
    this.socket = io('https://acari-tex.onrender.com');
    this.socket.on('nova_producao', () => {
      if (!this.loading) this.fetchData();
    });
  },
  methods: {
    async fetchData() {
      try {
        const token = this.store.pegar_token;

        // Buscando dados da produção
        const response = await api.get(`/producao/equipe/dia`, {
          headers: { Authorization: `${token}` },
        });

        const producao = response.data.producao.producaoDiaEquipe;

        // Processa os dados
        this.aggregateProducaoData(producao);

        // Renderiza os gráficos
        this.$nextTick(() => {
          this.renderCharts();
        });
      } catch (error) {
        console.error('Erro ao buscar dados de produção:', error);
      }
    },

    aggregateProducaoData(producao) {
      const pecasPorEquipe = {};
      const pecasPorFuncionario = {};

      producao.forEach((equipe) => {
        let totalEquipe = 0;

        equipe.funcionarios.forEach((func) => {
          let totalFuncionario = 0;

          Object.values(func.etapas).forEach((etapa) => {
            etapa.forEach((registro) => {
              totalFuncionario += registro.quantidade;
              totalEquipe += registro.quantidade;
            });
          });

          // Agregar por funcionário
          if (!pecasPorFuncionario[func.nome]) {
            pecasPorFuncionario[func.nome] = 0;
          }
          pecasPorFuncionario[func.nome] += totalFuncionario;
        });

        // Agregar por equipe
        if (!pecasPorEquipe[equipe.equipe]) {
          pecasPorEquipe[equipe.equipe] = 0;
        }
        pecasPorEquipe[equipe.equipe] += totalEquipe;
      });

      // Prepara dados para os gráficos
      this.equipeLabels = Object.keys(pecasPorEquipe);
      this.equipeData = Object.values(pecasPorEquipe);

      this.funcionarioLabels = Object.keys(pecasPorFuncionario);
      this.funcionarioData = Object.values(pecasPorFuncionario);
      this.temProducao = this.equipeData.some(v => v > 0) || this.funcionarioData.some(v => v > 0);

    },

    renderCharts() {
      const equipePieCanvas = this.$refs.equipePieChart;
      const funcionarioBarCanvas = this.$refs.funcionarioBarChart;

      if (!equipePieCanvas || !funcionarioBarCanvas) return; // <--- evita o erro

      const equipePieCtx = equipePieCanvas.getContext('2d');
      const funcionarioBarCtx = funcionarioBarCanvas.getContext('2d');

      // destrói gráficos antigos...
      if (this.chartInstances.equipePieChart) {
        this.chartInstances.equipePieChart.destroy();
      }
      if (this.chartInstances.funcionarioBarChart) {
        this.chartInstances.funcionarioBarChart.destroy();
      }

      // Gráfico de Pizza - Produção por Equipe
      this.chartInstances.equipePieChart = new Chart(equipePieCtx, {
        type: 'pie',
        data: {
          labels: this.equipeLabels,
          datasets: [{
            label: 'Produção por Equipe',
            data: this.equipeData,
            backgroundColor: [
              '#00692b', '#008d3b', '#00b14c', '#66cc99', '#99e6b3'
            ],
            borderColor: '#fff',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          plugins: [{
            id: 'no-data-text',
            beforeDraw: (chart) => {
              const datasets = chart.data.datasets;
              if (!datasets || datasets.length === 0 || datasets.every(ds => ds.data.length === 0)) {
                const ctx = chart.ctx;
                const width = chart.width;
                const height = chart.height;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = '16px Arial';
                ctx.fillStyle = '#666';
                ctx.fillText('Sem dados para exibir', width / 2, height / 2);
                ctx.restore();
              }
            }
          }],
        },
      });

      // Gráfico de Barras - Produção por Funcionário
      this.chartInstances.funcionarioBarChart = new Chart(funcionarioBarCtx, {
        type: 'bar',
        data: {
          labels: this.funcionarioLabels,
          datasets: [{
            label: 'Produção por Funcionário',
            data: this.funcionarioData,
            backgroundColor: '#008d3b',
            borderColor: '#00692b',
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true, position: 'top' },
            title: { display: true, text: 'Produção por Funcionário' },
          },
          scales: {
            x: { title: { display: true, text: 'Funcionários' } },
            y: { beginAtZero: true, title: { display: true, text: 'Quantidade' } },
          },
        },
      });
    },
  },
};
</script>