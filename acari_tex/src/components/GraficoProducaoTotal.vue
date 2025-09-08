<template>
  <div class="grafico-equipe">
    <GChart
      v-if="chartData.length > 1 && chartData[0].length > 1"
      type="LineChart"
      :data="chartData"
      :options="chartOptions"
      style="width: 100%; height: 400px"
    />
    <p v-else>Carregando dados da produção...</p>
  </div>
</template>
<script>
import { GChart } from 'vue-google-charts'
import { useAuthStore } from '@/store/store'
import { io } from 'socket.io-client'
import api from '@/Axios';

export default {
  name: 'GraficoEquipeProducao',
  components: { GChart },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      chartData: [['Hora', 'Sem dados']],
      loading: false,
      socket: null,
      chartOptions: {
        title: 'Produção por Funcionário (Hoje)',
        curveType: 'function',
        legend: { position: 'bottom', maxLines: 4 },
        hAxis: {
          title: 'Hora',
          slantedText: true, // inclina os labels para não ficarem sobrepostos
        },
        vAxis: {
          title: 'Peças Produzidas',
          minValue: 0,
        },
        // Paleta expandida com muitas cores (até 40 diferentes)
        colors: [
          '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099',
          '#3B3EAC', '#0099C6', '#DD4477', '#66AA00', '#B82E2E',
          '#316395', '#994499', '#22AA99', '#AAAA11', '#6633CC',
          '#E67300', '#8B0707', '#329262', '#5574A6', '#3B3EAC',
          '#FF33CC', '#00FF99', '#FF6600', '#33CC33', '#CC33FF',
          '#FF9999', '#99CC00', '#6699FF', '#FFCC00', '#00CCCC',
          '#FF0066', '#9966FF', '#33CCFF', '#CCFF33', '#FF3366',
          '#33FF66', '#663399', '#FF9933', '#66FF33', '#FF33FF'
        ]
      }
    };
  },
  mounted() {
    this.carregarDados();
    this.socket = io('http://192.168.0.115:3333');

    this.socket.on('nova_producao', () => {
      if (!this.loading) {
        console.log("AQUI CHEGUEI")
        this.carregarDados();

      }
    });
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
        const res = await api.get('/producao/equipe', {
          headers: { Authorization: `${token}` }
        });

        const equipe = res.data.producao;
        console.log('Dados da equipe:', equipe);

        // Agora começa de 06:00 até 23:00
        const horasPadrao = Array.from({ length: 18 }, (_, i) =>
          String(i + 6).padStart(2, '0') + ':00'
        );

        const nomes = equipe.map(f => f.nome);
        const colunas = nomes.length > 0 ? nomes : ['Sem dados'];

        const dataMatrix = [['Hora', ...colunas]];

        for (const hora of horasPadrao) {
          const linha = [hora];

          if (nomes.length > 0) {
            for (const funcionario of equipe) {
              const item = funcionario.producao.find(p => p.hora === hora);
              linha.push(item ? item.quantidade : 0);
            }
          } else {
            linha.push(0);
          }

          dataMatrix.push(linha);
        }

        this.chartData = dataMatrix;
      } catch (err) {
        console.error('Erro ao carregar gráfico da equipe:', err);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.grafico-equipe {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px;
}
</style>
