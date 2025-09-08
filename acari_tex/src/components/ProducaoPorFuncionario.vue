<template>
  <div class="grafico-producao">
    <div class="graficos-lado-a-lado">
      <GChart v-if="chartDataBarras.length > 1" type="ColumnChart" :data="chartDataBarras" :options="barOptions"
        class="grafico" />

      <GChart v-if="chartDataLinhas.length > 1" type="LineChart" :data="chartDataLinhas" :options="lineOptions"
        class="grafico" />
    </div>

    <p v-if="chartDataBarras.length <= 1 && chartDataLinhas.length <= 1">
      Carregando gráficos...
    </p>
  </div>
</template>

<script>
import { GChart } from 'vue-google-charts'
import { useAuthStore } from '@/store/store'
import { io } from 'socket.io-client'
import api from '@/Axios'

export default {
  name: 'GraficoProducao',
  components: {
    GChart
  },
  props: {
    emailFuncionario: {
      type: String,
      required: true
    }
  },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      chartDataBarras: [['Hora', 'Peças Produzidas']],
      chartDataLinhas: [['Data', 'Peças Produzidas']],
      socket: null,
      loading: false,

      barOptions: {
        title: '',
        legend: { position: 'none' },
        colors: ['#00692b'],
        hAxis: {
          title: 'Hora',
        },
        vAxis: {
          title: 'Peças',
          minValue: 0
        }
      },

      lineOptions: {
        title: '',
        curveType: 'function',
        legend: { position: 'bottom' },
        colors: ['#004f21'],
        hAxis: {
          title: 'Dia',
        },
        vAxis: {
          title: 'Peças',
          minValue: 0
        }
      }
    }
  },
  mounted() {
    this.carregarDados();
    this.socket = io('http://localhost:3333');

    /* Garante que o evento não é registrado múltiplas vezes
    this.socket.off('nova_producao_funcionario');
    this.socket.on('nova_producao_funcionario', () => {
      if (!this.loading) {
        this.carregarDados();
      }
    });*/
  },
  unmounted() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  },
  methods: {
    async carregarDados() {
      if (this.loading) return;
      this.loading = true;

      try {
        const token = this.store.pegar_token;
        const response = await api.get(`/Producao/funcionario/${this.emailFuncionario}`, {
          headers: { Authorization: `${token}` }
        });

        const producao = response.data.producao;

        // Dados para o gráfico de barras (produção hoje por hora)
        const dadosHoje = producao.producao_hoje;
        const barras = [['Hora', 'Peças Produzidas']];
        const producaoPorHora = {};

        dadosHoje.forEach(item => {
          if (!producaoPorHora[item.hora]) {
            producaoPorHora[item.hora] = 0;
          }
          producaoPorHora[item.hora] += item.quantidade;
        });

        Object.keys(producaoPorHora)
          .sort()
          .forEach(hora => {
            barras.push([hora, producaoPorHora[hora]]);
          });

        this.chartDataBarras = barras;

        // Dados para o gráfico de linhas (histórico por dia)
        const historico = producao.historico;
        const linhas = [['Data', 'Peças Produzidas']];
        historico.forEach(item => {
          linhas.push([this.formatarData(item.data), item.quantidade]);
        });

        this.chartDataLinhas = linhas;

      } catch (error) {
        console.error('Erro ao carregar dados do gráfico:', error);
      } finally {
        this.loading = false;
      }
    },
    formatarData(dataStr) {
      const data = new Date(dataStr)
      const dia = String(data.getDate()).padStart(2, '0')
      const mes = String(data.getMonth() + 1).padStart(2, '0')
      const ano = data.getFullYear()
      return `${dia}/${mes}/${ano}`
    }
  }
}
</script>

<style scoped>
.grafico-producao {
  max-width: 100%;
  margin: 0 auto;
}

.graficos-lado-a-lado {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.grafico {
  width: 48%;
  height: 400px;
}
</style>
