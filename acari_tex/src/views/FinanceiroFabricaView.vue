<template>
  <div class="detalhes-pecas-page">
    <SidebarNav />

    <!-- loading NÃO destrói o DOM -->
    <carregandoTela v-show="loading" />

    <main v-show="!loading" class="content-wrapper flex-grow-1">
      <div class="container-fluid py-4">

        <TituloSubtitulo titulo="Fluxo de Caixa" subtitulo="Controle de receitas, despesas e saldo" />

        <!-- FILTRO -->
        <div class="row mt-3 g-2">
          <div class="col-md-4">
            <input type="date" v-model="filtros.dataInicio" class="form-control" />
          </div>

          <div class="col-md-4">
            <input type="date" v-model="filtros.dataFim" class="form-control" />
          </div>

          <div class="col-md-4 d-flex align-items-center g-2">
            <button class="btn btn-success w-50" @click="carregarCaixa">
              Aplicar período
            </button>
            <button class="btn btn-success w-50 ms-1" @click="abrirModal">
              + Novo Lançamento
            </button>

          </div>
        </div>

        <!-- RESUMO -->
        <div class="row mt-4">
          <div class="col-md-4 mb-3" v-for="card in resumoCards" :key="card.titulo">
            <div class="card shadow-sm border-0 p-3 text-center h-100">
              <h6 class="text-secondary">{{ card.titulo }}</h6>
              <h4 class="fw-bold" :class="card.classe">
                R$ {{ formatar(card.valor) }}
              </h4>
            </div>
          </div>
        </div>

        <!-- GRÁFICOS -->
        <div class="row mt-4 align-items-stretch">
  <div class="col-md-4 mb-3 d-flex">
    <div class="card p-2 shadow-sm w-100">
      <h6 class="text-center mb-1">Receitas x Despesas</h6>
      <canvas ref="graficoPizza"></canvas>
    </div>
  </div>

  <div class="col-md-8 mb-3 d-flex">
    <div class="card p-2 shadow-sm w-100">
      <h6 class="text-center mb-1">Evolução do Saldo</h6>

      <div class="chart-container-linha">
        <canvas ref="graficoLinha"></canvas>
      </div>
    </div>
  </div>
</div>

        <!-- TABELA DE LANÇAMENTOS -->
        <div class="row mt-4">
          <div class="col-12">
            <div class="card shadow-sm p-3">
              <h6 class="mb-3">Lançamentos</h6>

              <div class="table-responsive">
                <table class="table table-sm table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Categoria</th>
                      <th>Valor</th>
                      <th>Saldo</th>
                      <th>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in caixa" :key="item.id">
                      <td>
                        {{ formatarData(item.data) }}
                      </td>
                      <td>
                        <span class="badge" :class="item.tipo === 'receita'
                          ? 'bg-success'
                          : 'bg-danger'">
                          {{ item.tipo }}
                        </span>
                      </td>
                      <td>{{ item.categoria }}</td>
                      <td>
                        R$ {{ formatar(item.valor) }}
                      </td>
                      <td>
                        R$ {{ formatar(item.saldoRestante) }}
                      </td>
                      <td>{{ item.descricao }}</td>
                    </tr>

                    <tr v-if="caixa.length === 0">
                      <td colspan="6" class="text-center text-muted">
                        Nenhum lançamento encontrado
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
        <div class="modal fade show" tabindex="-1" style="display: block" v-if="mostrarModal">
          <div class="modal-dialog modal-md modal-dialog-centered">
            <div class="modal-content">

              <div class="modal-header">
                <h5 class="modal-title">
                  Novo Lançamento
                </h5>
                <button type="button" class="btn-close" @click="fecharModal"></button>
              </div>

              <div class="modal-body">

                <!-- Tipo -->
                <div class="mb-3">
                  <label class="form-label">Tipo</label>
                  <select class="form-select" v-model="novoLancamento.tipo">
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>

                <!-- Categoria -->
                <div class="mb-3">
                  <label class="form-label">Categoria</label>
                  <input type="text" class="form-control" v-model="novoLancamento.categoria" />
                </div>

                <!-- Valor -->
                <div class="mb-3">
                  <label class="form-label">Valor</label>
                  <input type="number" step="0.01" class="form-control" v-model="novoLancamento.valor" />
                </div>

                <!-- Data -->
                <div class="mb-3">
                  <label class="form-label">Data</label>
                  <input type="date" class="form-control" v-model="novoLancamento.data" />
                </div>

                <!-- Descrição -->
                <div class="mb-3">
                  <label class="form-label">Descrição</label>
                  <textarea class="form-control" rows="2" v-model="novoLancamento.descricao"></textarea>
                </div>

              </div>

              <div class="modal-footer">
                <button class="btn btn-secondary" @click="fecharModal">
                  Cancelar
                </button>

                <button class="btn btn-success" @click="salvarLancamento">
                  Salvar
                </button>
              </div>

            </div>
          </div>
        </div>

        <div class="modal-backdrop fade show" v-if="mostrarModal"></div>

      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue'
