<template>
  <div class="detalhes-pecas-page">
    <SidebarNav />

    <!-- loading NÃO destrói o DOM -->
    <carregandoTela v-show="loading" />

    <main v-show="!loading" class="content-wrapper flex-grow-1">
      <div class="container-fluid py-4">

        <TituloSubtitulo
          titulo="Relatórios Financeiros"
          subtitulo="Visão geral da produção e faturamento"
        />

        <!-- FILTRO -->
        <div class="row mt-3 g-2">
          <div class="col-md-4">
            <input type="date" v-model="filtros.dataInicio" class="form-control" />
          </div>
          <div class="col-md-4">
            <input type="date" v-model="filtros.dataFim" class="form-control" />
          </div>
          <div class="col-md-4">
            <button class="btn btn-success w-100" @click="carregarRelatorio">
              Aplicar período
            </button>
          </div>
        </div>

        <!-- RESUMO -->
        <div class="row mt-4">
          <div
            class="col-md-4 mb-3"
            v-for="card in resumoCards"
            :key="card.titulo"
          >
            <div class="card shadow-sm border-0 p-3 text-center h-100">
              <h6 class="text-secondary">{{ card.titulo }}</h6>
              <h4 class="fw-bold text-success">
                R$ {{ formatar(card.valor) }}
              </h4>
            </div>
          </div>
        </div>
        <!-- PRODUÇÃO DE HOJE -->
        <div class="row mt-3">
          <div class="col-md-6 mb-3">
            <div class="card shadow-sm border-0 p-3 text-center h-100">
              <h6 class="text-secondary">Peças Finalizadas Hoje</h6>
              <h4 class="fw-bold text-primary">
                {{ relatorio.hoje.quantidade_etapa_final }}
              </h4>
            </div>
          </div>

          <div class="col-md-6 mb-3">
            <div class="card shadow-sm border-0 p-3 text-center h-100">
              <h6 class="text-secondary">Receita Produzida Hoje</h6>
              <h4 class="fw-bold text-success">
                R$ {{ formatar(relatorio.hoje.receita_produzida) }}
              </h4>
            </div>
          </div>
        </div>
        <!-- GRÁFICOS -->
        <div class="row mt-4">
          <div class="col-md-6 mb-3">
            <div class="card p-3 shadow-sm">
              <h6 class="text-center mb-2">Distribuição da Receita</h6>
              <canvas ref="graficoPizza" height="300"></canvas>
            </div>
          </div>

          <div class="col-md-6 mb-3">
            <div class="card p-3 shadow-sm">
              <h6 class="text-center mb-2">
                Receita por Ordem de Produção
              </h6>
              <canvas ref="graficoLinha" height="300"></canvas>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import carregandoTela from '@/components/carregandoTela.vue';
import TituloSubtitulo from '@/components/TituloSubtitulo.vue';
import { useAuthStore } from '@/store/store';
import api from '@/Axios';
import Chart from 'chart.js/auto';
import router from '@/router';

export default {
  name: 'RelatorioFinanceiro',

  components: {
    SidebarNav,
    carregandoTela,
    TituloSubtitulo
  },

  setup() {
    const store = useAuthStore();
    return { store };
  },

  data() {
    const hoje = new Date();
    const inicio = new Date();
    inicio.setDate(hoje.getDate() - 6);

    return {
      loading: false,

      filtros: {
        dataInicio: inicio.toISOString().split('T')[0],
        dataFim: hoje.toISOString().split('T')[0]
      },

      relatorio: {
        resumo: {
          total_realizado: 0,
          total_projetado: 0,
          total_geral: 0
        },
        hoje: {
          receita_produzida: 0
        },
        ops: []
      },

      charts: {
        pizza: null,
        linha: null
      }
    };
  },

  computed: {
    resumoCards() {
      const r = this.relatorio.resumo;
      return [
        { titulo: 'Receita Realizada', valor: r.total_realizado },
        { titulo: 'Receita Projetada', valor: r.total_projetado },
        { titulo: 'Total Geral', valor: r.total_geral }
      ];
    }
  },

  mounted() {
    this.verificarAuth();
    this.carregarRelatorio();
  },

  methods: {
    verificarAuth() {
      if (!this.store.pegar_token) router.push('/');
    },

    formatar(valor) {
      return Number(valor ?? 0).toLocaleString('pt-BR');
    },

    async carregarRelatorio() {
      try {
        this.loading = true;

        const { data } = await api.get('/financeiro', {
          params: this.filtros,
          headers: {
            Authorization: this.store.pegar_token
          }
        });

        this.relatorio = data;
        console.log(this.relatorio);
        await this.$nextTick();
        this.criarGraficoPizza();
        this.criarGraficoLinha();

      } catch (err) {
        console.error('Erro ao carregar relatório:', err);
      } finally {
        this.loading = false;
      }
    },

    criarGraficoPizza() {
  if (this.charts.pizza) this.charts.pizza.destroy();

  const ctx = this.$refs.graficoPizza;
  if (!ctx) return;

  const { total_realizado, total_projetado } = this.relatorio.resumo;

  this.charts.pizza = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Receita Realizada', 'Receita Projetada'],
      datasets: [{
        data: [total_realizado, total_projetado],
        backgroundColor: ['#2e7d32', '#ffb300']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx =>
              `R$ ${ctx.raw.toLocaleString('pt-BR')}`
          }
        }
      }
    }
  });
},

    criarGraficoLinha() {
      if (this.charts.linha) this.charts.linha.destroy();

      const ctx = this.$refs.graficoLinha;
      if (!ctx) return;

      const labels = this.relatorio.ops.map(op => op.descricao);
      const valores = this.relatorio.ops.map(
        op => Number(op.receita_realizada ?? 0)
      );

      this.charts.linha = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Receita Realizada',
            data: valores,
            borderColor: '#2e7d32',
            backgroundColor: 'rgba(46,125,50,0.15)',
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
  }
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
.btn{
  margin: 0px;
}
@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0;
  }
}
</style>
