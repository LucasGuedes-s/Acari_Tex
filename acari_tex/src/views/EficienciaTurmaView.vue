<template>
  <div class="detalhes-pecas-page">
    <SidebarNav />
    <carregandoTela v-if="loading" />

    <main v-else class="content-wrapper flex-grow-1">
      <div class="container-fluid py-4">
        <TituloSubtitulo
          titulo="Relatório de Eficiência"
          subtitulo="Acompanhe o desempenho produtivo das turmas"
        />

        <!-- 🔹 Campos de entrada -->
        <div class="card shadow-sm border-0 p-3 bg-white mt-4">
          <h6 class="fw-semibold mb-3">Calcular eficiência</h6>
          <div class="row g-3">
            <div class="col-md-3 col-6">
              <label class="form-label fw-semibold">Minutos disponíveis</label>
              <input v-model.number="form.minutosDisponiveis" type="number" class="form-control" placeholder="480" />
            </div>
            <div class="col-md-3 col-6">
              <label class="form-label fw-semibold">Pessoas</label>
              <input v-model.number="form.quantidadePessoas" type="number" class="form-control" placeholder="10" />
            </div>
            <div class="col-md-3 col-6">
              <label class="form-label fw-semibold">Tempo padrão (min)</label>
              <input v-model.number="form.tempoPadraoPeca" type="number" class="form-control" placeholder="5" />
            </div>
            <div class="col-md-3 col-6">
              <label class="form-label fw-semibold">Quantidade produzida</label>
              <input v-model.number="form.quantidadeProduzida" type="number" class="form-control" placeholder="800" />
            </div>
          </div>
          <div class="text-end mt-3">
            <button @click="calcularEficiencia" class="btn btn-success px-4">
              Calcular
            </button>
          </div>
        </div>

        <!-- 🔹 Cards resumo -->
        <div class="row mt-4">
          <div class="col-md-4 mb-3" v-for="card in resumoCards" :key="card.titulo">
            <div class="card shadow-sm border-0 p-3 text-center bg-white h-100">
              <h6 class="fw-semibold text-secondary">{{ card.titulo }}</h6>
              <h4 class="fw-bold text">{{ card.valor }} {{ card.sufixo }}</h4>
            </div>
          </div>
        </div>

        <!-- 🔹 Gráfico -->
        <div class="card mt-4 shadow-sm border-0 p-3 bg-white" v-if="chartData">
          <h6 class="fw-semibold mb-3">Eficiência por Turma</h6>
          <canvas id="graficoEficiencia" style="max-height: 400px;"></canvas>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import TituloSubtitulo from '@/components/TituloSubtitulo.vue';
import carregandoTela from '@/components/carregandoTela.vue';
import Chart from 'chart.js/auto';

export default {
  name: 'RelatorioEficiencia',
  components: { SidebarNav, TituloSubtitulo, carregandoTela },

  data() {
    return {
      loading: false,
      chart: null,
      chartData: null,
      form: {
        minutosDisponiveis: null,
        quantidadePessoas: null,
        tempoPadraoPeca: null,
        quantidadeProduzida: null,
      },
    };
  },

  computed: {
    resumoCards() {
      if (!this.chartData) return [];
      const { producao100, eficiencia } = this.chartData;
      return [
        { titulo: 'Produção 100%', valor: producao100.toFixed(0), sufixo: ' peças' },
        { titulo: 'Quantidade Produzida', valor: this.form.quantidadeProduzida, sufixo: ' peças' },
        { titulo: 'Eficiência', valor: eficiencia.toFixed(1), sufixo: '%' },
      ];
    },
  },

  methods: {
    calcularEficiencia() {
      const { minutosDisponiveis, quantidadePessoas, tempoPadraoPeca, quantidadeProduzida } = this.form;

      if (!minutosDisponiveis || !quantidadePessoas || !tempoPadraoPeca || !quantidadeProduzida) {
        alert('Por favor, preencha todos os campos antes de calcular.');
        return;
      }

      const producao100 = (minutosDisponiveis * quantidadePessoas) / tempoPadraoPeca;
      const eficiencia = (quantidadeProduzida / producao100) * 100;

      this.chartData = { producao100, eficiencia };
      this.$nextTick(() => this.criarGrafico(eficiencia));
    },

    criarGrafico(eficiencia) {
      if (this.chart) this.chart.destroy();
      const ctx = document.getElementById('graficoEficiencia');
      if (!ctx) return;

      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Eficiência da Turma'],
          datasets: [
            {
              label: 'Eficiência (%)',
              data: [eficiencia],
              backgroundColor: eficiencia >= 100 ? '#28a745' : '#ffc107',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, max: 150, title: { display: true, text: 'Eficiência (%)' } },
          },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `${ctx.parsed.y.toFixed(1)}%` } },
          },
        },
      });
    },
  },
};
</script>

<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
}

.card h6 {
  font-size: 0.9rem;
}

.card h4 {
  color: var(--verde-escuro);
}

.text {
  color: var(--verde-escuro);
}

@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0;
  }
}
</style>
