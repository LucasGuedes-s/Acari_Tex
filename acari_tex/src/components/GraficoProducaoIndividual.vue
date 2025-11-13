<template>
  <CarregandoTela v-if="loading" />
  <div class="grafico-equipe justify-content-between" v-show="temDados && !loading">
    <h5 class="fw-bold mb-0" style="color: #166534; align-items: end;">Produção Individual</h5>
    <canvas ref="chartCanvas" style="width: 100%; height: 400px;"></canvas>
  </div>
</template>

<script>
import { ref, onMounted, watch, onBeforeUnmount } from "vue";
import Chart from "chart.js/auto";
import { useAuthStore } from "@/store/store";
import api from "@/Axios";
import { io } from "socket.io-client";
import CarregandoTela from "./carregandoTela.vue";

export default {
  name: "LineEquipeSuave",
  components: { CarregandoTela },
  props: {
    filtro: {
      type: String,
      default: "hoje",
    },
  },
  setup(props) {
    const chartCanvas = ref(null);
    const chart = ref(null);
    const loading = ref(false);
    const store = useAuthStore();
    const socket = ref(null);
    const temDados = ref(false);

    const destruirGrafico = () => {
      if (chart.value) {
        chart.value.destroy();
        chart.value = null;
      }
    };

    const cores = [
      "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
      "#EC4899", "#14B8A6", "#6366F1", "#84CC16", "#FB923C",
      "#0EA5E9", "#22C55E", "#EAB308", "#BE123C", "#7C3AED",
      "#DB2777", "#06B6D4", "#4F46E5", "#65A30D", "#EA580C",
      "#0284C7", "#15803D", "#CA8A04", "#B91C1C", "#6D28D9",
      "#9D174D", "#0891B2", "#4338CA", "#4D7C0F", "#C2410C",
      "#2563EB", "#16A34A", "#D97706", "#DC2626", "#9333EA",
      "#C026D3", "#0D9488", "#3730A3", "#166534", "#9A3412",
      "#1D4ED8", "#22C55E", "#FACC15", "#B91C1C", "#7E22CE",
      "#F472B6", "#06B6D4", "#6366F1", "#84CC16", "#F97316"
    ];


    const fetchData = async () => {
      try {
        loading.value = true;
        destruirGrafico();

        const token = store.pegar_token;
        const res = await api.get("/producao/equipe", {
          headers: { Authorization: token },
          params: { filtro: props.filtro },
        });
        loading.value = false;

        const equipe = res.data?.producao?.producaoDia?.funcionarios || [];
        if (!equipe.length) {
          temDados.value = false;
          return;
        }

        temDados.value = true;

        // Gera as marcações de hora com intervalos de 30 minutos
        const horasPadrao = [];

        for (let h = 6; h <= 21; h++) {
          horasPadrao.push(`${String(h).padStart(2, "0")}:00`);
        }

        // Exceções específicas
        horasPadrao.splice(horasPadrao.indexOf("11:00") + 1, 0, "11:30");
        horasPadrao.splice(horasPadrao.indexOf("17:00") + 1, 0, "17:30");

        const datasets = equipe.map((func, idx) => {
          // Cria o vetor de dados conforme as horas
          const data = horasPadrao.map((hora) => {
            const producao = func.producaoPorHora?.find((p) => p.hora === hora);
            return producao ? producao.total : 0;
          });

          return {
            label: func.nome,
            data,
            borderColor: cores[idx % cores.length],
            backgroundColor: cores[idx % cores.length] + "30",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#fff",
            pointBorderColor: cores[idx % cores.length],
            pointBorderWidth: 2,
          };
        });

        chart.value = new Chart(chartCanvas.value.getContext("2d"), {
          type: "line",
          data: {
            labels: horasPadrao,
            datasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "nearest", intersect: false },
            plugins: {
              legend: {
                display: true,
                position: "bottom",
                labels: { usePointStyle: true, pointStyle: "circle" },
              },
              tooltip: {
                mode: "index",
                intersect: false,
                backgroundColor: "#004d20",
                bodyColor: "#fff",
                titleColor: "#fff",
                callbacks: {
                  label: (ctx) =>
                    `${ctx.dataset.label}: ${ctx.formattedValue} peças`,
                },
              },
            },
            scales: {
              x: {
                title: { display: true, text: "Hora" },
                grid: { color: "rgba(0,0,0,0.05)" },
                ticks: { maxRotation: 45, minRotation: 45 },
              },
              y: {
                title: { display: true, text: "Peças Produzidas" },
                beginAtZero: true,
                grid: { color: "rgba(0,0,0,0.05)" },
              },
            },
          },
        });
      } catch (err) {
        console.error("Erro ao carregar gráfico:", err);
        temDados.value = false;
      } finally {
        loading.value = false;
      }
    };

    watch(() => props.filtro, fetchData);

    onMounted(() => {
      fetchData();
      socket.value = io("https://acari-tex.onrender.com");
      socket.value.on("nova_producao", fetchData);
    });

    onBeforeUnmount(() => {
      destruirGrafico();
      if (socket.value) socket.value.disconnect();
    });

    return { chartCanvas, temDados, loading };
  },
};
</script>

<style scoped>
.grafico-equipe {
  max-width: 100%;
  margin: 0 auto;
  border-radius: 16px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.grafico-equipe canvas {
  height: 400px !important;
}
</style>
