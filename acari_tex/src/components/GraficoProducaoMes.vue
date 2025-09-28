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

    // Configura o Socket.io para atualização em tempo real
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

        const equipe = res.data.producao.producaoMes;
        const hoje = new Date();

        // Últimos 7 dias
        const dias7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(hoje);
          d.setDate(hoje.getDate() - (6 - i));
          return `${d.getDate()}/${d.getMonth() + 1}`;
        });

        const nomes = Object.values(equipe).map(f => f.nome);
        const barDatasets = [];
        const totalPorFuncionario = {};

        // Gera cores variantes de verde
        const gerarVerde = (idx) => {
          const gBase = 50;
          const step = Math.floor(50 / (nomes.length || 1));
          const g = gBase + step * idx;
          const r = Math.floor(Math.random() * 20);
          const b = Math.floor(Math.random() * 20);
          return `rgba(${r}, ${g}, ${b}, 0.9)`;
        };

        // Monta datasets
        Object.entries(equipe).forEach(([email, dados], idx) => {
          const data = dias7.map(dia => dados.dias[dia.split('/')[0]] || 0);
          barDatasets.push({
            label: dados.nome,
            data,
            backgroundColor: gerarVerde(idx),
            stack: 'Stack 0',
            email
          });

          totalPorFuncionario[dados.nome] = Object.values(dados.dias).reduce((a,b) => a+b, 0);
        });

        // Define se existe produção
        this.temProducao = barDatasets.some(ds => ds.data.some(v => v > 0)) &&
                           Object.values(totalPorFuncionario).some(v => v > 0);

        // Renderiza gráficos **só se houver produção**
        if (this.temProducao) {
          this.$nextTick(() => {
            const barCanvas = this.$refs.barChart;
            const doughnutCanvas = this.$refs.doughnutChart;

            if (barCanvas) {
              if (this.barChartInstance) this.barChartInstance.destroy();
              this.barChartInstance = new Chart(barCanvas.getContext('2d'), {
                type: 'bar',
                data: { labels: dias7, datasets: barDatasets },
                options: {
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: { mode: 'index', intersect: false },
                    title: { display: true, text: 'Produção por Funcionário (Últimos 7 dias)' }
                  },
                  scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                  }
                }
              });
            }

            if (doughnutCanvas) {
              if (this.doughnutChartInstance) this.doughnutChartInstance.destroy();
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
                    title: { display: true, text: 'Produção Total por Funcionário (Últimos 7 dias)' }
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

</style>
