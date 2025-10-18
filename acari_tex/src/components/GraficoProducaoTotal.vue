<template>
  <div class="grafico-equipe">
    <canvas ref="chartCanvas" style="width: 100%; height: 400px; background-color: white;"></canvas>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import Chart from 'chart.js/auto';
import { useAuthStore } from '@/store/store';
import api from '@/Axios';
import { io } from 'socket.io-client';

export default {
  name: 'LineUsersBarMedia',
  setup() {
    const chartCanvas = ref(null);
    const chart = ref(null);
    const store = useAuthStore();
    const socket = ref(null);

    // Paleta de cores
    const cores = [
      '#004d20', '#3366CC', '#DC3912', '#FF9900', '#109618',
      '#990099', '#3B3EAC', '#0099C6', '#DD4477', '#66AA00',
      '#B82E2E', '#006400', '#008000', '#228B22', '#2E8B57',
      '#3CB371', '#32CD32', '#00FF7F', '#66CDAA', '#20B2AA',
      '#9ACD32', '#ADFF2F', '#7FFF00', '#98FB98', '#90EE90',
      '#1E90FF', '#4682B4', '#5F9EA0', '#87CEEB', '#8A2BE2',
      '#9370DB', '#BA55D3', '#DA70D6', '#FF4500', '#FF6347',
      '#FF7F50', '#FFD700', '#FFA500', '#FFE135', '#F0E68C'
    ];

    const fetchData = async () => {
      try {
        const token = store.pegar_token;
        const res = await api.get('/producao/equipe', { headers: { Authorization: token } });
        const equipe = res.data.producao.producaoDia;

        // Horas de 06:00 a 23:00
        const horasPadrao = Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, '0') + ':00');

        const nomes = equipe.map(f => f.nome);
        const datasets = [];

        // Linha para cada funcionário
        nomes.forEach((nome, idx) => {
          const data = horasPadrao.map(hora => {
            let total = 0;
            const funcionario = equipe[idx];
            if (funcionario.etapas) {
              Object.values(funcionario.etapas).forEach(etapaArray => {
                total += etapaArray
                  .filter(p => p.hora === hora)
                  .reduce((sum, p) => sum + (Number(p.quantidade) || 0), 0);
              });
            }
            return total;
          });

          datasets.push({
            type: 'line',
            label: nome,
            data,
            borderColor: cores[idx % cores.length],
            backgroundColor: cores[idx % cores.length],
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 0, // remove os pontos
          });
        });

        // Barras da média
        const mediaData = horasPadrao.map((_, i) => {
          const soma = datasets.reduce((acc, ds) => acc + ds.data[i], 0);
          return datasets.length ? soma / datasets.length : 0;
        });

        datasets.push({
          type: 'bar',
          label: 'Média',
          data: mediaData,
          backgroundColor: 'rgba(0, 141, 59, 0.3)', // cor mais clara
          borderColor: '#008d3b',
          borderWidth: 1,
          stack: 'media'
        });

        if (chart.value) chart.value.destroy();
        chart.value = new Chart(chartCanvas.value.getContext('2d'), {
          data: { labels: horasPadrao, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              tooltip: { mode: 'index', intersect: false },
              legend: {
                display: true,
                onClick: (e, legendItem, legend) => {
                  const ci = legend.chart;
                  const index = legendItem.datasetIndex;
                  const meta = ci.getDatasetMeta(index);
                  meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
                  ci.update();
                }
              }
            },
            scales: {
              x: { stacked: true, title: { display: true, text: 'Hora' } },
              y: { stacked: false, title: { display: true, text: 'Peças Produzidas' }, beginAtZero: true }
            }
          }
        });

      } catch (err) {
        console.error('Erro ao carregar gráfico:', err);
      }
    };

    onMounted(() => {
      fetchData();
      socket.value = io('https://acari-tex.onrender.com');
      socket.value.on('nova_producao', () => fetchData());
    });

    return { chartCanvas };
  }
};
</script>

<style scoped>
.grafico-equipe {
  max-width: 100%;
  margin: 0 auto;
  border-radius: 8px;
}
GChart{
  border-radius: 8px;
  background-color: aquamarine;
}
</style>  