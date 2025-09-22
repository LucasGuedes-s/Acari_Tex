<template>
  <carregandoTela v-if="loading" />
  <div class="grafico-container">
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
Chart.register(...registerables);
import carregandoTela from './carregandoTela.vue';

export default {
  name: 'GraficoProducao7Dias',
  setup() {
    const store = useAuthStore();
    return { store };
  },
  components:{
    carregandoTela
  },
  data() {
    return {
      barChartInstance: null,
      doughnutChartInstance: null,
      socket: null,
      loading: false,
    };
  },
  mounted() {
    this.carregarDados();
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

        const funcionarios = Object.keys(equipe);
        const barDatasets = [];
        const totalPorFuncionario = {};

        // Inicializa total
        funcionarios.forEach(func => totalPorFuncionario[func] = 0);

        // Gera cores variantes de verde
        const gerarVerde = (idx, total) => {
          const gBase = 50; // verde base bem escuro
          const step = Math.floor(50 / (total || 1)); // variação suave
          const g = gBase + step * idx;
          const r = Math.floor(Math.random() * 20);   // toque sutil de vermelho
          const b = Math.floor(Math.random() * 20);   // toque sutil de azul
          return `rgba(${r}, ${g}, ${b}, 0.9)`;       // opacidade alta
        }

        // Caso não haja funcionários
        if (funcionarios.length === 0) {
          // Destrói gráficos antigos se existirem
          if (this.barChartInstance) this.barChartInstance.destroy();
          if (this.doughnutChartInstance) this.doughnutChartInstance.destroy();

          // Cria um gráfico "vazio" com valor 0
          const ctxBar = this.$refs.barChart.getContext('2d');
          this.barChartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
              labels: ['Sem produção'],
              datasets: [{
                label: 'Produção',
                data: [0],
                backgroundColor: 'rgba(50,150,50,0.7)',
              }]
            },
            options: {
              responsive: true,
              plugins: { title: { display: true, text: 'Nenhuma produção nos últimos 7 dias' } },
              scales: { y: { beginAtZero: true } }
            }
          });

          const ctxDoughnut = this.$refs.doughnutChart.getContext('2d');
          this.doughnutChartInstance = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
              labels: ['Sem produção'],
              datasets: [{
                data: [1],
                backgroundColor: ['rgba(50,150,50,0.7)']
              }]
            },
            options: {
              responsive: true,
              plugins: { title: { display: true, text: 'Nenhuma produção nos últimos 7 dias' } }
            }
          });

          this.loading = false;
          return; // não executa o restante do método
        }

        funcionarios.forEach((func, idx) => {
          const data = dias7.map((dia, i) => {
            const valor = equipe[func][String(new Date(hoje).getDate() - (6 - i))] || 0;
            totalPorFuncionario[func] += valor;
            return valor;
          });

          barDatasets.push({
            label: func,
            data,
            backgroundColor: gerarVerde(idx),
            stack: 'Stack 0'
          });
        });

        // --- Gráfico de barras ---
        if (this.barChartInstance) this.barChartInstance.destroy();
        const barCtx = this.$refs.barChart.getContext('2d');
        this.barChartInstance = new Chart(barCtx, {
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

        // --- Gráfico Doughnut ---
        const doughnutData = {
          labels: Object.keys(totalPorFuncionario),
          datasets: [{
            data: Object.values(totalPorFuncionario),
            backgroundColor: Object.keys(totalPorFuncionario).map((_, idx) => gerarVerde(idx)),
            borderColor: '#fff',
            borderWidth: 2
          }]
        };

        if (this.doughnutChartInstance) this.doughnutChartInstance.destroy();
        const doughnutCtx = this.$refs.doughnutChart.getContext('2d');
        this.doughnutChartInstance = new Chart(doughnutCtx, {
          type: 'doughnut',
          data: doughnutData,
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'right' },
              title: { display: true, text: 'Produção Total por Funcionário (Últimos 7 dias)' }
            }
          }
        });

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
  /* Gráfico de barras maior */
}

.doughnut-wrapper {
  flex: 1;
  /* Doughnut menor */
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
