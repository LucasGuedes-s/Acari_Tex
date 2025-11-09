<template> 
  <CarregandoTela v-if="loading" />
  <div class="grafico-equipe" v-show="temDados && !loading">
    <canvas ref="chartCanvas" style="width: 100%; height: 400px;"></canvas>
  </div>

</template>

<script>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import Chart from 'chart.js/auto';
import { useAuthStore } from '@/store/store';
import api from '@/Axios';
import { io } from 'socket.io-client';
import CarregandoTela from './carregandoTela.vue';

export default {
  name: 'LineEquipeSuave',
  components: { CarregandoTela }, 
  props: {
    filtro: {
      type: String,
      default: 'hoje'
    }
  },
  setup(props) {
    const chartCanvas = ref(null);
    const chart = ref(null);
    const loading = ref(false);
    const store = useAuthStore();
    const socket = ref(null);
    const temDados = ref(false); // controla se o gráfico aparece

    const destruirGrafico = () => {
      if (chart.value) {
        chart.value.destroy();
        chart.value = null;
      }
    };

    const cores = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#6366F1', '#84CC16', '#FB923C'
    ];

    const fetchData = async () => {
      try {
        loading.value = true;
        destruirGrafico();  

        const token = store.pegar_token;
        const res = await api.get('/producao/equipe', {
          headers: { Authorization: token },
          params: { filtro: props.filtro }
        });
        loading.value = false;

        const equipe = res.data.producao?.producaoDia?.funcionarios || [];
        
        if (!equipe.length) {
          temDados.value = false; // não há dados, esconde o gráfico
          return;
        }

        temDados.value = true; // há dados, mostra o gráfico
        loading.value = false;

        const horasPadrao = Array.from({ length: 18 }, (_, i) =>
          String(i + 6).padStart(2, '0') + ':00'
        );

        const datasets = equipe.map((func, idx) => {
          const data = horasPadrao.map(hora => {
            let total = 0;
            if (func.etapas) {
              Object.values(func.etapas).forEach(etapas => {
                etapas.forEach(p => {
                  if (p.hora === hora) total += Number(p.quantidade) || 0;
                });
              });
            }
            return total;
          });

          return {
            label: func.nome,
            data,
            borderColor: cores[idx % cores.length],
            backgroundColor: cores[idx % cores.length] + '30',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderColor: cores[idx % cores.length],
            pointBorderWidth: 2,
          };
        });

        chart.value = new Chart(chartCanvas.value.getContext('2d'), {
          type: 'line',
          data: { labels: horasPadrao, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
              legend: { display: true, position: 'bottom' },
              tooltip: { mode: 'index', intersect: false, backgroundColor: '#004d20', bodyColor: '#fff' }
            },
            scales: {
              x: { title: { display: true, text: 'Hora' }, grid: { color: 'rgba(0,0,0,0.05)' } },
              y: { title: { display: true, text: 'Peças Produzidas' }, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
            }
          }
        });
      } catch (err) {
        console.error('Erro ao carregar gráfico:', err);
        temDados.value = false; // se der erro, também esconde
      }
      finally {
        loading.value = false;
      }
    };

    watch(() => props.filtro, () => {
      fetchData();
    });

    onMounted(() => {
      fetchData();
      socket.value = io('https://acari-tex.onrender.com');
      socket.value.on('nova_producao', fetchData);
    });

    onBeforeUnmount(() => {
      destruirGrafico();
      if (socket.value) socket.value.disconnect();
    });

    return { chartCanvas, temDados };
  }
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
