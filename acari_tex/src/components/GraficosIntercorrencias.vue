<template>
  <!-- Só exibe o container se existir pelo menos um gráfico -->
  <div
    class="grid-container"
    v-if="temClassificacao || temNotas || temLinhaTemporal"
  >

    <!-- Pizza - Classificação -->
    <div class="grafico-box" v-if="temClassificacao">
      <canvas ref="classificacaoCanvas"></canvas>
    </div>

    <!-- Barras - Notas -->
    <div class="grafico-box" v-if="temNotas">
      <canvas ref="notasCanvas"></canvas>
    </div>

    <!-- Linha Temporal (opcional)
    <div class="grafico-box-large" v-if="temLinhaTemporal">
      <canvas ref="linhaCanvas"></canvas>
    </div>
    -->

  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";
import Chart from "chart.js/auto";

export default {
  name: "GraficosIntercorrencias",

  props: {
    porClassificacao: Object,
    porNotas: Object,
    linhaTemporal: Object
  },

  setup(props) {
    const classificacaoCanvas = ref(null);
    const notasCanvas = ref(null);
    const linhaCanvas = ref(null);

    let chart1 = null;
    let chart2 = null;
    let chart3 = null;

    const cores = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#14B8A6",
      "#F472B6",
      "#4F46E5"
    ];

    /* ===============================
       COMPUTEDS — verifica se há dados
    =============================== */

    const temClassificacao = computed(() =>
      props.porClassificacao &&
      typeof props.porClassificacao === "object" &&
      Object.keys(props.porClassificacao).length > 0
    );

    const temNotas = computed(() =>
      props.porNotas &&
      typeof props.porNotas === "object" &&
      Object.keys(props.porNotas).length > 0
    );

    const temLinhaTemporal = computed(() =>
      props.linhaTemporal &&
      typeof props.linhaTemporal === "object" &&
      Object.keys(props.linhaTemporal).length > 0
    );

    /* ===============================
       FUNÇÕES AUXILIARES
    =============================== */

    const destruir = () => {
      chart1?.destroy();
      chart2?.destroy();
      chart3?.destroy();
      chart1 = chart2 = chart3 = null;
    };

    const renderizar = () => {
      destruir();

      // --- GRÁFICO 1: Pizza (Classificação)
      if (temClassificacao.value && classificacaoCanvas.value) {
        chart1 = new Chart(classificacaoCanvas.value, {
          type: "pie",
          data: {
            labels: Object.keys(props.porClassificacao),
            datasets: [
              {
                data: Object.values(props.porClassificacao),
                backgroundColor: cores
              }
            ]
          },
          options: {
            plugins: {
              title: {
                display: true,
                text: "Tempo Perdido por Classificação",
                font: { size: 16, weight: "600" }
              },
              legend: { position: "bottom" }
            }
          }
        });
      }

      // --- GRÁFICO 2: Barras (Notas)
      if (temNotas.value && notasCanvas.value) {
        chart2 = new Chart(notasCanvas.value, {
          type: "bar",
          data: {
            labels: Object.keys(props.porNotas),
            datasets: [
              {
                label: "Quantidade",
                data: Object.values(props.porNotas),
                backgroundColor: ["#3B82F6", "#10B981", "#F59E0B"],
                borderWidth: 0,
                borderRadius: 10,
                barPercentage: 0.6,
                categoryPercentage: 0.7
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text:
                  "Motivos das Intercorrências (Notas) — minutos perdidos",
                font: { size: 16, weight: "600" }
              },
              legend: { display: false }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { size: 13 } }
              },
              y: {
                beginAtZero: true,
                ticks: { font: { size: 12 } }
              }
            }
          }
        });
      }

      // --- GRÁFICO 3: Linha Temporal
      if (temLinhaTemporal.value && linhaCanvas.value) {
        chart3 = new Chart(linhaCanvas.value, {
          type: "line",
          data: {
            labels: Object.keys(props.linhaTemporal),
            datasets: [
              {
                label: "Perdas por dia (min)",
                data: Object.values(props.linhaTemporal),
                borderColor: "#0F5132",
                backgroundColor: "#19875455",
                tension: 0.3,
                fill: true
              }
            ]
          },
          options: {
            plugins: {
              title: {
                display: true,
                text: "Linha do Tempo das Perdas",
                font: { size: 16, weight: "600" }
              },
              legend: { position: "bottom" }
            }
          }
        });
      }
    };

    /* ===============================
       CICLO DE VIDA
    =============================== */

    onMounted(renderizar);
    watch(
      () => [props.porClassificacao, props.porNotas, props.linhaTemporal],
      renderizar,
      { deep: true }
    );
    onBeforeUnmount(destruir);

    return {
      classificacaoCanvas,
      notasCanvas,
      linhaCanvas,
      temClassificacao,
      temNotas,
      temLinhaTemporal
    };
  }
};
</script>

<style scoped>
.grid-container {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}

.grafico-box {
  background: #fff;
  padding: 20px;
  height: 320px;
  border-radius: 14px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  flex: 1 1 calc(50% - 18px);
}

@media (max-width: 768px) {
  .grafico-box {
    flex: 1 1 100%;
    height: auto;
    padding: 16px;
  }

  .grafico-box canvas {
    width: 100% !important;
    height: auto !important;
  }
}
</style>
