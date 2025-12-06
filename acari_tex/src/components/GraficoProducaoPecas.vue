<template>
  <div class="grafico-producao">
    <div class="filtros mb-4 p-4 bg-gray-50 rounded-lg shadow-inner">
      <label for="pecas-select" class="text-lg font-semibold text-green-800 mb-2 block">
        Selecionar Peças para Comparação:
      </label>

      <select
        id="pecas-select"
        v-model="pecasSelecionadas"
        multiple
        class="form-select border-green-500 focus:border-green-700 transition duration-150 ease-in-out"
        size="5"
      >
        <option
          v-for="p in pecas"
          :key="p.peca"
          :value="p.peca"
          class="p-2 hover:bg-green-100"
        >
          {{ p.peca }} (Total: {{ p.total }})
        </option>
      </select>

      <p v-if="pecas.length > 0 && pecasSelecionadas.length === 0" class="text-sm text-red-500 mt-2">
        Selecione pelo menos uma peça.
      </p>
    </div>

    <div class="grafico-container bg-white p-4 rounded-lg shadow-lg">
      <canvas ref="chartCanvas" v-show="temDados" style="height: 300px;"></canvas>

      <p v-if="!temDados" class="sem-dados">
        Sem dados de produção por peça ou nenhuma peça selecionada.
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
  name: "GraficoProducaoLinhas",

  setup() {
    const chartCanvas = ref(null);
    const chartInstance = ref(null);

    const pecas = ref([]);
    const pecasSelecionadas = ref([]);
    const temDados = ref(false);

    const cores = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

    const formatDate = (date) => new Date(date).toISOString().split("T")[0];

    const destruirGrafico = () => {
      if (chartInstance.value) {
        try {
          chartInstance.value.destroy();
        } catch (e) {
          console.warn("Erro ao destruir gráfico:", e);
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

        temDados.value = true;

        const datas = new Set();
        pecas.value.forEach((p) => {
          if (pecasSelecionadas.value.includes(p.peca)) {
            p.historico.forEach((h) => datas.add(formatDate(h.data)));
          }
        });

        const labels = Array.from(datas).sort();
        //const labels = datas.map(d => format(new Date(d), "dd/MM/yyyy", { locale: ptBR }));

        const datasets = pecas.value
          .filter((p) => pecasSelecionadas.value.includes(p.peca))
          .map((p, i) => ({
            label: p.peca,
            data: labels.map((d) => {
              const reg = p.historico.find((h) => formatDate(h.data) === d);
              return reg ? reg.quantidade : 0;
            }),
            borderColor: cores[i % cores.length],
            backgroundColor: cores[i % cores.length] + "55",
            tension: 0.3,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6,
          }));

        // 🔥 TODAS as animações desativadas
        const animacoesOff = {
          animation: false,
          animations: false,
          transitions: {
            active: { animation: false },
            resize: { animation: false },
          },
        };

        chartInstance.value = new Chart(chartCanvas.value.getContext("2d"), {
          type: "line",
          data: { labels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },

            ...animacoesOff, // <--- aqui desativa tudo

            plugins: {
              legend: {
                position: "bottom",
                labels: { usePointStyle: true, pointStyle: "circle" },
              },
              title: {
                display: true,
                text: "Produção Diária de Peças Selecionadas",
                font: { size: 16, weight: "600" },
              },
            },

            scales: {
             x: {
                  title: { display: true, text: "Data" },
                  grid: { display: false },
                  ticks: {
                    callback: function (value) {
                      return format(new Date(this.getLabelForValue(value)), "dd/MM/yyyy", { locale: ptBR });
                    }
                  }
                },
              y: { beginAtZero: true, title: { display: true, text: "Quantidade" } },
            },
          },
        });
      }, 120);
    };

    const fetchData = async () => {
      try {
        const token = useAuthStore().pegar_token;

        const res = await api.get("/producao/estabelecimento", {
          headers: { Authorization: `${token}` },
        });
        console.log('Dados de produção recebidos:', res.data);
        const raw = res.data.producao;

        pecas.value = raw && typeof raw === "object" ? Object.values(raw) : [];

        if (pecas.value.length > 0) {
          if (pecasSelecionadas.value.length === 0) {
            pecasSelecionadas.value = [pecas.value[0].peca];
          }
          temDados.value = true;
          atualizarGrafico();
        } else {
          temDados.value = false;
        }
      } catch (e) {
        console.error("Erro ao buscar dados:", e);
        temDados.value = false;
      }
    };

    watch(pecasSelecionadas, atualizarGrafico, { deep: true });

    onMounted(fetchData);
    onBeforeUnmount(() => {
      destruirGrafico();
      clearTimeout(debounceTimer);
    });

    return { chartCanvas, pecas, pecasSelecionadas, temDados };
  },
};
</script>

<style scoped>
.grafico-producao {
  max-width: 100%;
  margin: 20px auto;
  padding: 0;
  background-color: #f8f9fa;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.filtros {
  display: flex;
  flex-direction: column;
}

.form-select {
  border-radius: 8px;
  padding: 10px;
  min-height: 120px;
}

.grafico-container {
  height: 350px;
}

.sem-dados {
  text-align: center;
  padding: 50px 0;
  color: #6c757d;
  font-size: 16px;
  font-style: italic;
}
</style>
