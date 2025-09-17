<template>
  <div class="grafico-equipe">
    <GChart 
      v-if="chartData.length > 1 && chartData[0].length > 1" 
      type="ColumnChart" 
      :data="chartData"
      :options="chartOptions" 
      style="width: 100%; height: 500px" 
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
      chartData: [['Dia', 'Sem dados']],
      loading: false,
      socket: null,
      chartOptions: {
  title: 'Produção por Funcionário (Mês)',
  legend: { position: 'right', maxLines: 10 },
  hAxis: { title: 'Dia do Mês', slantedText: true },
  vAxis: { title: 'Peças Produzidas', minValue: 0 },
  bar: { groupWidth: "60%" },
  isStacked: false, // não empilha, barra individual
  colors: [
    '#004d20','#3366CC','#DC3912','#FF9900','#109618',
    '#990099','#3B3EAC','#0099C6','#DD4477','#66AA00',
    '#B82E2E','#006400','#008000','#228B22','#2E8B57'
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

    // Dados recebidos do back-end no formato: { funcionario: { dia: quantidade } }
    const equipe = res.data.producao.producaoMes;

    // Dias do mês 1 a 31
    const diasPadrao = Array.from({ length: 31 }, (_, i) => String(i + 1));

    // Lista de funcionários
    const nomes = Object.keys(equipe);

    // Montando a primeira linha do chart (dias + funcionários + total do dia)
    const dataMatrix = [['Dia', ...nomes, 'Total do Dia']];

    // Preencher valores por dia
    for (const dia of diasPadrao) {
      const linha = [dia];
      let totalDiaTodos = 0;

      for (const funcionario of nomes) {
        const valorDia = equipe[funcionario][dia] || 0;
        const valorPositivo = Math.max(valorDia, 0); // ignora negativos
        linha.push(valorPositivo);
        totalDiaTodos += valorPositivo;
      }

      linha.push(totalDiaTodos);
      dataMatrix.push(linha);
    }

    // Atualiza o gráfico
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
