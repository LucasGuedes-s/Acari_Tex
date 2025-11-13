<template>
  <div class="card shadow-sm p-4 grafico-card">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <select v-model="filtro" class="form-select form-select-sm filtro-select">
        <option value="hoje">Hoje</option>
        <option value="ontem">Ontem</option>
        <option value="antesDeOntem">Antes de Ontem</option>
      </select>
    </div>

    <canvas ref="graficoProducao" v-show="temDados"></canvas>
    <p v-if="!temDados" class="sem-dados">Sem dados de produção</p>
  </div>
</template>

<script>
import Chart from "chart.js/auto";
import api from "@/Axios";
import { useAuthStore } from "@/store/store";

export default {
  name: "ProducaoPorPecaChart",
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      filtro: "hoje",
      chart: null,
      temDados: false,
      cores: [
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
      ],
    };
  },
  mounted() {
    this.buscarDados();
  },
  watch: {
    filtro() {
      this.buscarDados();
    },
  },
  methods: {
    async buscarDados() {
      try {
        if (this.chart) this.chart.destroy();

        const token = this.store.pegar_token;
        const res = await api.get("producao/pecas", {
          headers: { Authorization: token },
          params: { filtro: this.filtro },
        });

        const producao = res.data?.producao || {};
        const pecas = producao.producaoPecas || [];

        if (!pecas.length) {
          this.temDados = false;
          return;
        }

        this.temDados = true;

        // Labels = nome das peças
        const labels = pecas.map((p) => p.descricaoPeca);

        // Coletar todas as etapas existentes
        const etapasUnicas = [
          ...new Set(pecas.flatMap((p) => p.etapas.map((e) => e.descricao))),
        ];

        // Gerar datasets empilhados por etapa
        const datasets = etapasUnicas.map((etapa, index) => ({
          label: etapa,
          data: pecas.map((p) => {
            const etapaInfo = p.etapas.find((e) => e.descricao === etapa);
            return etapaInfo ? etapaInfo.quantidadeTotal : 0;
          }),
          backgroundColor: this.cores[index % this.cores.length],
          borderRadius: 6,
          stack: "Stack 0",
        }));

        const ctx = this.$refs.graficoProducao.getContext("2d");
        this.chart = new Chart(ctx, {
          type: "bar",
          data: {
            labels,
            datasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: { font: { size: 13, family: "Inter" } },
              },
              title: {
                display: true,
                text: "Peças Produzidas por Etapa",
                color: "#222",
                font: { size: 17, weight: "600" },
              },
              tooltip: {
                callbacks: {
                  label(context) {
                    const etapa = context.dataset.label;
                    const qtd = context.parsed.y;
                    return `${etapa}: ${qtd} peças`;
                  },
                },
              },
            },
            interaction: { mode: "index", intersect: false },
            scales: {
              x: {
                stacked: true,
                grid: { display: false },
                ticks: { font: { size: 12, family: "Inter" } },
              },
              y: {
                stacked: true,
                beginAtZero: true,
                title: { display: true, text: "Quantidade Produzida" },
              },
            },
          },
        });
      } catch (error) {
        console.error("Erro ao carregar gráfico de produção por peça:", error);
        this.temDados = false;
      }
    },
  },
};
</script>

<style scoped>
.grafico-card {
  border-radius: 12px;
  background-color: #fff;
  min-height: 380px;
  position: relative;
  margin: 20px auto;
}
.sem-dados {
  text-align: center;
  color: #777;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.filtro-select {
  width: 160px;
  font-size: 14px;
}
canvas {
  width: 100% !important;
  height: 320px !important;
}
</style>
