<template>
  <carregandoTela v-if="loading" />
  <div class="grafico-container" v-if="temProducao">
    <div class="chart-wrapper doughnut-wrapper">
      <canvas ref="doughnutChart"></canvas>
    </div>
    <div class="chart-wrapper bar-wrapper">
      <canvas ref="barChart"></canvas>
    </div>
  </div>
  <div v-else-if="!loading" class="sem-dados">
    <p>Não há produção registrada nos últimos 7 dias.</p>
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js';
import { useAuthStore } from '@/store/store';
import { io } from 'socket.io-client';
import api from '@/Axios';
import carregandoTela from './carregandoTela.vue';

Chart.register(...registerables);

export default {
  name: 'GraficoProducaoMes',
  components: { carregandoTela },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      barChartInstance: null,
      doughnutChartInstance: null,
      socket: null,
      loading: false,
      temProducao: false,
    };
  },
  mounted() {
    this.carregarDados();

    // Atualização em tempo real
    this.socket = io('https://acari-tex.onrender.com');
    this.socket.on('nova_producao', () => {
      if (!this.loading) this.carregarDados();
    });
  },
  unmounted() {
    if (this.socket) this.socket.disconnect();
    if (this.barChartInstance) this.barChartInstance.destroy();
    if (this.doughnutChartInstance) this.doughnutChartInstance.destroy();
  },
  methods: {
    async carregarDados() {
  if (this.loading) return;
  this.loading = true;

  try {
    const token = this.store.pegar_token;
    const res = await api.get('/producao/equipe', {
      headers: { Authorization: `${token}` }
    });

    const equipe = res.data.producao; // estrutura raiz
    const funcionarios = equipe.funcionarios || [];
    const hoje = new Date();

    // Últimos 7 dias formatados (dd/mm)
    const dias7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - (6 - i));
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const barDatasets = [];
    const totalPorFuncionario = {};

    // 🎨 Gera tons de verde diferentes
    const gerarVerde = (idx) => {
      const base = 100 + idx * 20;
      return `rgba(0, ${Math.min(base, 180)}, 80, 0.9)`;
    };

    // 🔹 Itera sobre cada funcionário
    funcionarios.forEach((f, idx) => {
      const etapas = f.etapas || {};

      // 🔹 Soma total diário (últimos 7 dias)
      const data = dias7.map(dia => {
        // dentro das etapas pode ter subetapas por dia
        let totalDia = 0;
        Object.values(etapas).forEach(etapa => {
          if (etapa[dia]) totalDia += etapa[dia];
        });
        return totalDia;
      });

      barDatasets.push({
        label: f.nome,
        data,
        backgroundColor: gerarVerde(idx),
        stack: 'Stack 0',
      });

      // Soma total mensal
      let total = 0;
      Object.values(etapas).forEach(etapa => {
        total += Object.values(etapa).reduce((a, b) => a + b, 0);
      });
      totalPorFuncionario[f.nome] = total;
    });

    // Verifica se há produção real
    const temProducao = Object.values(totalPorFuncionario).some(v => v > 0);
    this.temProducao = temProducao;

    if (temProducao) {
      this.$nextTick(() => {
        const barCanvas = this.$refs.barChart;
        const doughnutCanvas = this.$refs.doughnutChart;

        // 🔹 Destroi gráficos anteriores
        if (this.barChartInstance) this.barChartInstance.destroy();
        if (this.doughnutChartInstance) this.doughnutChartInstance.destroy();

        // 🔹 Gráfico de barras (últimos 7 dias)
        if (barCanvas) {
          this.barChartInstance = new Chart(barCanvas.getContext('2d'), {
            type: 'bar',
            data: { labels: dias7, datasets: barDatasets },
            options: {
              responsive: true,
              plugins: {
                legend: { position: 'top' },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.raw} peças`
                  }
                },
                title: {
                  display: true,
                  text: 'Produção por Funcionário (Últimos 7 dias)',
                  font: { size: 16, weight: 'bold' }
                }
              },
              scales: {
                x: { stacked: true, title: { display: true, text: 'Dia' } },
                y: {
                  stacked: true,
                  beginAtZero: true,
                  title: { display: true, text: 'Peças Produzidas' }
                }
              }
            }
          });
        }

        // 🔹 Gráfico de rosca (total por funcionário)
        if (doughnutCanvas) {
          this.doughnutChartInstance = new Chart(doughnutCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
              labels: Object.keys(totalPorFuncionario),
              datasets: [{
                data: Object.values(totalPorFuncionario),
                backgroundColor: Object.keys(totalPorFuncionario).map((_, idx) => gerarVerde(idx)),
                borderColor: '#fff',
                borderWidth: 2
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: { position: 'right' },
                tooltip: {
                  callbacks: {
                    label: (context) => `${context.label}: ${context.raw} peças`
                  }
                },
                title: {
                  display: true,
                  text: 'Produção Total por Funcionário (Últimos 7 dias)',
                  font: { size: 16, weight: 'bold' }
                }
              }
            }
          });
        }
      });
    }

  } catch (err) {
    console.error('Erro ao carregar gráfico:', err);
  } finally {
    this.loading = false;
  }
}

  }
};
</script>

<style scoped>
.grafico-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
}

.chart-wrapper {
  flex: 1;
  min-width: 300px;
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.bar-wrapper {
  flex: 2;
}

.doughnut-wrapper {
  flex: 1;
}

canvas {
  width: 100% !important;
  height: 100% !important;
  margin-top: 18px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.sem-dados {
  text-align: center;
  color: #666;
  font-size: 1rem;
  padding: 40px;
}
</style>
