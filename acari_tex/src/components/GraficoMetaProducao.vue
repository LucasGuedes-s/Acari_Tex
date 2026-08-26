<template>
  <div class="grafico-meta-producao">
    <div class="grafico-header">
      <div>
        <h4 class="grafico-titulo">Meta × Produção por Dia</h4>
        <p class="grafico-subtitulo">Compare diariamente a produção realizada com a meta prevista.</p>
      </div>
      <div v-if="diasComMeta.length" class="grafico-resumo">
        <span class="resumo-badge" :class="resumoBadgeClass">
          Dias com meta atingida: {{ diasAtingidos }} de {{ diasComMeta.length }}
        </span>
      </div>
    </div>

    <div class="grafico-container">
      <canvas ref="chartCanvas" v-show="temDados"></canvas>
      <p v-if="!temDados && !loading" class="sem-dados">
        Sem dados de meta e produção disponíveis.
      </p>
      <p v-if="loading" class="sem-dados">
        Carregando dados...
      </p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Chart from 'chart.js/auto'
import api from '@/Axios'
import { useAuthStore } from '@/store/store'

/**
 * Regra de etapa final — idêntica à usada em producaoCompartilhada.js
 * para determinar se uma etapa representa a conclusão da peça.
 * Uma peça que passou por Corte → Costura → Acabamento → Revisão
 * só deve ser contada UMA vez, na etapa final.
 */
function isEtapaFinal(descricaoEtapa) {
  if (!descricaoEtapa) return false
  const d = descricaoEtapa.toLowerCase()
  if (d.includes('revisão intermediaria') || d.includes('revisao intermediaria')) return false
  return (
    d.includes('final') ||
    d.includes('revisão final') || d.includes('revisao final') ||
    d.includes('revisão') || d.includes('revisao') ||
    d.includes('acabamento') || d.includes('qualidade') ||
    d.includes('revisar peça pronta') ||
    d.includes('expedição') || d.includes('expedicao')
  )
}

