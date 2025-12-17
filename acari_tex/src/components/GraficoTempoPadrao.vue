<template>
  <div class="card p-4 mt-3">
    <h4 class="mb-3 fw-semibold text-success">
      ⏱️ Comparação de Tempos Padrão
    </h4>

    <div class="grafico-wrapper">
      <canvas ref="canvas"></canvas>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
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

      chart?.destroy();

      const labels = ["Peça"];
      const valores = [props.tempoPeca || 0];
      const cores = ["#16a34a"]; // peça em destaque

      props.etapasSelecionadas.forEach(nomeEtapa => {
        const etapa = props.etapasDefinidas.find(
          e => e.descricao === nomeEtapa
        );

        labels.push(nomeEtapa);
        valores.push(etapa?.tempo_padrao || 0);
        cores.push("#2563eb");
      });

      chart = new Chart(canvas.value, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Tempo padrão (min)",
              data: valores,
              backgroundColor: cores,
              borderRadius: 12,
              barThickness: 40,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#0f172a",
              titleColor: "#fff",
              bodyColor: "#e5e7eb",
              padding: 10,
              callbacks: {
                label: ctx => ` ${ctx.raw} min`
              }
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 13 } }
            },
            y: {
              beginAtZero: true,
              grid: { color: "#e5e7eb" },
              ticks: {
                callback: v => `${v} min`
              }
            }
          }
        }
      });
    };

    onMounted(montarGrafico);

    watch(() => props.tempoPeca, montarGrafico);
    watch(() => props.etapasSelecionadas, montarGrafico, { deep: true });

    onBeforeUnmount(() => chart?.destroy());

    return { canvas };
  }
};
</script>

<style scoped>
.card {
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.grafico-wrapper {
  height: 320px;
}
</style>
