<template>
  <div class="grid-container">

    <!-- Pizza Classificação -->
    <div class="grafico-box">
      <canvas ref="classificacaoCanvas"></canvas>
    </div>

    <!-- Barras Verticais - Notas -->
    <div class="grafico-box">
      <canvas ref="notasCanvas"></canvas>
    </div>

    <!-- Linha Temporal 
    <div class="grafico-box-large">
      <canvas ref="linhaCanvas"></canvas>
    </div>-->

  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import Chart from 'chart.js/auto';

export default {
  name: 'GraficosIntercorrencias',

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
      "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
      "#8B5CF6", "#14B8A6", "#F472B6", "#4F46E5"
    ];

    const destruir = () => {
      // Usa encadeamento opcional (?.) para destruir apenas se o gráfico existir
      [chart1, chart2, chart3].forEach(c => c?.destroy());
    };

    const renderizar = () => {
      destruir();

      // --- GRÁFICO 1: Classificação (Pizza) ---
      // CORREÇÃO: Verifica se a prop é um objeto válido antes de tentar usar Object.keys
      if (props.porClassificacao && typeof props.porClassificacao === 'object' && Object.keys(props.porClassificacao).length > 0) {
        chart1 = new Chart(classificacaoCanvas.value, {
          type: "pie",
          data: {
            labels: Object.keys(props.porClassificacao),
            datasets: [{
              data: Object.values(props.porClassificacao),
              backgroundColor: cores
            }]
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

      // --- GRÁFICO 2: Notas (Barras) ---
      // CORREÇÃO: Verifica se a prop é um objeto válido antes de tentar usar Object.keys
      if (props.porNotas && typeof props.porNotas === 'object' && Object.keys(props.porNotas).length > 0) {
        chart2 = new Chart(notasCanvas.value, {
          type: "bar",
          data: {
            labels: Object.keys(props.porNotas),
            datasets: [{
              label: "Quantidade",
              data: Object.values(props.porNotas),
              backgroundColor: ["#3B82F6", "#10B981", "#F59E0B"],
              borderColor: ["#3B82F6", "#10B981", "#F59E0B"],
              borderWidth: 2,
              borderRadius: 10,
              barPercentage: 0.6,
              categoryPercentage: 0.7
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: "Motivos das Intercorrências (Notas) - por minutos perdidos",
                font: { size: 16, weight: "600" }
              },
              legend: { display: false }
            },
            scales: {
              x: {
                ticks: { color: "#444", font: { size: 13 } },
                grid: { display: false }
              },
              y: {
                beginAtZero: true,
                ticks: { color: "#444", font: { size: 12 } }
              }
            }
          }
        });
      }

      // --- GRÁFICO 3: Linha Temporal ---
      // CORREÇÃO: Verifica se a prop é um objeto válido antes de tentar usar Object.keys
      if (props.linhaTemporal && typeof props.linhaTemporal === 'object' && Object.keys(props.linhaTemporal).length > 0) {
        chart3 = new Chart(linhaCanvas.value, {
          type: "line",
          data: {
            labels: Object.keys(props.linhaTemporal),
            datasets: [{
              label: "Perdas por dia (minutos)",
              data: Object.values(props.linhaTemporal),
              borderColor: "#0F5132",
              backgroundColor: "#19875455",
              tension: 0.3
            }]
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

    // Montagem inicial e reatividade
    onMounted(renderizar);
    // O watch garante que o gráfico renderize sempre que os dados (props) mudarem
    watch(props, renderizar, { deep: true });
    onBeforeUnmount(destruir);

    return { classificacaoCanvas, notasCanvas, linhaCanvas };
  }
};
</script>

<style scoped>
.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.grafico-box {
  background: #fff;
  padding: 20px;
  height: 320px;
  border-radius: 14px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.08);
}

.grafico-box-large {
  grid-column: span 2;
  background: #fff;
  padding: 20px;
  height: 360px;
  border-radius: 14px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.08);
}
</style>