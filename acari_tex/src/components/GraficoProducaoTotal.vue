<template>
  <div class="grafico-eficiencia">
    <canvas ref="chartCanvas" v-show="temDados" style="width: 100%; height: 100%;"></canvas>
    <p v-if="!temDados" class="sem-dados">Sem dados disponíveis</p>
  </div>
</template>

<script>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Chart from 'chart.js/auto';

export default {
  name: 'GraficoProducaoTotal',
  props: {
    producaoDados: {
      type: Array,
      default: () => [],
    },
  },
  setup(props) {
    const chartCanvas = ref(null);
    const chartInstance = ref(null);
    const temDados = ref(false);

    const coresVerdes = [
      "#065f46", "#047857", "#059669", "#10b981", "#34d399",
      "#6ee7b7", "#a7f3d0", "#15803d", "#166534", "#14532d",
      "#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0",
      "#0f766e", "#115e59", "#134e4a", "#064e3b", "#052e16",
    ];

    const destruirGrafico = () => {
      if (chartInstance.value) {
        chartInstance.value.destroy();
        chartInstance.value = null;
      }
    };

    const montarGrafico = () => {
      destruirGrafico();

      const dados = props.producaoDados || [];
      console.log('Dados recebidos para o gráfico de produção por peça:', dados);
      if (!Array.isArray(dados) || dados.length === 0) {
        temDados.value = false;
        return;
      }

      temDados.value = true;
      // Garante que o canvas existe
      if (!chartCanvas.value) return;

      const ctx = chartCanvas.value.getContext('2d');

      const labels = dados.map(p => p.descricaoPeca || 'Peça');
      const quantidade = dados.map(p => p.quantidadeTotal || 0);
      const tempoMedio = dados.map(p => p.tempoPadraoTotal || 0);

      chartInstance.value = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Quantidade Produzida',
              data: quantidade,
              backgroundColor: coresVerdes.map((_, i) => coresVerdes[i % coresVerdes.length]),
              borderRadius: 8,
              barPercentage: 0.7,
              categoryPercentage: 0.6,
            },
            {
              type: 'line',
              label: 'Tempo Médio (min)',
              data: tempoMedio,
              borderColor: '#004d20',
              borderWidth: 2,
              tension: 0.3,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 20, bottom: 10, left: 10, right: 10 } },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#333', boxWidth: 14 },
            },
            title: {
              display: true,
              text: 'Produção por Peça',
              color: '#222',
              font: { size: 18, weight: '600' },
              padding: { bottom: 20 },
            },
            tooltip: {
              backgroundColor: '#fff',
              titleColor: '#333',
              bodyColor: '#333',
              borderColor: '#ccc',
              borderWidth: 1,
              callbacks: {
                label: ctx => `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}${ctx.dataset.label.includes('Tempo') ? ' min' : ''}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#555', font: { size: 13 } },
            },
            y: {
              beginAtZero: true,
              ticks: { color: '#555' },
              title: { display: true, text: 'Quantidade', color: '#333' },
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { color: '#14532d' },
              title: { display: true, text: 'Tempo Médio (min)', color: '#14532d' },
            },
          },
        },
      });
    };

    watch(
      /* eslint-disable */ 
      () => props.producaoDados,
      async (novoValor) => {
        await nextTick();
        montarGrafico();
      },
      { deep: true, immediate: true }
    );

    onMounted(() => montarGrafico());
    onBeforeUnmount(() => destruirGrafico());

    return { chartCanvas, temDados };
  },
};
</script>

<style scoped>
.grafico-eficiencia {
  max-width: 100%;
  margin: 20px auto;
  border-radius: 12px;
  background-color: #fff;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  height: 320px;
  position: relative;
}
.grafico-eficiencia canvas {
  width: 100%;
  height: 100% !important;
}
.sem-dados {
  text-align: center;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #888;
  font-size: 16px;
}
</style>