export default {
  name: 'GraficoMetaProducao',

  props: {
    filtro: { type: String, default: '' },
  },

  setup(props) {
    const chartCanvas = ref(null)
    const chartInstance = ref(null)
    const temDados = ref(false)
    const loading = ref(false)
    const diasComMeta = ref([])
    const diasAtingidos = ref(0)
    const resumoBadgeClass = ref('')

    const destruirGrafico = () => {
      if (chartInstance.value) {
        try { chartInstance.value.destroy() } catch (e) { /* ignore */ }
        chartInstance.value = null
      }
    }

    const formatarDataGrafico = (data) => {
      const [ano, mes, dia] = data.split('-')
      return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }

    const formatarDataCompleta = (data) => {
      const [ano, mes, dia] = data.split('-')
      return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const atualizarGrafico = async () => {
      destruirGrafico()
      temDados.value = false
      loading.value = true

      try {
        const token = useAuthStore().pegar_token
        const res = await api.get('/producao/estabelecimento', {
          headers: { Authorization: `${token}` }
        })

        const producoes = res.data.producao || {}
        const pecas = Object.values(producoes)

        if (!pecas.length) {
          loading.value = false
          return
        }

        // ═══════════════════════════════════════════════════════════
        // REGRA PRINCIPAL: produção conta SOMENTE etapas finais.
        // Uma peça que passou por Corte → Costura → Acabamento → Revisão
        // só é contada UMA vez (na etapa final).
        // ═══════════════════════════════════════════════════════════

        // Para cada OP, consolidar:
        //   - meta (contada 1x por OP, nunca multiplicada)
        //   - produção final (somente etapas finais)
        //   - data (para agrupamento por dia)
        const opConsolidadas = [] // { data, meta, producaoFinal, nomeOp }

        for (const peca of pecas) {
          const metaOp = Number(peca.meta) || 0
          const nomeOp = peca.peca || ''
          const historico = peca.historico || []

          // Separar registros por etapa: verificar quais são finais
          const producaoFinalPorDia = {} // data -> quantidade (só etapas finais)
          const metaJaContada = {} // data -> boolean (meta contada 1x por OP por dia)

          for (const registro of historico) {
            const dataStr = registro.data
            if (!dataStr) continue

            const dataNormalizada = dataStr.includes('T')
              ? dataStr.split('T')[0]
              : dataStr.split(' ')[0]

            if (!dataNormalizada || !/^\d{4}-\d{2}-\d{2}$/.test(dataNormalizada)) continue

            const etapaDescricao = registro.etapa || ''
            const quantidade = Number(registro.quantidade) || 0

            // Contabilizar produção APENAS de etapas finais
            if (isEtapaFinal(etapaDescricao)) {
              if (!producaoFinalPorDia[dataNormalizada]) producaoFinalPorDia[dataNormalizada] = 0
              producaoFinalPorDia[dataNormalizada] += quantidade
            }

            // Meta contada 1x por OP por dia (independente de quantos registros existem)
            if (metaOp > 0 && !metaJaContada[dataNormalizada]) {
              metaJaContada[dataNormalizada] = true
            }
          }

          // Montar consolidação desta OP para cada dia em que ela teve produção final
          const diasComProducao = Object.keys(producaoFinalPorDia)
          const todosDiasOp = new Set([...diasComProducao, ...Object.keys(metaJaContada)])

          for (const dia of todosDiasOp) {
            opConsolidadas.push({
              data: dia,
              nomeOp,
              meta: metaJaContada[dia] ? metaOp : 0,
              producaoFinal: producaoFinalPorDia[dia] || 0,
            })
          }
        }

        // ═══════════════════════════════════════════════════════════
        // AGRUPAMENTO POR DIA:
        //   Meta do Dia = soma das metas das OPs únicas daquele dia
        //   Produção do Dia = soma das produções finais das OPs do dia
        // ═══════════════════════════════════════════════════════════
        const producaoPorDia = {}
        const metaPorDia = {}

        for (const op of opConsolidadas) {
          if (!producaoPorDia[op.data]) producaoPorDia[op.data] = 0
          if (!metaPorDia[op.data]) metaPorDia[op.data] = 0

          producaoPorDia[op.data] += op.producaoFinal
          metaPorDia[op.data] += op.meta
        }

        // Filtrar apenas dias com produção OU meta, ordenar cronologicamente
        const todosDias = new Set([
          ...Object.keys(producaoPorDia),
          ...Object.keys(metaPorDia)
        ])

        const diasOrdenados = [...todosDias].sort()

        if (!diasOrdenados.length) {
          loading.value = false
          return
        }

        const labels = diasOrdenados.map(formatarDataGrafico)
        const dadosMeta = diasOrdenados.map(d => metaPorDia[d] || 0)
        const dadosProducao = diasOrdenados.map(d => producaoPorDia[d] || 0)

        // Calcular resumo (dias com meta atingida)
        const diasComMetaLocal = []
        let diasAtingidosLocal = 0

        diasOrdenados.forEach((dia, i) => {
          const meta = dadosMeta[i]
          const producao = dadosProducao[i]
          if (meta > 0) {
            diasComMetaLocal.push({ dia, meta, producao })
            if (producao >= meta) diasAtingidosLocal++
          }
        })

        diasComMeta.value = diasComMetaLocal
        diasAtingidos.value = diasAtingidosLocal

        // Badge class
        if (!diasComMetaLocal.length) {
          resumoBadgeClass.value = ''
        } else {
          const pct = (diasAtingidosLocal / diasComMetaLocal.length) * 100
          if (pct >= 80) resumoBadgeClass.value = 'badge-verde'
          else if (pct >= 50) resumoBadgeClass.value = 'badge-amarelo'
          else resumoBadgeClass.value = 'badge-vermelho'
        }

        temDados.value = true
        loading.value = false

        await new Promise(r => setTimeout(r, 50))
        if (!chartCanvas.value) return

        const ctx = chartCanvas.value.getContext('2d')

        chartInstance.value = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Meta',
                data: dadosMeta,
                backgroundColor: 'rgba(209, 213, 219, 0.8)',
                borderColor: 'rgba(156, 163, 175, 1)',
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.7,
                categoryPercentage: 0.7,
              },
              {
                label: 'Produção',
                data: dadosProducao,
                backgroundColor: 'rgba(22, 163, 74, 0.8)',
                borderColor: 'rgba(22, 101, 52, 1)',
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.7,
                categoryPercentage: 0.7,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  usePointStyle: true,
                  pointStyle: 'rectRounded',
                  padding: 20,
                  font: { size: 13 }
                }
              },
              title: { display: false },
              tooltip: {
                backgroundColor: '#fff',
                titleColor: '#1f2937',
                bodyColor: '#374151',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                  title: (items) => {
                    const idx = items[0].dataIndex
                    return `Data: ${formatarDataCompleta(diasOrdenados[idx])}`
                  },
                  afterBody: (items) => {
                    const idx = items[0].dataIndex
                    const meta = dadosMeta[idx]
                    const producao = dadosProducao[idx]

                    if (meta <= 0) {
                      return ['', `Meta: —`, `Produção: ${producao} peças`, 'Atingimento: —']
                    }

                    const diferenca = producao - meta
                    const sinal = diferenca >= 0 ? '+' : ''
                    const atingimento = ((producao / meta) * 100).toFixed(2).replace('.', ',')

                    return [
                      '',
                      `Meta: ${meta} peças`,
                      `Produção: ${producao} peças`,
                      `Diferença: ${sinal}${diferenca} peças`,
                      `Atingimento: ${atingimento}%`
                    ]
                  },
                  label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} peças`
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#6b7280', font: { size: 12 }, maxRotation: 45, minRotation: 45 }
              },
              y: {
                beginAtZero: true,
                grid: { color: '#f3f4f6' },
                ticks: { color: '#6b7280', font: { size: 12 } },
                title: { display: true, text: 'Quantidade (peças)', color: '#6b7280', font: { size: 12 } }
              }
            }
          }
        })

      } catch (e) {
        console.error('Erro ao buscar dados para gráfico Meta × Produção:', e)
        loading.value = false
        temDados.value = false
      }
    }

    watch(() => props.filtro, atualizarGrafico)
    onMounted(atualizarGrafico)
    onBeforeUnmount(destruirGrafico)

    return { chartCanvas, temDados, loading, diasComMeta, diasAtingidos, resumoBadgeClass }
  }
}
</script>

<style scoped>
.grafico-meta-producao {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 24px;
  max-width: 100%;
  margin: 0 auto;
}

.grafico-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.grafico-titulo {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 4px;
}

.grafico-subtitulo {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.grafico-resumo { flex-shrink: 0; }

.resumo-badge {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 999px;
  white-space: nowrap;
}

.badge-verde    { background: #dcfce7; color: #166534; }
.badge-amarelo  { background: #fef3c7; color: #92400e; }
.badge-vermelho { background: #fee2e2; color: #991b1b; }

.grafico-container { height: 350px; position: relative; }

.sem-dados {
  text-align: center;
  color: #9ca3af;
  font-size: 15px;
  padding: 80px 0;
  font-style: italic;
}

@media (max-width: 768px) {
  .grafico-meta-producao { padding: 16px; border-radius: 12px; }
  .grafico-header { flex-direction: column; align-items: flex-start; }
  .grafico-container { height: 280px; overflow-x: auto; }
}
</style>
