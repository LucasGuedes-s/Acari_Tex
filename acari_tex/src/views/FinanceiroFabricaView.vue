<template>
  <div class="detalhes-pecas-page">
    <SidebarNav />
    <carregandoTela v-show="loading" />

    <main v-show="!loading" class="content-wrapper">
      <div class="container-fluid py-4">

        <TituloSubtitulo
          titulo="Fluxo de Caixa"
          subtitulo="Controle de receitas, despesas e saldo"
        />

        <!-- FILTROS -->
        <div class="row mt-3 g-2">
          <div class="col-md-4">
            <input type="date" v-model="filtros.dataInicio" class="form-control" />
          </div>

          <div class="col-md-4">
            <input type="date" v-model="filtros.dataFim" class="form-control" />
          </div>

          <div class="col-md-4 d-flex gap-2">
            <button class="btn btn-success w-50" @click="carregarCaixa">
              Aplicar período
            </button>
            <button class="btn btn-success w-50" @click="abrirModal">
              + Novo Lançamento
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
            <div class="card shadow-sm p-3 text-center h-100">
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

        <!-- TABELA -->
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
                      <td>{{ formatarData(item.data) }}</td>
                      <td>
                        <span
                          class="badge"
                          :class="item.tipo === 'receita'
                            ? 'bg-success'
                            : 'bg-danger'"
                        >
                          {{ item.tipo }}
                        </span>
                      </td>
                      <td>{{ item.categoria }}</td>
                      <td>R$ {{ formatar(item.valor) }}</td>
                      <td>R$ {{ formatar(item.saldoRestante) }}</td>
                      <td>{{ item.descricao }}</td>
                      <td>
                        <button
                          class="deletar-btn btn btn-outline-danger"
                          @click="deletarLancamento(item.id)"
                        >
                          Deletar
                        </button>
                      </td>
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

        <!-- MODAL (FORA DO FLUXO DA TELA) -->
        <div v-if="mostrarModal" class="modal-overlay">
          <div class="modal-box">

            <header class="modal-header">
              <h5>Novo Lançamento</h5>
              <button class="close-btn" @click="fecharModal">×</button>
            </header>

            <section class="modal-body">

              <div class="tipo-toggle">
                <button
                  :class="['tipo-btn', novoLancamento.tipo === 'receita' && 'receita']"
                  @click="novoLancamento.tipo = 'receita'"
                >
                  Receita
                </button>
                <button
                  :class="['tipo-btn', novoLancamento.tipo === 'despesa' && 'despesa']"
                  @click="novoLancamento.tipo = 'despesa'"
                >
                  Despesa
                </button>
              </div>

              <div class="row g-3 mt-2">
                <div class="col-md-6">
                  <label>Nota Fiscal</label>
                  <input class="form-control" v-model="novoLancamento.notaFiscal" />
                </div>

                <div class="col-md-6">
                  <label>Categoria</label>
                  <input class="form-control" v-model="novoLancamento.categoria" />
                </div>

                <div class="col-md-6">
                  <label>Valor</label>
                  <input type="number" step="0.01" class="form-control" v-model="novoLancamento.valor" />
                </div>

                <div class="col-md-6">
                  <label>Data</label>
                  <input type="date" class="form-control" v-model="novoLancamento.data" />
                </div>

                <div class="col-12">
                  <label>Descrição</label>
                  <textarea class="form-control" rows="2" v-model="novoLancamento.descricao"></textarea>
                </div>
              </div>

            </section>

            <footer class="modal-footer">
              <button class="btn btn-outline-secondary" @click="fecharModal">
                Cancelar
              </button>
              <button
                class="btn"
                :class="novoLancamento.tipo === 'receita'
                  ? 'btn-success'
                  : 'btn-danger'"
                @click="salvarLancamento"
              >
                Salvar
              </button>
            </footer>

          </div>
        </div>

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
import Swal from 'sweetalert2'

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
        notaFiscal: '',
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
    async deletarLancamento(id) {
      Swal.fire({
        title: 'Tem certeza?',
        text: 'Essa ação não pode ser desfeita.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, deletar!',
        cancelButtonText: 'Cancelar'
      }).then(async (result) => {
        if (result.isConfirmed) {
          await this.confirmarDelecao(id)
          Swal.fire(
            'Deletado!',
            'O lançamento foi deletado.',
            'success'
          )
        }
      })
    },
    async confirmarDelecao(id) {
      try {
        const response = await api.delete(`/caixa/${id}`, {
          headers: {
            Authorization: this.store.pegar_token
          }
        })
        if (response.status !== 200) {
          throw new Error('Erro ao deletar lançamento')
        }
        await this.carregarCaixa()
      } catch (err) {
        console.error('Erro ao deletar lançamento', err)
        this.carregarCaixa()

      }
    },
    async salvarLancamento() {
      try {
        await api.post('/caixa', this.novoLancamento, {
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
.deletar-btn {
  color: #fff;
  background-color: #c62828;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-box {
  background: #fff;
  width: 100%;
  max-width: 520px;
  border-radius: 10px;
  overflow: hidden;
  animation: scaleIn .2s ease;
}

.modal-header {
  background: linear-gradient(135deg, #2e7d32, #1b5e20);
  color: #fff;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
}

.modal-body {
  padding: 16px;
}

.modal-footer {
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 22px;
  cursor: pointer;
}

.tipo-toggle {
  display: flex;
  gap: 10px;
}

.tipo-btn {
  flex: 1;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-weight: 600;
}

.tipo-btn.receita {
  background: #2e7d32;
  color: #fff;
}

.tipo-btn.despesa {
  background: #c62828;
  color: #fff;
}

@keyframes scaleIn {
  from { transform: scale(.9); opacity: 0 }
  to { transform: scale(1); opacity: 1 }
}
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
