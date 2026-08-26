<template>
  <div class="grafico-meta-producao">
    <div class="grafico-header">
      <div>
        <h4 class="grafico-titulo">Meta × Produção por Dia</h4>
        <p class="grafico-subtitulo">Últimos 30 dias com atividade · produção considera apenas etapas finais.</p>
      </div>
      <div v-if="diasComMeta.length" class="grafico-resumo">
        <span class="resumo-badge" :class="resumoBadgeClass">
          {{ diasAtingidos }} de {{ diasComMeta.length }} dias com meta atingida
        </span>
        <span class="resumo-sub">
          {{ formatarNumero(metaTotalPeriodo) }} peças de meta · {{ formatarNumero(producaoTotalPeriodo) }} produzidas
        </span>
      </div>
    </div>

    <div class="grafico-container">
      <div v-if="loading" class="skeleton-chart">
        <div class="sk-bar" v-for="n in 14" :key="n" :style="{ height: alturaSkeleton(n) + '%' }"></div>
      </div>
      <canvas v-show="!loading && temDados" ref="chartCanvas"></canvas>
      <p v-if="!loading && !temDados" class="sem-dados">
        Sem dados de meta e produção nos últimos 30 dias.
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

const DIAS_JANELA = 30

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
    const metaTotalPeriodo = ref(0)
    const producaoTotalPeriodo = ref(0)

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

    const formatarNumero = (n) => Number(n || 0).toLocaleString('pt-BR')

    const alturaSkeleton = (n) => {
      // Alturas pseudo-aleatórias, mas estáveis (sem Math.random) para o skeleton.
      const padrao = [40, 65, 50, 80, 35, 60, 45, 90, 55, 70, 30, 85, 50, 65]
      return padrao[n % padrao.length]
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
        // REGRA PRINCIPAL (produção): conta SOMENTE etapas finais.
        // Uma peça que passou por Corte → Costura → Acabamento → Revisão
        // só é contada UMA vez (na etapa final).
        //
        // REGRA PRINCIPAL (meta) — CORRIGIDA:
        // A meta de uma OP é um valor ÚNICO (o alvo total daquela OP),
        // não um alvo diário. Portanto ela deve entrar no gráfico UMA
        // ÚNICA VEZ, nunca repetida em todos os dias em que a OP teve
        // QUALQUER lançamento (essa era a causa da meta aparecer
        // "muito alta": uma OP com atividade em 5 dias diferentes tinha
        // sua meta inteira somada 5 vezes).
        //
        // A meta é atribuída ao dia em que a OP teve sua MAIOR produção
        // final (indicando que foi ali que a OP efetivamente "fechou"
        // ou teve seu principal resultado). Se a OP ainda não teve
        // nenhuma etapa final registrada, a meta é atribuída ao último
        // dia de atividade, para continuar visível no gráfico enquanto
        // a OP está em andamento.
        // ═══════════════════════════════════════════════════════════

        const opConsolidadas = [] // { data, meta, producaoFinal }

        for (const peca of pecas) {
          const metaOp = Number(peca.meta) || 0
          const historico = peca.historico || []

          const producaoFinalPorDia = {} // data -> quantidade (só etapas finais)
          let ultimoDiaAtividade = null

          for (const registro of historico) {
            const dataStr = registro.data
            if (!dataStr) continue

            const dataNormalizada = dataStr.includes('T')
              ? dataStr.split('T')[0]
              : dataStr.split(' ')[0]

            if (!dataNormalizada || !/^\d{4}-\d{2}-\d{2}$/.test(dataNormalizada)) continue

            const etapaDescricao = registro.etapa || ''
            const quantidade = Number(registro.quantidade) || 0

            if (isEtapaFinal(etapaDescricao)) {
              producaoFinalPorDia[dataNormalizada] = (producaoFinalPorDia[dataNormalizada] || 0) + quantidade
            }

            if (!ultimoDiaAtividade || dataNormalizada > ultimoDiaAtividade) {
              ultimoDiaAtividade = dataNormalizada
            }
          }

          // Dia de referência da meta: o dia de MAIOR produção final
          // desta OP. Empate resolvido pelo primeiro encontrado.
          let diaReferenciaMeta = null
          let maiorProducaoFinal = -1
          for (const [dia, qtd] of Object.entries(producaoFinalPorDia)) {
            if (qtd > maiorProducaoFinal) {
              maiorProducaoFinal = qtd
              diaReferenciaMeta = dia
            }
          }
          if (!diaReferenciaMeta) diaReferenciaMeta = ultimoDiaAtividade

          // Conjunto de dias que esta OP contribui para o gráfico: todo
          // dia com produção final + o dia de referência da meta (caso
          // ainda não esteja incluso).
          const diasDaOp = new Set(Object.keys(producaoFinalPorDia))
          if (diaReferenciaMeta) diasDaOp.add(diaReferenciaMeta)

          for (const dia of diasDaOp) {
            opConsolidadas.push({
              data: dia,
              meta: (metaOp > 0 && dia === diaReferenciaMeta) ? metaOp : 0,
              producaoFinal: producaoFinalPorDia[dia] || 0,
            })
          }
        }

        // ═══════════════════════════════════════════════════════════
        // AGRUPAMENTO POR DIA:
        //   Meta do Dia = soma das metas (já únicas por OP) do dia
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

        const todosDias = new Set([
          ...Object.keys(producaoPorDia),
          ...Object.keys(metaPorDia)
        ])

        // Limitar aos últimos 30 dias com dados (não 30 dias corridos
        // do calendário — 30 dias mais recentes que efetivamente têm
        // produção e/ou meta registrada).
        const diasOrdenados = [...todosDias].sort().slice(-DIAS_JANELA)

        if (!diasOrdenados.length) {
          loading.value = false
          return
        }

        const labels = diasOrdenados.map(formatarDataGrafico)
        const dadosMeta = diasOrdenados.map(d => metaPorDia[d] || 0)
        const dadosProducao = diasOrdenados.map(d => producaoPorDia[d] || 0)

        // Resumo
        const diasComMetaLocal = []
        let diasAtingidosLocal = 0
        let metaTotal = 0
        let producaoTotal = 0

        diasOrdenados.forEach((dia, i) => {
          const meta = dadosMeta[i]
          const producao = dadosProducao[i]
          producaoTotal += producao
          if (meta > 0) {
            diasComMetaLocal.push({ dia, meta, producao })
            metaTotal += meta
            if (producao >= meta) diasAtingidosLocal++
          }
        })

        diasComMeta.value = diasComMetaLocal
        diasAtingidos.value = diasAtingidosLocal
        metaTotalPeriodo.value = metaTotal
        producaoTotalPeriodo.value = producaoTotal

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

        const gradienteProducao = ctx.createLinearGradient(0, 0, 0, 320)
        gradienteProducao.addColorStop(0, 'rgba(22, 163, 74, 0.95)')
        gradienteProducao.addColorStop(1, 'rgba(22, 163, 74, 0.65)')

        chartInstance.value = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Meta',
                data: dadosMeta,
                backgroundColor: 'rgba(209, 213, 219, 0.55)',
                borderColor: 'rgba(156, 163, 175, 0.9)',
                borderWidth: 1.5,
                borderRadius: 5,
                barPercentage: 0.62,
                categoryPercentage: 0.7,
              },
              {
                label: 'Produção',
                data: dadosProducao,
                backgroundColor: gradienteProducao,
                borderColor: 'rgba(22, 101, 52, 1)',
                borderWidth: 1,
                borderRadius: 5,
                barPercentage: 0.62,
                categoryPercentage: 0.7,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            animation: { duration: 400 },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  usePointStyle: true,
                  pointStyle: 'rectRounded',
                  padding: 18,
                  boxWidth: 10,
                  boxHeight: 10,
                  font: { size: 12.5, weight: '600' },
                  color: '#374151',
                }
              },
              title: { display: false },
              tooltip: {
                backgroundColor: '#fff',
                titleColor: '#0d1512',
                titleFont: { size: 12.5, weight: '700' },
                bodyColor: '#374151',
                bodyFont: { size: 12 },
                borderColor: '#e3e8e6',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                  title: (items) => {
                    const idx = items[0].dataIndex
                    return formatarDataCompleta(diasOrdenados[idx])
                  },
                  afterBody: (items) => {
                    const idx = items[0].dataIndex
                    const meta = dadosMeta[idx]
                    const producao = dadosProducao[idx]

                    if (meta <= 0) {
                      return ['', `Meta: —`, `Produção: ${producao} peças`]
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
                  label: () => null,
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#6b7280', font: { size: 11.5 }, maxRotation: 0, minRotation: 0, autoSkipPadding: 8 }
              },
              y: {
                beginAtZero: true,
                grid: { color: '#f3f4f6' },
                ticks: { color: '#6b7280', font: { size: 11.5 } },
                title: { display: true, text: 'Quantidade (peças)', color: '#9ca3af', font: { size: 11.5, weight: '600' } }
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

    return {
      chartCanvas, temDados, loading, diasComMeta, diasAtingidos,
      resumoBadgeClass, metaTotalPeriodo, producaoTotalPeriodo,
      formatarNumero, alturaSkeleton,
    }
  }
}
</script>

<style scoped>
.grafico-meta-producao {
  background: #fff;
  border: 1px solid #e3e8e6;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(13, 21, 18, 0.04);
  padding: 22px 24px 20px;
  max-width: 100%;
  margin: 0 auto;
}

.grafico-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 14px;
}