import carregandoTela from '@/components/carregandoTela.vue'
import TituloSubtitulo from '@/components/TituloSubtitulo.vue'
import { useAuthStore } from '@/store/store'
import api from '@/Axios'
import Chart from 'chart.js/auto'
import router from '@/router'

export default {
  name: 'RelatorioFinanceiro',

  components: {
    SidebarNav,
    carregandoTela,
    TituloSubtitulo
  },

  setup() {
    const store = useAuthStore()
    return { store }
  },

  data() {
    const hoje = new Date()
    const inicio = new Date()
    inicio.setDate(hoje.getDate() - 6)

    return {
      loading: false,

      filtros: {
        dataInicio: inicio.toISOString().split('T')[0],
        dataFim: hoje.toISOString().split('T')[0]
      },

      caixa: [],
      mostrarModal: false,

      novoLancamento: {
        tipo: 'receita',
        categoria: '',
        valor: null,
        data: new Date().toISOString().split('T')[0],
        descricao: ''
      },
      charts: {
        pizza: null,
        linha: null
      }
    }
  },

  computed: {
    resumoCards() {
      let receitas = 0
      let despesas = 0

      this.caixa.forEach(item => {
        if (item.tipo === 'receita') receitas += item.valor
        if (item.tipo === 'despesa') despesas += item.valor
      })

      const saldoAtual =
        this.caixa.length > 0
          ? this.caixa[0].saldoRestante
          : 0

      return [
        {
          titulo: 'Total de Receitas',
          valor: receitas,
          classe: 'text-success'
        },
        {
          titulo: 'Total de Despesas',
          valor: despesas,
          classe: 'text-danger'
        },
        {
          titulo: 'Saldo Atual',
          valor: saldoAtual,
          classe: saldoAtual >= 0
            ? 'text-success'
            : 'text-danger'
        }
      ]
    }
  },

  mounted() {
    this.verificarAuth()
    this.carregarCaixa()
  },

  methods: {
    verificarAuth() {
      if (!this.store.pegar_token) {
        router.push('/')
      }
    },

    formatar(valor) {
      return Number(valor ?? 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2
      })
    },

    formatarData(data) {
      return new Date(data).toLocaleDateString('pt-BR')
    },
    abrirModal() {
      this.mostrarModal = true
    },

    fecharModal() {
      this.mostrarModal = false
    },

    async salvarLancamento() {
      try {
        await api.post('/fluxo/caixa', this.novoLancamento, {
          headers: {
            Authorization: this.store.pegar_token
          }
        })

        this.fecharModal()
        this.carregarCaixa()

        this.novoLancamento = {
          tipo: 'receita',
          categoria: '',
          valor: null,
          data: new Date().toISOString().split('T')[0],
          descricao: ''
        }

      } catch (err) {
        console.error('Erro ao salvar lançamento', err)
      }
    },
    async carregarCaixa() {
      try {
        this.loading = true

        const { data } = await api.get('/fluxo/caixa', {
          params: this.filtros,
          headers: {
            Authorization: this.store.pegar_token
          }
        })

        this.caixa = data.caixa || []

        await this.$nextTick()
        this.criarGraficoPizza()
        this.criarGraficoLinha()

      } catch (err) {
        console.error('Erro ao carregar caixa:', err)
      } finally {
        this.loading = false
      }
    },

    criarGraficoPizza() {
      if (this.charts.pizza) this.charts.pizza.destroy()

      const ctx = this.$refs.graficoPizza
      if (!ctx) return

      let receitas = 0
      let despesas = 0

      this.caixa.forEach(item => {
        if (item.tipo === 'receita') receitas += item.valor
        if (item.tipo === 'despesa') despesas += item.valor
      })

      this.charts.pizza = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Receitas', 'Despesas'],
          datasets: [{
            data: [receitas, despesas],
            backgroundColor: ['#2e7d32', '#c62828']
          }]
        },
        options: {
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      })
    },

    criarGraficoLinha() {
      if (this.charts.linha) this.charts.linha.destroy()

      const ctx = this.$refs.graficoLinha
      if (!ctx) return

      const dadosOrdenados = [...this.caixa]
        .sort((a, b) =>
          new Date(a.criadoEm) - new Date(b.criadoEm)
        )

      const labels = dadosOrdenados.map(item =>
        new Date(item.criadoEm).toLocaleDateString('pt-BR')
      )

      const saldos = dadosOrdenados.map(
        item => item.saldoRestante
      )

      this.charts.linha = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Saldo do Caixa',
            data: saldos,
            borderColor: '#2e7d32',
            backgroundColor: 'rgba(46,125,50,0.15)',
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: false }
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
}

.card h6 {
  font-size: 0.9rem;
}

.btn {
  margin: 0;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0;
  }
}
</style>
