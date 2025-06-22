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
import axios from 'axios'
import { GChart } from 'vue-google-charts'
import { useAuthStore } from '@/store/store'

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
    this.carregarDados()
  },
  methods: {
    async carregarDados() {
      try {
        const token = this.store.pegar_token;
        const response = await axios.get(`http://localhost:3333/Producao/funcionario/${this.emailFuncionario}`, {
          headers: { Authorization: `${token}` }
        });

        const producao = response.data.producao;

        const dadosHoje = producao.producao_hoje;
        console.log('Dados de produção hoje:', dadosHoje);
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


        const historico = producao.historico;
        const linhas = [['Data', 'Peças Produzidas']];
        historico.forEach(item => {
          linhas.push([this.formatarData(item.data), item.quantidade]);
        });

        this.chartDataLinhas = linhas;

      } catch (error) {
        console.error('Erro ao carregar dados do gráfico:', error);
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
