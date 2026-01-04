<template>
  <div class="grafico-eficiencia">
    <h4 class="text-center mb-3">Eficiência da Turma por Peça</h4>
    <div style="height: 400px">
      <canvas ref="eficienciaChart"></canvas>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'
import api from '@/Axios'
import { useAuthStore } from '@/store/store'

export default {
  name: 'GraficoEficiencia',
  setup() {
    const eficienciaChart = ref(null)
    let chartInstance = null

    onMounted(async () => {
      try {
        const token = useAuthStore().pegar_token
        const response = await api.get('/eficiencia', {
          headers: { Authorization: `${token}` }
        })
        let dados = response.data

        // Garante que seja sempre um array
        if (!Array.isArray(dados)) {
          if (dados.data) dados = [dados.data]
          else dados = [dados]
        }

        const dadosFormatados = dados.map(item => {
          const d = item.eficiencia?.data || item.data || item
          return {
            descricaoPeca: d.descricaoPeca,
            eficiencia: parseFloat(String(d.eficiencia).replace('%', '')),
            producao100: parseFloat(d.producao100),
            tempoPadraoPeca: d.tempoPadraoPeca,
            minutosDisponiveis: d.minutosDisponiveis,
            quantidadePessoas: d.quantidadePessoas,
            quantidadeProduzida: d.quantidadeProduzida,
            calculadoEm: new Date(d.calculadoEm).toLocaleString('pt-BR')
          }
        })

        const labels = dadosFormatados.map(d => d.descricaoPeca)
        const eficiencia = dadosFormatados.map(d => d.eficiencia)
        const producao100 = dadosFormatados.map(d => d.producao100)
        // Destroi gráfico anterior
        if (chartInstance) chartInstance.destroy()

        const ctx = eficienciaChart.value.getContext('2d')

        chartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Eficiência (%)',
                data: eficiencia,
                backgroundColor: 'rgba(0, 100, 0, 0.8)', // verde escuro
                borderColor: 'rgba(0, 80, 0, 1)',
                borderWidth: 1,
                yAxisID: 'y1'
              },
              {
                label: 'Produção 100%',
                data: producao100,
                type: 'line',
                borderColor: 'rgba(0, 123, 255, 0.7)', // azul claro
                backgroundColor: 'rgba(0, 123, 255, 0.3)',
                borderWidth: 2,
                tension: 0.3,
                yAxisID: 'y2',
                fill: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y1: {
                type: 'linear',
                position: 'left',
                title: { display: true, text: 'Eficiência (%)' },
                beginAtZero: true,
                max: 120
              },
              y2: {
                type: 'linear',
                position: 'right',
                title: { display: true, text: 'Produção 100%' },
                beginAtZero: true,
                grid: { drawOnChartArea: false }
              }
            },
            plugins: {
              legend: { position: 'bottom' },
              tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                  title: items => `Peça: ${items[0].label}`,
                  label: ctx => {
                    const d = dadosFormatados[ctx.dataIndex]
                    if (ctx.dataset.label === 'Eficiência (%)')
                      return `Eficiência: ${d.eficiencia}%`
                    if (ctx.dataset.label === 'Produção 100%')
                      return `Produção 100%: ${d.producao100}`
                  },
                  afterBody: ctx => {
                    const d = dadosFormatados[ctx[0].dataIndex]
                    return [
                      `Tempo Padrão: ${d.tempoPadraoPeca} min`,
                      `Minutos Disponíveis: ${d.minutosDisponiveis}`,
                      `Qtd Pessoas: ${d.quantidadePessoas}`,
                      `Qtd Produzida: ${d.quantidadeProduzida}`,
                      `Calculado em: ${d.calculadoEm}`
                    ]
                  }
                }
              }
            }
          }
        })
      } catch (error) {
        console.error('Erro ao carregar eficiência:', error)
      }
    })

    onBeforeUnmount(() => {
      if (chartInstance) chartInstance.destroy()
    })

    return { eficienciaChart }
  }
}
</script>

<style scoped>
.grafico-eficiencia {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
