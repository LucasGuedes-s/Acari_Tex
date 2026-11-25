
<template>
  <div class="grafico-projecao">
    <div class="grafico-header">
      <div>
        <h4>Evolução e projeção da produção</h4>
        <p>
          Produção diária dos últimos 30 dias e projeção para os próximos 7 dias,
          considerando a média histórica de cada dia da semana.
        </p>
      </div>
    </div>

    <div v-if="loading" class="estado-grafico">
      Carregando dados...
    </div>

    <div v-else-if="!temDados" class="estado-grafico">
      Ainda não existem dados suficientes para gerar a projeção.
    </div>

    <div v-else class="grafico-container">
      <canvas ref="canvas"></canvas>
    </div>

    <div v-if="temDados" class="resumo-projecao">
      <div>
        <span>Média diária da projeção</span>
        <strong>{{ formatarNumero(mediaDiaria) }} peças</strong>
      </div>

      <div>
        <span>Projeção para 7 dias</span>
        <strong>{{ formatarNumero(projecaoTotal) }} peças</strong>
      </div>
    </div>

    <small class="observacao">
      A projeção considera a média de produção de cada dia da semana,
      calculada com base nos últimos 30 dias, incluindo dias sem produção.
    </small>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'
import api from '@/Axios'
import { compartilhar, chaveGet } from '@/utils/requestControl'
import { useAuthStore } from '@/store/store'

