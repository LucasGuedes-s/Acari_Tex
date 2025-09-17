<template>
  <div>
    <div class="row justify-content-center">
      <div class="col-12 col-md-6 mb-3 d-flex justify-content-center">
        <canvas ref="producaoBarChart" width="800" height="400"></canvas>
      </div>
      <div class="col-12 col-md-6 mb-3 d-flex justify-content-center">
        <canvas ref="funcionarioBarChart" width="800" height="400"></canvas>
      </div>
    </div>
  </div>
</template>

<script>
import { Chart } from 'chart.js';
import { useAuthStore } from '@/store/store';
import api from '@/Axios';

export default {
  name: 'ProducaoCharts',
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      opLabels: [],         // Labels para o gráfico de OP
      opData: [],           // Dados para o gráfico de OP
      funcionarioLabels: [],// Labels para o gráfico de Funcionário
      funcionarioData: [],  // Dados para o gráfico de Funcionário
      chartInstances: {},   // Instâncias dos gráficos
    };
  },
  async mounted() {
    await this.fetchData();
  },
  methods: {
    // Função para buscar os dados de produção
    async fetchData() {
      try {
        const token = this.store.pegar_token;

        // Buscando dados de produção de peças
        const response = await api.get(`/producao`, {
          headers: { Authorization: `${token}` },
        });

        const producao = response.data.peca;
        console.log(producao);
        // Agregar dados de produção
        this.aggregateProducaoData(producao);

        // Após os dados estarem prontos, renderizar os gráficos
        this.$nextTick(() => {
          this.renderCharts();
        });
      } catch (error) {
        console.error('Erro ao buscar os dados de produção:', error);
      }
    },

    // Função para agregar dados de produção (por OP e por Funcionário)
    aggregateProducaoData(producao) {
      this.pecasPorOP = {};
      this.pecasPorFuncionario = {};

      producao.forEach((item) => {
        // Agregar por OP
        if (!this.pecasPorOP[item.id_da_op]) {
          this.pecasPorOP[item.id_da_op] = 0;
        }
        this.pecasPorOP[item.id_da_op] += item.quantidade_pecas;

        // Agregar por Funcionário
        if (!this.pecasPorFuncionario[item.id_funcionario]) {
          this.pecasPorFuncionario[item.id_funcionario] = 0;
        }
        this.pecasPorFuncionario[item.id_funcionario] += item.quantidade_pecas;
      });

      // Preparar labels e dados para gráficos
      this.opLabels = Object.keys(this.pecasPorOP);
      this.opData = Object.values(this.pecasPorOP);

      this.funcionarioLabels = Object.keys(this.pecasPorFuncionario);
      this.funcionarioData = Object.values(this.pecasPorFuncionario);
    },

    // Função para renderizar os gráficos
    renderCharts() {
      // Obter contexto dos gráficos
      const producaoBarCtx = this.$refs.producaoBarChart.getContext('2d');
      const funcionarioBarCtx = this.$refs.funcionarioBarChart.getContext('2d');

      // Destruir gráficos anteriores, se existirem
      if (this.chartInstances.producaoBarChart) {
        this.chartInstances.producaoBarChart.destroy();
      }
      if (this.chartInstances.funcionarioBarChart) {
        this.chartInstances.funcionarioBarChart.destroy();
      }

      // Gráfico de barras de Produção por OP
      this.chartInstances.producaoBarChart = new Chart(producaoBarCtx, {
        type: 'bar',
        data: {
          labels: this.opLabels,
          datasets: [{
            label: 'Quantidade de Peças por OP',
            data: this.opData,
            backgroundColor: '#008d3b',
            borderColor: '#008d3b',
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true, position: 'top' },
            title: { display: true, text: 'Quantidade de Peças por OP' },
          },
          scales: {
            x: { title: { display: true, text: 'OP' } },
            y: { beginAtZero: true, title: { display: true, text: 'Quantidade' } },
          },
        },
      });

      // Gráfico de barras de Produção por Funcionário
      this.chartInstances.funcionarioBarChart = new Chart(funcionarioBarCtx, {
        type: 'bar',
        data: {
          labels: this.funcionarioLabels,
          datasets: [{
            label: 'Quantidade de Peças por Funcionário',
            data: this.funcionarioData,
            backgroundColor: '#00692b',
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
            x: { title: { display: true, text: 'Funcionário' } },
            y: { beginAtZero: true, title: { display: true, text: 'Quantidade' } },
          },
        },
      });
    },
  },
};
</script>

<style scoped>
.container-fluid {
  max-width: 1200px;
  /* Define um limite para não ficar muito largo */
  margin: auto;
  /* Centraliza o conteúdo */
}

.row {
  margin-top: 30px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  /* Centraliza os elementos */
}

canvas {
  max-width: 100%;
  height: auto;
  background-color: white;
}
</style>