.grafico-titulo {
  font-size: 16.5px;
  font-weight: 700;
  color: #0d1512;
  margin: 0 0 3px;
  letter-spacing: -.01em;
}

.grafico-subtitulo {
  font-size: 12.5px;
  color: #6b7f79;
  margin: 0;
}

.grafico-resumo {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.resumo-badge {
  display: inline-flex;
  align-items: center;
  font-size: 12.5px;
  font-weight: 700;
  padding: 5px 13px;
  border-radius: 999px;
  white-space: nowrap;
}

.badge-verde    { background: #dcfce7; color: #166534; }
.badge-amarelo  { background: #fef3c7; color: #92400e; }
.badge-vermelho { background: #fee2e2; color: #991b1b; }

.resumo-sub {
  font-size: 11px;
  color: #9ca3af;
  white-space: nowrap;
}

.grafico-container { height: 340px; position: relative; }

.sem-dados {
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  padding: 90px 0;
  font-style: italic;
}

/* SKELETON */
.skeleton-chart {
  height: 100%;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 0 4px 24px;
}
.sk-bar {
  flex: 1;
  border-radius: 5px 5px 0 0;
  background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
  animation: sk-pulse 1.3s ease-in-out infinite;
}
@keyframes sk-pulse {
  0%, 100% { opacity: .6; }
  50% { opacity: 1; }
}

@media (max-width: 768px) {
  .grafico-meta-producao { padding: 16px; border-radius: 12px; }
  .grafico-header { flex-direction: column; align-items: flex-start; }
  .grafico-resumo { align-items: flex-start; }
  .grafico-container { height: 280px; overflow-x: auto; }
}
</style>