<template>
  <div class="row align-items-stretch">

    <!-- NOTIFICAÇÕES -->
    <div class="col-12 col-md-4 mb-3">
      <div class="card border-0 shadow-sm h-100 text-start p-3 bg-white">
        <div class="card-body d-flex flex-column p-2">

          <div class="d-flex align-items-center mb-2">
            <i class="bi bi-bell me-2" style="font-size:1.5rem"></i>
            <h6 class="card-title mb-0">Notificações</h6>
          </div>

          <div v-if="loading" class="text-center text-muted small">
            Carregando notificações...
          </div>

          <div v-else-if="notificacoes.length === 0" class="text-center text-muted small">
            Nenhuma notificação no momento.
          </div>

          <div v-else class="notificacoes-list">

            <div v-for="notif in notificacoes" :key="notif.id" class="notificacao-item mb-2 p-2 rounded shadow-sm"
              :class="{ 'bg-light': !notif.lida, 'bg-body-tertiary': notif.lida }">

              <div class="d-flex justify-content-between align-items-start">

                <div>
                  <h6 class="mb-1 fw-semibold small">{{ notif.titulo }}</h6>
                  <p class="mb-1 text-muted very-small">{{ notif.mensagem }}</p>
                  <small class="text-secondary">
                    {{ formatarData(notif.criadaEm) }}
                  </small>
                </div>

                <button v-if="!notif.lida" class="btn btn-sm btn-sm-notif" @click="marcarComoLida(notif.id)">
                  ✔
                </button>

              </div>

            </div>

          </div>

        </div>
      </div>
    </div>

    <!-- DASHBOARD -->
    <div class="col-12 col-md-8 mb-3">
      <div class="card border-0 shadow h-100 p-4 text-start bg-white">

        <div class="card-body">

          <h4 class="card-title mb-4">Indicadores de Produção</h4>

          <div class="row">

            <!-- PRODUÇÃO -->
            <div>
              <div class="grafico-card">
                <h6>Produção Hoje</h6>
                <canvas ref="graficoProducao"></canvas>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>

  </div>
</template>

<script>
import { useAuthStore } from "@/store/store"
import api from "@/Axios"
import Swal from "sweetalert2"
import Chart from "chart.js/auto"

export default {

  name: "ContainersGerais",

  data() {
    return {
      notificacoes: [],
      loading: true,

      resumoProducao: null,

      charts: {
        producao: null,
        funcionarios: null,
        etapas: null
      }
    }
  },

  methods: {

    async carregarNotificacoes() {

      try {

        const store = useAuthStore()
        const token = store.pegar_token

        const response = await api.get("/notificacoes", {
          headers: { Authorization: token }
        })

        this.notificacoes = response.data.notificacoes || []

      } catch (error) {

        console.error("Erro ao carregar notificações:", error)

      } finally {

        this.loading = false

      }

    },

    async marcarComoLida(id) {

      try {

        const store = useAuthStore()
        const token = store.pegar_token

        await api.put(`/notificacoes/${id}/lida`,
          { lida: true },
          { headers: { Authorization: token } }
        )

        Swal.fire({
          icon: "success",
          title: "Notificação marcada como lida!",
          timer: 1200,
          showConfirmButton: false
        })

        this.notificacoes = this.notificacoes.map(n =>
          n.id === id ? { ...n, lida: true } : n
        )

      } catch (error) {

        console.error("Erro ao marcar notificação:", error)

      }

    },

    async carregarResumoProducao() {

      try {

        const store = useAuthStore()
        const token = store.pegar_token

        const response = await api.get("/producao/resumo", {
          headers: { Authorization: token }
        })

        this.resumoProducao = response.data
        console.log("Resumo produção:", this.resumoProducao)
        await this.$nextTick()

        this.criarGraficos()

      } catch (error) {

        console.error("Erro ao carregar resumo produção:", error)

      }

    },

    criarGraficos() {

      if (!this.resumoProducao) return

      const dados = this.resumoProducao

      /* ÚLTIMOS 7 DIAS */

      const diasOrdenados = Object.entries(dados.producaoPorDia || {})
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .slice(-7)

      const labelsDias = diasOrdenados.map(d => this.formatarDataGrafico(d[0]))
      const valoresDias = diasOrdenados.map(d => d[1])


      /* MÉDIA DE PRODUÇÃO */

      const total = valoresDias.reduce((acc, v) => acc + v, 0)
      const media = Math.round(total / valoresDias.length)

      const linhaMedia = labelsDias.map(() => media)


      /* DESTRUIR GRÁFICO ANTIGO */

      if (this.charts.producao) {
        this.charts.producao.destroy()
      }


      /* CRIAR GRÁFICO UNIFICADO */

      this.charts.producao = new Chart(
        this.$refs.graficoProducao.getContext("2d"),
        {
          data: {
            labels: labelsDias,

            datasets: [

              {
                type: "bar",
                label: "Produção diária",
                data: valoresDias,
                backgroundColor: "#0A8A38"
              },

              {
                type: "line",
                label: "Média produção",
                data: linhaMedia,
                borderColor: "#FF9F1C",
                tension: 0.3
              }

            ]
          },

          options: {

            responsive: true,

            plugins: {
              legend: {
                position: "bottom"
              },
              tooltip: {
                callbacks: {
                  footer: (items) => {
                    let total = items.reduce((s, i) => s + i.parsed.y, 0)
                    return "Total: " + total
                  }
                }
              }
            },

            scales: {
              x: {
                ticks: {
                  maxRotation: 45,
                  minRotation: 45
                }
              },
              y: {
                beginAtZero: true
              }
            }

          }

        }
      )

    },
    formatarDataGrafico(data) {
      const [ano, mes, dia] = data.split("-")

      // cria data no horário LOCAL (sem bug de fuso)
      const d = new Date(ano, mes - 1, dia)

      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit"
      })
    },
    formatarData(data) {

      const d = new Date(data)

      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      })

    }

  },

  mounted() {

    this.carregarNotificacoes()
    this.carregarResumoProducao()

  }

}
</script>
<style scoped>
.notificacoes-list {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

.notificacao-item {
  background: #f9f9f9;
  border-left: 3px solid var(--verde-escuro);
  font-size: .85rem;
  transition: .2s;
}

.notificacao-item:hover {
  background: #eef5ff;
}

.btn-sm-notif {
  border-radius: 6px;
  font-size: .7rem;
  background: var(--verde-escuro);
  color: white;
  padding: .25rem .4rem;
}

.btn-sm-notif:hover {
  background: #076d00;
}

.very-small {
  font-size: .75rem;
}

.grafico-card {
  background: #fafafa;
  border-radius: 10px;
  height: 300px;
}
</style>