function dataISO(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(
    data.getDate()
  ).padStart(2, '0')}`
}

function formatarData(data) {
  const [ano, mes, dia] = data.split('-')
  return new Date(Number(ano), Number(mes) - 1, Number(dia))
    .toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })
}

export default {
  name: 'GraficoProjecaoProducao',

  setup() {
    const canvas = ref(null)
    const chart = ref(null)

    const loading = ref(false)
    const temDados = ref(false)

    const mediaDiaria = ref(0)
    const projecaoTotal = ref(0)

    function destruirGrafico() {
      if (chart.value) {
        chart.value.destroy()
        chart.value = null
      }
    }

    function formatarNumero(valor) {
      return Number(valor || 0).toLocaleString('pt-BR', {
        maximumFractionDigits: 0,
      })
    }

    async function carregar() {
      destruirGrafico()
      loading.value = true
      temDados.value = false

      try {
        const token = useAuthStore().pegar_token
        const cabecalho = token && !String(token).startsWith('Bearer')
          ? `Bearer ${token}`
          : token

        const params = { dias: 30 }

        const resposta = await compartilhar(
          chaveGet('/dashboard/producao-evolucao', params),
          () => api.get('/dashboard/producao-evolucao', {
            headers: { Authorization: cabecalho },
            params,
          })
        )

        const historico = resposta.data?.evolucao || []

        const diasComProducao = historico.filter(
          dia => dia.temProducao && Number(dia.quantidadePecas) > 0
        )

        if (!diasComProducao.length) {
          loading.value = false
          return
        }

        // Calcula a média de produção separadamente para cada dia da semana.
        // getDay(): 0 = domingo, 1 = segunda, ..., 6 = sábado.
        const producaoPorDiaSemana = Array.from(
          { length: 7 },
          () => ({
            total: 0,
            quantidadeDias: 0,
          })
        )

        // Percorre os últimos 30 dias do histórico.
        historico.forEach(dia => {
          const data = new Date(`${dia.data}T12:00:00`)
          const diaSemana = data.getDay()

          const quantidade = Number(dia.quantidadePecas || 0)

          producaoPorDiaSemana[diaSemana].total += quantidade
          producaoPorDiaSemana[diaSemana].quantidadeDias++
        })

        // Calcula a média individual de cada dia da semana.
        const mediasPorDiaSemana = producaoPorDiaSemana.map(dia => {
          if (dia.quantidadeDias === 0) return 0

          return dia.total / dia.quantidadeDias
        })

        // Gera os próximos 7 dias e aplica a média correspondente
        // ao dia da semana de cada data futura.
        const ultimaData = historico[historico.length - 1].data
        const dataBase = new Date(`${ultimaData}T12:00:00`)

        const diasFuturos = []

        for (let i = 1; i <= 7; i++) {
          const data = new Date(dataBase)
          data.setDate(dataBase.getDate() + i)

          const diaSemana = data.getDay()

          diasFuturos.push({
            data: dataISO(data),
            quantidadeProjetada: mediasPorDiaSemana[diaSemana],
          })
        }

        // Soma as projeções individuais.
        const totalProjetado = diasFuturos.reduce(
          (total, dia) => total + dia.quantidadeProjetada,
          0
        )

        // Média diária dos próximos 7 dias projetados.
        mediaDiaria.value = totalProjetado / 7
        projecaoTotal.value = totalProjetado

        const labelsHistorico = historico.map(dia =>
          formatarData(dia.data)
        )

        const labelsFuturos = diasFuturos.map(
          dia => formatarData(dia.data)
        )

        const labels = [...labelsHistorico, ...labelsFuturos]

        const producaoReal = [
          ...historico.map(dia => Number(dia.quantidadePecas || 0)),
          ...Array(7).fill(null),
        ]

        // A projeção começa no último ponto real para
        // deixar clara a continuidade entre histórico e estimativa.
        const dadosProjecao = [
          ...Array(historico.length - 1).fill(null),

          // Último valor real para conectar o histórico à projeção.
          Number(historico[historico.length - 1].quantidadePecas || 0),

          // Média específica de cada dia da semana futuro.
          ...diasFuturos.map(dia => dia.quantidadeProjetada),
        ]

        temDados.value = true
        loading.value = false

        await new Promise(resolve => setTimeout(resolve, 50))

        if (!canvas.value) return

        chart.value = new Chart(canvas.value, {
          type: 'line',

          data: {
            labels,

            datasets: [
              {
                label: 'Produção realizada',
                data: producaoReal,
                borderColor: '#0d3927',
                backgroundColor: 'rgba(13, 57, 39, 0.10)',
                borderWidth: 3,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#0d3927',
                fill: true,
                spanGaps: false,
              },
              {
                label: 'Projeção',
                data: dadosProjecao,
                borderColor: '#d97706',
                backgroundColor: '#d97706',
                borderWidth: 2.5,
                borderDash: [7, 5],
                tension: 0,
                pointRadius: 3,
                pointBackgroundColor: '#d97706',
                fill: false,
                spanGaps: false,
              },
            ],
          },

          options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
              mode: 'index',
              intersect: false,
            },

            plugins: {
              legend: {
                position: 'bottom',
              },

              tooltip: {
                callbacks: {
                  label: contexto => {
                    if (contexto.raw === null) return null

                    return `${contexto.dataset.label}: ${
                      formatarNumero(contexto.raw)
                    } peças`
                  },
                },
              },
            },

            scales: {
              x: {
                grid: {
                  display: false,
                },
              },

              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Quantidade de peças',
                },
              },
            },
          },
        })

      } catch (erro) {
        console.error('Erro ao carregar projeção da produção:', erro)
        loading.value = false
        temDados.value = false
      }
    }

    onMounted(carregar)
    onBeforeUnmount(destruirGrafico)

    return {
      canvas,
      loading,
      temDados,
      mediaDiaria,
      projecaoTotal,
      formatarNumero,
      recarregar: carregar,
    }
  },
}
</script>

<style scoped>
.grafico-projecao {
  background: #fff;
  border: 1px solid #e3e8e6;
  border-radius: 14px;
  padding: 22px 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(13, 21, 18, 0.04);
}

.grafico-header h4 {
  font-size: 16.5px;
  font-weight: 700;
  color: #0d3927;
  margin: 0 0 4px;
}

.grafico-header p {
  font-size: 12.5px;
  color: #6b7280;
  margin: 0;
}

.grafico-container {
  position: relative;
  height: 320px;
  margin-top: 20px;
}

.estado-grafico {
  padding: 80px 10px;
  text-align: center;
  color: #8a9791;
}

.resumo-projecao {
  display: flex;
  flex-wrap: wrap;
  gap: 35px;
  margin-top: 18px;
}

.resumo-projecao div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resumo-projecao span {
  color: #6b7280;
  font-size: 12px;
}

.resumo-projecao strong {
  color: #0d3927;
  font-size: 19px;
}

.observacao {
  display: block;
  margin-top: 14px;
  color: #8a9791;
  font-size: 11px;
}

@media (max-width: 576px) {
  .grafico-projecao {
    padding: 16px;
  }

  .grafico-container {
    height: 260px;
  }
}
</style>
