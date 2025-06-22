<template>
  <div class="grafico-equipe">

    <GChart
      v-if="chartData.length > 1"
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

export default {
  name: 'GraficoEquipeProducao',
  components: { GChart },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      chartData: [['Hora', /* nomes dos funcionários dinâmicos */]],
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
        colors: ['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099'] // até 5 funcionários
      }
    };
  },
  mounted() {
    this.carregarDados();
  },
  methods: {
    async carregarDados() {
  try {
    const token = this.store.pegar_token;

    const res = await axios.get('http://localhost:3333/Producao/equipe', {
      headers: { Authorization: `${token}` }
    });

    const equipe = res.data.producao;

    if (!Array.isArray(equipe)) {
      console.error('Resposta inesperada da API:', equipe);
      return;
    }

    const horasPadrao = Array.from({ length: 24 }, (_, i) =>
      String(i).padStart(2, '0') + ':00'
    );

    const nomes = equipe.map(f => f.nome);
    const dataMatrix = [['Hora', ...nomes]];

    for (const hora of horasPadrao) {
      const linha = [hora];
      for (const funcionario of equipe) {
        const item = funcionario.producao.find(p => p.hora === hora);
        linha.push(item ? item.quantidade : 0);
      }
      dataMatrix.push(linha);
    }

    this.chartData = dataMatrix;
  } catch (err) {
    console.error('Erro ao carregar gráfico da equipe:', err);
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
