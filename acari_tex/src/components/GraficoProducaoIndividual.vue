<template>
  <CarregandoTela v-if="loading" />

  <div class="grafico-equipe" v-show="!loading && temDados">
    <h5 class="fw-bold mb-0" style="color:#166534;">Produção Individual</h5>
    <canvas ref="chartCanvas" style="width:100%;"></canvas>
  </div>

  <p v-if="!loading && !temDados" class="sem-dados">
    Sem dados de produção por hora para o período.
  </p>
</template>

<script>
import { ref, onMounted, watch, onBeforeUnmount } from "vue";
import Chart from "chart.js/auto";
import CarregandoTela from "./carregandoTela.vue";

export default {
  name: "LineEquipeSuave",
  components: { CarregandoTela },
  props: {
    filtro: { type: String, default: "hoje" },
    producaoDados: { type: Object, default: () => ({ producao: { producaoDia: { funcionarios: [] } } }) },
    loading: { type: Boolean, default: false },
  },

  setup(props) {
    const chartCanvas = ref(null);
    const chart = ref(null);
    const temDados = ref(false);

    const cores = [
      "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
      "#6366F1", "#84CC16", "#FB923C", "#0EA5E9", "#22C55E", "#EAB308", "#BE123C",
      "#7C3AED", "#DB2777", "#06B6D4", "#4F46E5", "#65A30D", "#EA580C", "#0284C7",
      "#15803D", "#CA8A04", "#B91C1C", "#6D28D9", "#9D174D", "#0891B2", "#4338CA",
      "#4D7C0F", "#C2410C", "#2563EB", "#16A34A", "#D97706", "#DC2626", "#9333EA",
      "#C026D3", "#0D9488", "#3730A3", "#166534", "#9A3412", "#1D4ED8", "#22C55E",
      "#FACC15", "#B91C1C", "#7E22CE", "#F472B6", "#06B6D4", "#6366F1", "#84CC16",
      "#F97316"
    ];

    const destruir = () => {
      if (chart.value) {
        chart.value.destroy();
        chart.value = null;
      }
    };

    const atualizar = () => {
      destruir();

      const equipe = props.producaoDados?.producao?.producaoDia?.funcionarios || [];
      if (!Array.isArray(equipe) || equipe.length === 0) {
        temDados.value = false;
        return;
      }

      temDados.value = true;

      setTimeout(() => {
        const cvs = chartCanvas.value;
        if (!cvs) return;

        const ctx = cvs.getContext("2d");
        if (!ctx) return;

let horas = [];
for (let h = 7; h <= 19; h++) {
  horas.push(`${String(h).padStart(2, "0")}:00`);
}

const existe11 = equipe.some(f =>
  f.producaoPorHora?.some(p => p.hora === "11:00" || p.hora === "11:30")
);

const existe17 = equipe.some(f =>
  f.producaoPorHora?.some(p => p.hora === "17:00" || p.hora === "17:30")
);

horas = horas.filter(hora => {
  if (hora === "11:00" && !existe11) return false;
  if (hora === "17:00" && !existe17) return false;
  return true;
});


        const datasets = equipe.map((f, i) => {
  const pontos = horas.map(h => {
    let item = f.producaoPorHora?.find(x => x.hora === h);

    if (!item && h === "11:00") {
      item = f.producaoPorHora?.find(x => x.hora === "11:30");
    }

    if (!item && h === "17:00") {
      item = f.producaoPorHora?.find(x => x.hora === "17:30");
    }

    return item ? item.total : 0;
  });

  return {
    label: f.nome,
    data: pontos,
    borderColor: cores[i % cores.length],
    borderWidth: 3,
    fill: false,
    tension: 0.4,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: "#fff",
    pointBorderColor: cores[i % cores.length],
    pointBorderWidth: 2
  };
});


        chart.value = new Chart(ctx, {
          type: "line",
          data: { labels: horas, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "nearest", intersect: false },
            plugins: {
              plugins: {
                legend: {
                  display: true,
                  position: "bottom",

                  onClick: (e, legendItem, legend) => {
                    const index = legendItem.datasetIndex;
                    const chart = legend.chart;

                    const meta = chart.getDatasetMeta(index);

                    meta.hidden = meta.hidden === null
                      ? !chart.data.datasets[index].hidden
                      : null;

                    chart.update();
                  },

                  labels: {
                    padding: 20,
                    boxWidth: 16,
                    boxHeight: 16,
                    usePointStyle: true,
                    pointStyle: "circle",
                    font: {
                      size: 13,
                      weight: "600"
                    },
                    generateLabels(chart) {
                      const datasets = chart.data.datasets;

                      return datasets.map((dataset, i) => {
                        const meta = chart.getDatasetMeta(i);

                        return {
                          text: dataset.label,
                          fillStyle: dataset.borderColor,
                          strokeStyle: dataset.borderColor,
                          hidden: meta.hidden,
                          datasetIndex: i
                        };
                      });
                    }
                  }
                },

                tooltip: {
                  mode: "index",
                  intersect: false,
                  backgroundColor: "#004d20",
                  bodyColor: "#fff",
                  titleColor: "#fff",
                  callbacks: {
                    label: ctx =>
                      `${ctx.dataset.label}: ${ctx.formattedValue} peças`
                  }
                }
              }
            },
            scales: {
              x: { title: { display: true, text: "Hora" }, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { maxRotation: 45, minRotation: 45 } },
              y: { beginAtZero: true, title: { display: true, text: "Peças Produzidas" }, grid: { color: "rgba(0,0,0,0.05)" } }
            }
          }
        });
      }, 0);
    };

    onMounted(atualizar);
    onBeforeUnmount(destruir);

    watch(
      [() => props.loading, () => props.producaoDados],
      ([newLoading]) => {
        if (!newLoading) atualizar();
      },
      { deep: true }
    );

    return { chartCanvas, temDados };
  }
};
</script>

<style scoped>
.grafico-equipe {
  width: 100%;
  border-radius: 16px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
  height: 460px;
  display: flex;
  flex-direction: column;
}

.grafico-equipe canvas {
  flex-grow: 1;
  min-height: 0;
}

.sem-dados {
  text-align: center;
  color: #888;
  font-size: 16px;
  padding: 20px;
}
</style>