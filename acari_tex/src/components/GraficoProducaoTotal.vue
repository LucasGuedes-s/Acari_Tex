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
          slantedText: true,
        },
        vAxis: {
          title: 'Peças Produzidas',
          minValue: 0,
          viewWindow: { min: 0 }
        },
        colors: [
          '#004d20','#3366CC', '#DC3912', '#FF9900', '#109618', '#990099',
          '#3B3EAC', '#0099C6', '#DD4477', '#66AA00', '#B82E2E'
        ]
      }
    };
  },
  mounted() {
    this.carregarDados();
    this.socket = io('https://acari-tex.onrender.com');

    this.socket.on('nova_producao', () => {
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
        const res = await api.get('/producao/equipe', {
          headers: { Authorization: `${token}` }
        });

        const equipe = res.data.producao; // Array de funcionários
        console.log('Dados da equipe:', equipe);
        // Criando matriz de horas de 06:00 até 23:00
        const horasPadrao = Array.from({ length: 18 }, (_, i) =>
          String(i + 6).padStart(2, '0') + ':00'
        );

        // Nome dos funcionários
        const nomes = equipe.map(f => f.nome);
        const dataMatrix = [['Hora', ...nomes]];

        // Para cada hora, soma as produções de todas as etapas do funcionário
        for (const hora of horasPadrao) {
          const linha = [hora];

          for (const funcionario of equipe) {
            let totalHora = 0;
            if (funcionario.etapas) {
              for (const etapaNome in funcionario.etapas) {
                const etapaArray = funcionario.etapas[etapaNome];
                const itemHora = etapaArray.find(p => p.hora === hora);
                if (itemHora) totalHora += itemHora.quantidade;
              }
            }
            linha.push(totalHora);
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
