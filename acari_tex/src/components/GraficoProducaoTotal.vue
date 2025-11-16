<template>
  <div class="grafico-eficiencia">
    <canvas ref="chartCanvas" v-show="temDados" style="width: 100%; height: 100%;"></canvas>
    <p v-if="!temDados" class="sem-dados">Sem dados para o período selecionado</p>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'; 
import Chart from 'chart.js/auto';

export default {
  name: 'GraficoEficiencia',
  props: {
    filtro: { type: String, default: 'hoje' },
    producaoDados: {
      type: Object,
      default: () => ({ producaoDia: { funcionarios: [] } })
    }
  },
  setup(props) {
    const chartCanvas = ref(null);
    const chartInstance = ref(null);
    const temDados = ref(false);

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

    const destruirGrafico = () => {
      if (chartInstance.value) {
        chartInstance.value.destroy();
        chartInstance.value = null;
      }
    };

    const atualizarGrafico = () => {
      destruirGrafico(); 
      console.log("Atualizando gráfico com filtro:", props.producaoDados);
      const producaoDia = props.producaoDados?.producao?.producaoDia || {};
      const funcionarios = producaoDia?.funcionarios || [];

      if (!producaoDia || !funcionarios.length) {
        temDados.value = false;
        return;
      }

      temDados.value = true;
      setTimeout(() => {
        
        if (!chartCanvas.value) return;

        const ctx = chartCanvas.value.getContext('2d');
        if (!ctx) {
          console.error("Contexto 2D do Canvas não encontrado.");
          return;
        }

        const eficienciaMediaTurma = parseFloat(producaoDia.eficienciaMediaTurma) || 0;
        const nomes = funcionarios.map(f => f.nome);
        const eficiencias = funcionarios.map(f => parseFloat(f.eficiencia_pessoal));

        // Criação do Gráfico
        chartInstance.value = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: nomes,
            datasets: [
              {
                label: 'Eficiência Individual (%)',
                data: eficiencias,
                backgroundColor: nomes.map((_, i) => cores[i % cores.length]),
                borderColor: nomes.map((_, i) => cores[i % cores.length]),
                borderWidth: 2,
                borderRadius: 10,
                barPercentage: 0.6,
                categoryPercentage: 0.7
              },
              {
                type: 'line',
                label: 'Média da Turma (%)',
                data: Array(nomes.length).fill(eficienciaMediaTurma),
                borderColor: '#004d20',
                borderWidth: 2,
                borderDash: [6, 4],
                tension: 0.3,
                fill: false,
                pointRadius: 3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 20, bottom: 10, left: 10, right: 10 } },
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 14, color: '#333' } },
              title: {
                display: true,
                text: 'Eficiência Individual e Média da Turma',
                color: '#222',
                font: { size: 18, weight: '600' },
                padding: { bottom: 20 }
              },
              tooltip: {
                backgroundColor: '#fff',
                titleColor: '#333',
                bodyColor: '#333',
                borderColor: '#ccc',
                borderWidth: 1,
                callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}%` }
              }
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#555', font: { size: 13 } } },
              y: { beginAtZero: true, ticks: { color: '#555', callback: value => value + '%' } }
            }
          }
        });
      }, 0); 
    };

    onMounted(() => {
      atualizarGrafico();
    });

    onBeforeUnmount(() => {
      destruirGrafico();
    });

    watch(
      () => [props.filtro, props.producaoDados],
      atualizarGrafico,
      { deep: true }
    );

    return { chartCanvas, temDados };
  }
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
  height: 280px;
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