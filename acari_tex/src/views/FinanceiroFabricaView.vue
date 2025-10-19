<template>
  <div class="detalhes-pecas-page">
    <SidebarNav />
    <carregandoTela v-if="loading" />

    <main v-else class="content-wrapper flex-grow-1">
      <div class="container-fluid py-4">
        <TituloSubtitulo
          titulo="Relatórios financeiros"
          subtitulo="Acompanhe o progresso e estatísticas financeiras da fábrica"
        />

        <!-- Resumo -->
        <div class="row mt-4">
          <div class="col-md-4 mb-3" v-for="card in resumoCards" :key="card.titulo">
            <div class="card shadow-sm border-0 p-3 text-center bg-white h-100">
              <h6 class="fw-semibold text-secondary">{{ card.titulo }}</h6>
              <h4 class="fw-bold text">R$ {{ card.valor.toLocaleString('pt-BR') }}</h4>
            </div>
          </div>
        </div>

        <div class="card mt-4 shadow-sm border-0 p-3 bg-white" v-if="!loading && relatorio">
        <h6 class="fw-semibold mb-3">Receita por Ordem de Produção (OP)</h6>
        <canvas id="graficoFinanceiro" style="max-height: 400px;"></canvas>
        </div>

      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import { useAuthStore } from '@/store/store';
import TituloSubtitulo from '@/components/TituloSubtitulo.vue';
import carregandoTela from '@/components/carregandoTela.vue';
import Chart from 'chart.js/auto';
import api from '@/Axios';
import router from '@/router';
export default {
  name: 'RelatorioFinanceiro',
  components: { SidebarNav, TituloSubtitulo, carregandoTela },
    setup() {
        const store = useAuthStore();
        return { store };
    },
  data() {
    return {
      loading: true,
      relatorio: null,
      chart: null,
    };
  },
  computed: {
    resumoCards() {
      if (!this.relatorio) return [];
      const r = this.relatorio.resumo;
      return [
        { titulo: 'Receita Realizada 💰', valor: r.total_realizado },
        { titulo: 'Receita Projetada 📈', valor: r.total_projetado },
        { titulo: 'Total Geral 💼', valor: r.total_geral },
      ];
    },
  },
  async mounted() {
    this.verificarAutenticacao();
    await this.carregarRelatorio();
  },
  methods: {
    verificarAutenticacao() {
      const token = this.store.pegar_token;
      const usuario = this.store.pegar_usuario;

      if (!token || !usuario) {
        router.push('/');
      }
    },
    async carregarRelatorio() {
      try {
        this.loading = true;
        const hoje = new Date();
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
        const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
        const token = this.store.pegar_token;
        console.log(token)
        const { data } = await api.get(`/financeiro`, {
          params: { dataInicio: inicio, dataFim: fim },
          headers: { Authorization: `${token}` },
        });

        this.relatorio = data;
        console.log('Relatório financeiro carregado:', this.relatorio);
        this.loading = false;
        this.$nextTick(() => this.criarGrafico());
      } catch (err) {
        console.error('Erro ao carregar relatório financeiro:', err);
      } finally {
        this.loading = false;
      }
    },
    criarGrafico() {
      if (this.chart) this.chart.destroy();
        const ctx = document.getElementById('graficoFinanceiro');
        if (!ctx) {
            console.warn('Canvas não encontrado!');
            return;
        }
      const labels = [
        ...this.relatorio.concluidas.map(op => op.descricao),
        ...this.relatorio.emAndamento.map(op => op.descricao),
      ];

      const realizadas = [
        ...this.relatorio.concluidas.map(op => op.receita_realizada),
        ...this.relatorio.emAndamento.map(op => op.receita_realizada),
      ];

      const projetadas = [
        ...this.relatorio.concluidas.map(() => 0), // Concluídas não têm projeção
        ...this.relatorio.emAndamento.map(op => op.receita_projetada),
      ];

      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Receita Realizada',
              data: realizadas,
              backgroundColor: '#4CAF50',
              stack: 'Stack 0',
            },
            {
              label: 'Receita Projetada',
              data: projetadas,
              backgroundColor: '#81C784',
              stack: 'Stack 0',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
          },
          scales: {
            x: { stacked: true },
            y: { stacked: true, beginAtZero: true },
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
.text{
    color: var(--verde-escuro);
}
@media (max-width: 768px) {

  .content-wrapper {
    padding-left: 0px;
    z-index: 0;
  }
}
</style>
