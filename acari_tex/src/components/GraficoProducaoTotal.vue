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
import axios from 'axios'
import { useAuthStore } from '@/store/store'
import { io } from 'socket.io-client'

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
        legend: { position: 'bottom' },
        hAxis: {
          title: 'Hora',
        },
        vAxis: {
          title: 'Peças Produzidas',
          minValue: 0,
        },
        colors: ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#AAAAAA']
      }
    };
  },
  mounted() {
    this.carregarDados();
    this.socket = io('http://localhost:3333');

    // Remove qualquer listener anterior e registra novo
    this.socket.off('nova_peca');
    this.socket.on('nova_peca', () => {
      if (!this.loading) {
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
        const res = await axios.get('http://localhost:3333/producao/equipe', {
          headers: { Authorization: `${token}` }
        });

        const equipe = res.data.producao;
        console.log('Dados da equipe:', equipe);

        const horasPadrao = Array.from({ length: 24 }, (_, i) =>
          String(i).padStart(2, '0') + ':00'
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
