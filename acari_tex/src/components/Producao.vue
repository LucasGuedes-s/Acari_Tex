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

    <div v-else class="text-center text-muted mt-4">
      Nenhuma produção registrada até o momento.
    </div>
  </div>
</template>

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
      funcionarioLabels: [],
      funcionarioData: [],
      equipeLabels: [],
      equipeData: [],
      chartInstances: {},
      temProducao: false,
      socket: null,
      loading: false,
    };
  },
  mounted() {
    this.fetchFuncionarioData();
    this.fetchEquipeData();

    this.socket = io('https://acari-tex.onrender.com');
    this.socket.on('nova_producao', () => {
      if (!this.loading) {
        this.fetchFuncionarioData();
        this.fetchEquipeData();
      }
    });
  },
  methods: {
    async fetchFuncionarioData() {
      try {
        this.loading = true;
        const token = this.store.pegar_token;

        const res = await api.get('/producao/equipe', {
          headers: { Authorization: `${token}` },
        });

        const producao = res.data.producao.producaoDia || [];
        console.log('Produção funcionários:', producao);

        this.aggregateFuncionarioData(producao);
        this.$nextTick(() => this.renderFuncionarioChart());
      } catch (err) {
        console.error('Erro ao buscar produção de funcionários:', err);
      } finally {
        this.loading = false;
      }
    },

    async fetchEquipeData() {
      try {
        this.loading = true;
        const token = this.store.pegar_token;

        const res = await api.get('/producao/equipe/dia', {
          headers: { Authorization: `${token}` },
        });

        const producao = res.data.producao.producaoDiaEquipe || [];
        console.log('Produção equipes:', producao);

        this.aggregateEquipeData(producao);
        this.$nextTick(() => this.renderEquipeChart());
      } catch (err) {
        console.error('Erro ao buscar produção de equipes:', err);
      } finally {
        this.loading = false;
      }
    },

    aggregateFuncionarioData(producao) {
      const pecasPorFuncionario = {};
      producao.forEach((funcObj) => {
        const nome = funcObj.nome || funcObj.funcionario;
        let totalFuncionario = 0;

        const etapas = funcObj.etapas || {};
        Object.values(etapas).forEach((etapaArray) => {
          etapaArray.forEach((registro) => {
            totalFuncionario += Number(registro.quantidade) || 0;
          });
        });

        pecasPorFuncionario[nome] = totalFuncionario;
      });

      this.funcionarioLabels = Object.keys(pecasPorFuncionario);
      this.funcionarioData = Object.values(pecasPorFuncionario);
      this.temProducao = this.funcionarioData.some((v) => v > 0) || this.equipeData.some((v) => v > 0);
    },

    aggregateEquipeData(producao) {
      const pecasPorEquipe = {};
      producao.forEach((equipeObj) => {
        const equipeNome = equipeObj.equipe || equipeObj.nome || 'Equipe Geral';
        let totalEquipe = 0;

        (equipeObj.funcionarios || []).forEach((func) => {
          const etapas = func.etapas || {};
          Object.values(etapas).forEach((etapaArray) => {
            etapaArray.forEach((registro) => {
              totalEquipe += Number(registro.quantidade) || 0;
            });
          });
        });

        if (!pecasPorEquipe[equipeNome]) pecasPorEquipe[equipeNome] = 0;
        pecasPorEquipe[equipeNome] += totalEquipe;
      });

      this.equipeLabels = Object.keys(pecasPorEquipe);
      this.equipeData = Object.values(pecasPorEquipe);
      this.temProducao = this.funcionarioData.some((v) => v > 0) || this.equipeData.some((v) => v > 0);
    },

    renderFuncionarioChart() {
      const canvas = this.$refs.funcionarioBarChart;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (this.chartInstances.funcionarioBarChart) this.chartInstances.funcionarioBarChart.destroy();

      this.chartInstances.funcionarioBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.funcionarioLabels,
          datasets: [
            {
              label: 'Produção por Funcionário',
              data: this.funcionarioData,
              backgroundColor: this.funcionarioLabels.map(() => '#008d3b'),
              borderColor: '#00692b',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: true }, title: { display: true, text: 'Produção por Funcionário' } },
          scales: {
            x: { title: { display: true, text: 'Funcionários' } },
            y: { beginAtZero: true, title: { display: true, text: 'Quantidade' } },
          },
        },
      });
    },

    renderEquipeChart() {
      const canvas = this.$refs.equipePieChart;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (this.chartInstances.equipePieChart) this.chartInstances.equipePieChart.destroy();

      this.chartInstances.equipePieChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: this.equipeLabels,
          datasets: [
            {
              label: 'Produção por Equipe',
              data: this.equipeData,
              backgroundColor: ['#00692b', '#008d3b', '#00b14c', '#66cc99', '#99e6b3'],
              borderColor: '#fff',
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: [
            {
              id: 'no-data-text',
              beforeDraw: (chart) => {
                const datasets = chart.data.datasets;
                if (!datasets || datasets.every((ds) => ds.data.every((v) => v === 0))) {
                  const ctx = chart.ctx;
                  const { width, height } = chart;
                  ctx.save();
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.font = '16px Arial';
                  ctx.fillStyle = '#666';
                  ctx.fillText('Sem dados para exibir', width / 2, height / 2);
                  ctx.restore();
                }
              },
            },
          ],
        },
      });
    },
  },
};
</script>

<style scoped>
.charts-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
  align-items: stretch;
}
.chart-wrapper {
  flex-grow: 1;
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.bar-chart-wrapper { flex: 2; }
.pie-chart-wrapper { flex: 1; }
canvas {
  width: 100% !important;
  height: 100% !important;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
@media (max-width: 767px) {
  .charts-container { flex-direction: column; align-items: center; }
  .chart-wrapper { width: 100%; height: 350px; }
}
</style>
