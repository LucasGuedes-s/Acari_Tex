<template>
  <div class="grafico-eficiencia">
    <canvas ref="chartCanvas" v-show="temDados" style="width: 100%; height: 100%;"></canvas>
    <p v-if="!temDados" class="sem-dados">Sem dados para o período selecionado</p>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import Chart from 'chart.js/auto';
import { useAuthStore } from '@/store/store';
import api from '@/Axios';
import { io } from 'socket.io-client';

export default {
  name: 'GraficoEficiencia',
  props: { filtro: { type: String, default: 'hoje' } },
  setup(props) {
    const chartCanvas = ref(null);
    const chartInstance = ref(null);
    const store = useAuthStore();
    const socket = ref(null);
    const temDados = ref(false);

    const cores = [
      '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6',
      '#EC4899','#14B8A6','#6366F1','#84CC16','#FB923C'
    ];

    const destruirGrafico = () => {
      if (chartInstance.value) {
        chartInstance.value.destroy();
        chartInstance.value = null;
      }
    };

    const fetchData = async () => {
      try {
        destruirGrafico();
        const token = store.pegar_token;
        const res = await api.get('/producao/equipe', {
          headers: { Authorization: token },
          params: { filtro: props.filtro }
        });

        const producaoDia = res.data.producao?.producaoDia;
        const funcionarios = producaoDia?.funcionarios || [];

        if (!funcionarios.length) {
          temDados.value = false;
          return;
        }

        temDados.value = true;

        // espera o canvas existir
        if (!chartCanvas.value) return;

        const eficienciaMediaTurma = parseFloat(producaoDia.eficienciaMediaTurma) || 0;
        const nomes = funcionarios.map(f => f.nome);
        const eficiencias = funcionarios.map(f => parseFloat(f.eficiencia_pessoal));

        chartInstance.value = new Chart(chartCanvas.value.getContext('2d'), {
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
      } catch (err) {
        console.error('Erro ao carregar gráfico de eficiência:', err);
        temDados.value = false;
        destruirGrafico();
      }
    };

    onMounted(() => {
      fetchData();
      socket.value = io('https://acari-tex.onrender.com');
      socket.value.on('nova_producao', fetchData);
    });

    onBeforeUnmount(() => {
      destruirGrafico();
      if (socket.value) socket.value.disconnect();
    });

    watch(() => props.filtro, fetchData);

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
