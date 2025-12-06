<template>
  <div class="card p-3 mt-3">
    <h4 class="mb-3">⏱️ Comparação de Tempos Padrão</h4>
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script>
import { ref, watch, onMounted } from "vue";
import Chart from "chart.js/auto";

export default {
  props: {
    tempoPeca: { type: Number, required: true },
    etapasSelecionadas: { type: Array, required: true },
    etapasDefinidas: { type: Array, required: true }
  },

  setup(props) {
    const canvas = ref(null);
    let chart = null;

    const montarGrafico = () => {
      if (!canvas.value) return;

      if (chart) {
        chart.destroy();
      }

      const labels = ["Peça"];
      const valores = [props.tempoPeca || 0];

      props.etapasSelecionadas.forEach(etapaNome => {
        const etapa = props.etapasDefinidas.find(e => e.descricao === etapaNome);
        labels.push(etapaNome);
        valores.push(etapa?.tempo_padrao || 0);
      });

      chart = new Chart(canvas.value, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Tempo Padrão (min)",
              data: valores,
              borderWidth: 1,
              backgroundColor: "#2e7d32",
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    };

    onMounted(() => montarGrafico());

    watch(() => [props.etapasSelecionadas, props.tempoPeca], () => {
      montarGrafico();
    });

    return { canvas };
  },
};
</script>

<style scoped>
.card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 3px 8px rgba(0,0,0,0.1);
}
</style>
