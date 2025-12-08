<template>
  <div class="grafico-producao">
    <!-- FILTROS -->
    <div class="filtros mb-4 p-4 bg-gray-50 rounded-lg shadow-inner">
      <label class="text-lg font-semibold text-green-800 mb-2 block">
        Selecionar Peças:
      </label>

      <select
        v-model="pecasSelecionadas"
        multiple
        class="form-select border-green-500 focus:border-green-700"
        size="5"
      >
        <option class="p-2 hover:bg-green-100" v-for="p in pecas" :key="p.peca" :value="p.peca">
          {{ p.peca }} (Total: {{ p.total }})
        </option>
      </select>

      <p v-if="pecasSelecionadas.length === 0" class="text-sm text-red-500 mt-2">
        Selecione pelo menos uma peça.
      </p>
    </div>

    <!-- GRÁFICO -->
    <div class="grafico-container bg-white p-4 rounded-lg shadow-lg">
      <canvas ref="chartCanvas" v-show="temDados" style="height: 350px;"></canvas>

      <p v-if="!temDados" class="sem-dados">
        Sem dados disponíveis.
      </p>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import Chart from "chart.js/auto";
import api from "@/Axios";
import { useAuthStore } from "@/store/store";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default {
  name: "GraficoProducaoEtapasDestacado",

  setup() {
    const chartCanvas = ref(null);
    const chartInstance = ref(null);

    const pecas = ref([]);
    const pecasSelecionadas = ref([]);
    const temDados = ref(true);

    const CORES_ETAPAS = {
      "Corte": "#ef4444",
      "Costura": "#3b82f6",
      "Acabamento": "#eab308",
      "Qualidade": "#10b981",
      "Expedição": "#8b5cf6",
      "Outro": "#6b7280"
    };

    const formatDate = (date) => new Date(date).toISOString().split("T")[0];

    const destruirGrafico = () => {
      if (chartInstance.value) {
        try { chartInstance.value.destroy(); } catch {
            console.warn("Falha ao destruir instância do gráfico.");
        }
        chartInstance.value = null;
      }
    };

    let debounceTimer = null;

    const atualizarGrafico = () => {
      clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {
        if (!chartCanvas.value) return;

        destruirGrafico();

        if (pecasSelecionadas.value.length === 0) {
          temDados.value = false;
          return;
        }

        const datas = new Set();
        const etapas = new Set();

        pecas.value.forEach((p) => {
          if (pecasSelecionadas.value.includes(p.peca)) {
            p.historico.forEach((h) => {
              datas.add(formatDate(h.data));
              etapas.add(h.etapa || "Outro");
            });
          }
        });

        const labels = Array.from(datas).sort();
        const etapasArray = Array.from(etapas);

        // AGRUPAR DADOS POR ETAPA
        const datasets = etapasArray.map((etapa) => ({
          label: `Etapa: ${etapa}`,
          data: labels.map((d) => {
            let total = 0;
            pecas.value.forEach((p) => {
              if (pecasSelecionadas.value.includes(p.peca)) {
                const reg = p.historico.find(
                  (h) => formatDate(h.data) === d && (h.etapa || "Outro") === etapa
                );
                if (reg) total += reg.quantidade;
              }
            });
            return total;
          }),
          borderColor: CORES_ETAPAS[etapa] || CORES_ETAPAS["Outro"],
          backgroundColor: (CORES_ETAPAS[etapa] || CORES_ETAPAS["Outro"]) + "55",
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
        }));

        chartInstance.value = new Chart(chartCanvas.value.getContext("2d"), {
          type: "line",
          data: { labels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },

            plugins: {
              title: {
                display: true,
                text: "Produção Destacada por Etapas",
                font: { size: 18, weight: "bold" }
              },

              tooltip: {
                callbacks: {
                  label(context) {
                    return `${context.dataset.label}: ${context.raw} peças`;
                  },
                },
              },

              legend: {
                position: "bottom",
                labels: { usePointStyle: true, pointStyle: "circle" },
              },
            },

            scales: {
              x: {
                title: { display: true, text: "Data" },
                ticks: {
                  callback(value) {
                    return format(new Date(this.getLabelForValue(value)), "dd/MM", { locale: ptBR });
                  },
                },
              },
              y: { beginAtZero: true, title: { display: true, text: "Qtd Produzida" } },
            },
          },
        });
      }, 150);
    };

    const fetchData = async () => {
      try {
        const token = useAuthStore().pegar_token;
        const res = await api.get("/producao/estabelecimento", {
          headers: { Authorization: `${token}` },
        });

        pecas.value = Object.values(res.data.producao || {});

        if (pecas.value.length > 0) {
          pecasSelecionadas.value = [pecas.value[0].peca];
          atualizarGrafico();
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        temDados.value = false;
      }
    };

    watch(pecasSelecionadas, atualizarGrafico);

    onMounted(fetchData);
    onBeforeUnmount(() => destruirGrafico());

    return { chartCanvas, pecas, pecasSelecionadas, temDados };
  },
};
</script>

<style scoped>
.grafico-producao { background: #f8fafc; border-radius: 16px; }
.form-select { border-radius: 8px; padding: 10px; min-height: 120px; }
.grafico-container { height: 380px; }
.sem-dados { text-align: center; padding: 40px 0; color: #6b7280; font-style: italic; }
</style>
