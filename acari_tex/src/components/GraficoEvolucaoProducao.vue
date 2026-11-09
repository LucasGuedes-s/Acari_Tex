<template>
  <div class="evolucao-producao">
    <!-- ───────────── Cabeçalho + filtros de período ───────────── -->
    <div class="evolucao-header">
      <div class="evolucao-titulo-bloco">
        <h4 class="evolucao-titulo">Evolução da Produção</h4>
        <p class="evolucao-subtitulo">
          Tempo padrão, tempo de referência e tempo efetivado por dia
          <span v-if="periodoLabel"> · {{ periodoLabel }}</span>
        </p>
      </div>

      <div class="evolucao-filtros">
        <button
          v-for="opcao in periodos"
          :key="opcao.valor"
          class="filtro-pill"
          :class="{ ativo: presetPeriodo === opcao.valor }"
          type="button"
          @click="selecionarPreset(opcao.valor)"
        >
          {{ opcao.label }}
        </button>

        <button
          class="filtro-pill"
          :class="{ ativo: presetPeriodo === 'personalizado' }"
          type="button"
          @click="abrirPersonalizado"
        >
          Personalizado
        </button>
      </div>
    </div>

    <div v-if="presetPeriodo === 'personalizado'" class="periodo-personalizado">
      <label>
        De
        <input v-model="dataInicioCustom" type="date" :max="dataFimCustom || hojeISO" />
      </label>
      <label>
        Até
        <input v-model="dataFimCustom" type="date" :min="dataInicioCustom" :max="hojeISO" />
      </label>
      <button class="botao-aplicar" type="button" :disabled="loading" @click="aplicarPersonalizado">
        Aplicar
      </button>
      <span v-if="erroPeriodo" class="erro-periodo">{{ erroPeriodo }}</span>
    </div>

    <!-- ───────────── Indicadores do período ───────────── -->
    <div class="kpis">
      <div class="kpi">
        <span class="kpi-rotulo">Peças produzidas</span>
        <strong class="kpi-valor">{{ formatarNumero(resumo.totalPecas) }}</strong>
        <span class="kpi-apoio" v-if="resumo.totalPecasApontadas !== resumo.totalPecas">
          {{ formatarNumero(resumo.totalPecasApontadas) }} peças apontadas
        </span>
        <span class="kpi-apoio" v-else>etapas finais</span>
      </div>

      <div class="kpi">
        <span class="kpi-rotulo">Tempo padrão</span>
        <strong class="kpi-valor">{{ formatarHoras(resumo.tempoPadraoTotal) }}</strong>
        <span class="kpi-apoio">previsto pela ficha/OP</span>
      </div>

      <div class="kpi">
        <span class="kpi-rotulo">Tempo de referência</span>
        <strong class="kpi-valor">{{ formatarHoras(resumo.tempoReferenciaTotal) }}</strong>
        <span class="kpi-apoio">desempenho esperado</span>
      </div>

      <div class="kpi">
        <span class="kpi-rotulo">Tempo efetivado</span>
        <strong class="kpi-valor">{{ formatarHoras(resumo.tempoEfetivadoTotal) }}</strong>
        <span class="kpi-apoio">{{ textoJornadaResumo }}</span>
      </div>

      <div class="kpi kpi-destaque">
        <span class="kpi-rotulo">Eficiência · tempo padrão</span>
        <strong class="kpi-valor">{{ formatarPercentual(resumo.eficienciaPadrao) }}</strong>
        <span class="kpi-apoio">padrão ÷ efetivado</span>
      </div>

      <div class="kpi kpi-destaque">
        <span class="kpi-rotulo">Eficiência · referência</span>
        <strong class="kpi-valor">{{ formatarPercentual(resumo.eficienciaReferencia) }}</strong>
        <span class="kpi-apoio">referência ÷ efetivado</span>
      </div>
    </div>

    <!-- ───────────── Aviso de dados incompletos ───────────── -->
    <p v-if="avisos.length" class="aviso-dados">
      <i class="bi bi-info-circle"></i>
      {{ avisos.join(' ') }}
    </p>

    <!-- ───────────── Gráfico ───────────── -->
    <div class="grafico-container">
      <div v-if="loading" class="skeleton-chart">
        <div
          v-for="n in 12"
          :key="n"
          class="sk-bar"
          :style="{ height: alturaSkeleton(n) + '%' }"
        ></div>
      </div>
      <canvas v-show="!loading && temDados" ref="chartCanvas"></canvas>
      <p v-if="!loading && !temDados" class="sem-dados">
        Sem apontamentos de produção no período selecionado.
      </p>
    </div>

    <!-- ───────────── Detalhe do dia selecionado ───────────── -->
    <div v-if="diaSelecionado" class="dia-detalhe">
      <div class="dia-detalhe-topo">
        <strong>{{ formatarDataCompleta(diaSelecionado.data) }}</strong>
        <button class="fechar-detalhe" type="button" @click="limparSelecao" aria-label="Fechar detalhe">
          ×
        </button>
      </div>

      <div class="dia-detalhe-grid">
        <div>
          <span>Peças</span>
          <strong>{{ formatarNumero(diaSelecionado.quantidadePecas) }}</strong>
          <small v-if="diaSelecionado.pecasApontadas !== diaSelecionado.quantidadePecas">
            {{ formatarNumero(diaSelecionado.pecasApontadas) }} apontadas
          </small>
        </div>
        <div>
          <span>Tempo padrão</span>
          <strong>{{ formatarHoras(diaSelecionado.tempoPadrao) }}</strong>
        </div>
        <div>
          <span>Tempo de referência</span>
          <strong>{{ formatarHoras(diaSelecionado.tempoReferencia) }}</strong>
        </div>
        <div>
          <span>Tempo efetivado</span>
          <strong>{{ formatarHoras(diaSelecionado.tempoEfetivado) }}</strong>
          <small>
            {{ textoProfissionais(diaSelecionado) }} × {{ formatarHoras(diaSelecionado.jornadaDia) }}
          </small>
        </div>
        <div>
          <span>Efic. padrão</span>
          <strong>{{ formatarPercentual(diaSelecionado.eficienciaPadrao) }}</strong>
        </div>
        <div>
          <span>Efic. referência</span>
          <strong>{{ formatarPercentual(diaSelecionado.eficienciaReferencia) }}</strong>
        </div>
      </div>

      <p v-if="!diaSelecionado.temProducao" class="dia-aviso">Sem apontamentos neste dia.</p>
      <p
        v-else-if="diaSelecionado.eficienciaReferencia === null"
        class="dia-aviso"
      >
        Sem tempo de referência cadastrado para as produções deste dia — o percentual de referência não é exibido.
      </p>
      <p
        v-else-if="diaSelecionado.eficienciaPadrao === null"
        class="dia-aviso"
      >
        Produções sem tempo padrão cadastrado — o percentual de padrão não é exibido.
      </p>

      <p class="dia-nota">
        Jornada do dia {{ formatarHoras(diaSelecionado.jornadaDia) }} (máx.
        {{ formatarHoras(diaSelecionado.minutosJornada) }}) · {{ textoApontamentos(diaSelecionado) }} ·
        {{ formatarHoras(diaSelecionado.tempoRegistrado) }} registrados nos apontamentos
      </p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'
import api from '@/Axios'
import { compartilhar, chaveGet } from '@/utils/requestControl'
import { useAuthStore } from '@/store/store'

const CORES = {
  padrao: '#0d3927',
  referencia: '#16a34a',
  efetivado: '#d97706',
}

const PERIODOS = [
  { valor: '7', label: 'Últimos 7 dias' },
  { valor: '15', label: '15 dias' },
  { valor: '30', label: '30 dias' },
]

const RESUMO_VAZIO = {
  totalPecas: 0,
  totalPecasApontadas: 0,
  tempoPadraoTotal: 0,
  tempoReferenciaTotal: 0,
  tempoEfetivadoTotal: 0,
  eficienciaPadrao: null,
  eficienciaReferencia: null,
  diasComProducao: 0,
  diasSemProducao: 0,
  referenciaCobertura: null,
}

/** Converte minutos em "12h 30min" (ou "45min" abaixo de 1h). */
function formatarMinutos(valor) {
  const total = Math.round(Number(valor) || 0)
  if (total <= 0) return '0h'
  const horas = Math.floor(total / 60)
  const minutos = total % 60
  if (!horas) return `${minutos}min`
  return minutos ? `${horas}h ${String(minutos).padStart(2, '0')}min` : `${horas}h`
}

/** Minutos → horas decimais (eixo Y do gráfico). */
const paraHoras = minutos => Math.round(((Number(minutos) || 0) / 60) * 100) / 100

function dataISO(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(
    data.getDate()
  ).padStart(2, '0')}`
}

export default {
  name: 'GraficoEvolucaoProducao',

  setup() {
    const chartCanvas = ref(null)
    const chartInstance = ref(null)
    const loading = ref(false)
    const temDados = ref(false)
    const erroPeriodo = ref('')

    const presetPeriodo = ref('7')
    const dataInicioCustom = ref('')
    const dataFimCustom = ref('')

    const periodoLabel = ref('')
    const resumo = ref({ ...RESUMO_VAZIO })
    const evolucao = ref([])
    const diaSelecionado = ref(null)

    const hojeISO = dataISO(new Date())
    const periodos = PERIODOS

    // Avisos honestos sobre dados incompletos (nunca percentual inventado).
    const avisos = computed(() => {
      const lista = []
      const r = resumo.value

      if (!evolucao.value.some(d => d.temProducao)) return lista

      if (r.eficienciaReferencia === null) {
        lista.push('Nenhum tempo de referência cadastrado no período: a eficiência de referência não é exibida.')
      } else if (r.referenciaCobertura !== null && r.referenciaCobertura < 100) {
        lista.push(
          `Tempo de referência cobre ${r.referenciaCobertura}% das peças apontadas; as demais não entram nesse cálculo.`
        )
      }

      if (r.eficienciaPadrao === null) {
        lista.push('Sem tempo padrão cadastrado no período: a eficiência de padrão não é exibida.')
      }

      if (r.diasSemProducao > 0) {
        lista.push(
          r.diasSemProducao === 1
            ? '1 dia sem apontamento no período.'
            : `${r.diasSemProducao} dias sem apontamento no período.`
        )
      }

      return lista
    })

    // Handler nativo do clique: seleciona o dia mais próximo do ponto
    // clicado. Fica no canvas (e não em options.onClick) porque assim funciona
    // também em toques/tablets e em qualquer área próxima da linha.
    let handlerClique = null

    const destruirGrafico = () => {
      if (chartCanvas.value && handlerClique) {
        chartCanvas.value.removeEventListener('click', handlerClique)
      }
      handlerClique = null

      if (chartInstance.value) {
        try {
          chartInstance.value.destroy()
        } catch (e) {
          /* ignore */
        }
        chartInstance.value = null
      }
    }

    const formatarNumero = n => Number(n || 0).toLocaleString('pt-BR')
    const formatarHoras = formatarMinutos
    const formatarPercentual = p => (p === null || p === undefined ? '—' : `${p}%`)

    const formatarDataGrafico = data => {
      const [ano, mes, dia] = data.split('-')
      return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }

    const formatarDataCompleta = data => {
      const [ano, mes, dia] = data.split('-')
      return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    }

    const alturaSkeleton = n => {
      const padrao = [42, 66, 51, 79, 36, 61, 46, 88, 56, 71, 33, 84]
      return padrao[n % padrao.length]
    }

    const parametrosRequisicao = () => {
      if (presetPeriodo.value === 'personalizado') {
        return { dataInicio: dataInicioCustom.value, dataFim: dataFimCustom.value }
      }
      return { dias: Number(presetPeriodo.value) }
    }

    const montarGrafico = async (dias) => {
      const labels = dias.map(d => formatarDataGrafico(d.data))
      const dadosPadrao = dias.map(d => paraHoras(d.tempoPadrao))
      const dadosReferencia = dias.map(d => (d.tempoReferencia > 0 ? paraHoras(d.tempoReferencia) : null))
      const dadosEfetivado = dias.map(d => paraHoras(d.tempoEfetivado))

      await new Promise(r => setTimeout(r, 30))
      if (!chartCanvas.value) return

      const ctx = chartCanvas.value.getContext('2d')

      const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 400 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'line',
              padding: 18,
              boxWidth: 16,
              font: { size: 12.5, weight: '600' },
              color: '#374151',
            },
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
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            callbacks: {
              title: items => {
                const dia = dias[items[0].dataIndex]
                return formatarDataCompleta(dia.data)
              },
              label: item => `${item.dataset.label}: ${formatarMinutos(item.raw * 60)}`,
              afterBody: items => {
                const dia = dias[items[0].dataIndex]
                const linhas = [
                  '',
                  `${formatarNumero(dia.quantidadePecas)} peças concluídas`,
                  `${textoProfissionais(dia)} × ${formatarMinutos(dia.jornadaDia)} de jornada`,
                ]

                if (dia.eficienciaPadrao !== null) {
                  linhas.push(`Eficiência padrão: ${dia.eficienciaPadrao}%`)
                }
                if (dia.eficienciaReferencia !== null) {
                  linhas.push(`Eficiência referência: ${dia.eficienciaReferencia}%`)
                } else if (dia.temProducao) {
                  linhas.push('Eficiência referência: sem referência cadastrada')
                }

                return linhas
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#6b7280',
              font: { size: 11.5 },
              maxRotation: 0,
              minRotation: 0,
              autoSkipPadding: 10,
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            border: { display: false },
            ticks: {
              color: '#6b7280',
              font: { size: 11.5 },
              callback: valor => `${Number(valor).toLocaleString('pt-BR')}h`,
            },
            title: {
              display: true,
              text: 'Horas trabalhadas',
              color: '#9ca3af',
              font: { size: 11.5, weight: '600' },
            },
          },
        },
      }

      chartInstance.value = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Tempo padrão',
              data: dadosPadrao,
              borderColor: CORES.padrao,
              backgroundColor: CORES.padrao,
              borderWidth: 2.4,
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: '#fff',
              pointBorderWidth: 2,
              fill: false,
            },
            {
              label: 'Tempo de referência',
              data: dadosReferencia,
              borderColor: CORES.referencia,
              backgroundColor: CORES.referencia,
              borderWidth: 2.2,
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: '#fff',
              pointBorderWidth: 2,
              spanGaps: false,
              fill: false,
            },
            {
              label: 'Tempo efetivado',
              data: dadosEfetivado,
              borderColor: CORES.efetivado,
              backgroundColor: CORES.efetivado,
              borderWidth: 2.6,
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: '#fff',
              pointBorderWidth: 2,
              fill: false,
            },
          ],
        },
        options: baseOptions,
      })

      handlerClique = event => {
        const chart = chartInstance.value
        if (!chart || !chart.chartArea) return

        const retangulo = chartCanvas.value.getBoundingClientRect()
        const x = event.clientX - retangulo.left
        const { left, right } = chart.chartArea

        if (x < left - 10 || x > right + 10) return

        const valor = chart.scales.x.getValueForPixel(x)
        const indice = Math.max(0, Math.min(dias.length - 1, Math.round(Number(valor))))
        diaSelecionado.value = dias[indice] || null
      }

      chartCanvas.value.addEventListener('click', handlerClique)
    }

    // Descarta respostas de uma troca de período anterior que cheguem depois
    // da consulta mais recente (evita mostrar números de outro período).
    let sequencia = 0

    const carregar = async () => {
      destruirGrafico()
      temDados.value = false
      loading.value = true
      erroPeriodo.value = ''

      const requisicao = ++sequencia

      const params = parametrosRequisicao()
      const token = useAuthStore().pegar_token
      const cabecalho = token && !String(token).startsWith('Bearer') ? `Bearer ${token}` : token

      try {
        const res = await compartilhar(chaveGet('/dashboard/producao-evolucao', params), () =>
          api.get('/dashboard/producao-evolucao', {
            headers: { Authorization: cabecalho },
            params,
          })
        )

        if (requisicao !== sequencia) return

        const dados = res.data || {}
        resumo.value = { ...RESUMO_VAZIO, ...(dados.resumo || {}) }
        evolucao.value = dados.evolucao || []
        periodoLabel.value = dados.periodo?.periodoLabel || ''

        const temAlgumApontamento = evolucao.value.some(d => d.temProducao)
        temDados.value = temAlgumApontamento

        loading.value = false

        if (temAlgumApontamento) {
          await montarGrafico(evolucao.value)
        }
      } catch (e) {
        if (requisicao !== sequencia) return
        console.error('Erro ao carregar a evolução da produção:', e)
        const mensagem = e?.response?.data?.mensagem
        if (presetPeriodo.value === 'personalizado') erroPeriodo.value = mensagem || 'Falha ao carregar o período.'
        loading.value = false
        temDados.value = false
        resumo.value = { ...RESUMO_VAZIO }
        evolucao.value = []
        periodoLabel.value = ''
      }
    }

    const selecionarPreset = valor => {
      if (loading.value) return
      presetPeriodo.value = valor
      erroPeriodo.value = ''
      diaSelecionado.value = null
      carregar()
    }

    const abrirPersonalizado = () => {
      presetPeriodo.value = 'personalizado'
      erroPeriodo.value = ''
      if (!dataInicioCustom.value || !dataFimCustom.value) {
        const fim = new Date()
        const inicio = new Date()
        inicio.setDate(fim.getDate() - 6)
        dataFimCustom.value = dataISO(fim)
        dataInicioCustom.value = dataISO(inicio)
      }
    }

    const aplicarPersonalizado = () => {
      if (!dataInicioCustom.value || !dataFimCustom.value) {
        erroPeriodo.value = 'Informe as duas datas.'
        return
      }
      if (dataInicioCustom.value > dataFimCustom.value) {
        erroPeriodo.value = 'A data inicial deve ser anterior à final.'
        return
      }
      if (dataFimCustom.value > hojeISO) {
        erroPeriodo.value = 'A data final não pode estar no futuro.'
        return
      }
      const dias =
        (new Date(dataFimCustom.value) - new Date(dataInicioCustom.value)) / 86400000 + 1
      if (dias > 366) {
        erroPeriodo.value = 'Intervalo máximo de 366 dias.'
        return
      }
      erroPeriodo.value = ''
      diaSelecionado.value = null
      carregar()
    }

    const textoProfissionais = dia =>
      dia.profissionais === 1 ? '1 profissional' : `${dia.profissionais} profissionais`

    const textoApontamentos = dia =>
      dia.registros === 1 ? '1 apontamento' : `${dia.registros} apontamentos`

    // Jornada do dia = tempo de fábrica (reduzido pela revisão final) × pessoas.
    const textoJornadaResumo = computed(() => {
      const r = resumo.value
      if (!r.funcionariosDia) return 'jornada do dia × profissionais'
      return `${r.funcionariosDia} profissionais-dia · jornada pela revisão final`
    })

    const limparSelecao = () => {
      diaSelecionado.value = null
    }

    /**
     * Recarrega mantendo o período atual — chamado pelo Dashboard quando
     * chega um evento de nova produção (Socket.IO).
     */
    const recarregar = () => carregar()

    onMounted(carregar)
    onBeforeUnmount(destruirGrafico)

    return {
      chartCanvas,
      loading,
      temDados,
      erroPeriodo,
      periodos,
      presetPeriodo,
      dataInicioCustom,
      dataFimCustom,
      hojeISO,
      periodoLabel,
      resumo,
      evolucao,
      diaSelecionado,
      avisos,
      formatarNumero,
      formatarHoras,
      formatarPercentual,
      formatarDataCompleta,
      alturaSkeleton,
      textoJornadaResumo,
      selecionarPreset,
      abrirPersonalizado,
      aplicarPersonalizado,
      limparSelecao,
      recarregar,
      textoProfissionais,
      textoApontamentos,
    }
  },
}
</script>

<style scoped>
.evolucao-producao {
  background: #fff;
  border: 1px solid #e3e8e6;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(13, 21, 18, 0.04);
  padding: 22px 24px 20px;
  max-width: 100%;
  margin: 0 auto;
}

.evolucao-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.evolucao-titulo-bloco {
  text-align: left;
}

.evolucao-titulo {
  margin: 0;
  text-align: left;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0d1512;
  letter-spacing: -0.01em;
}

.evolucao-subtitulo {
  margin: 4px 0 0;
  text-align: left;
  font-size: 0.82rem;
  color: #6b7280;
}

.evolucao-filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filtro-pill {
  border: 1px solid #dfe6e3;
  background: #f8faf9;
  color: #44534d;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.filtro-pill:hover {
  border-color: #b9c9c2;
  background: #f1f5f3;
}

.filtro-pill.ativo {
  background: #0d3927;
  border-color: #0d3927;
  color: #fff;
}

.periodo-personalizado {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: -4px 0 16px;
  font-size: 0.8rem;
  color: #44534d;
}

.periodo-personalizado label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.periodo-personalizado input[type='date'] {
  border: 1px solid #dfe6e3;
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 0.78rem;
  color: #0d1512;
  background: #fff;
}

.botao-aplicar {
  border: none;
  background: #0d3927;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 999px;
  cursor: pointer;
}

.botao-aplicar:disabled {
  opacity: 0.6;
  cursor: default;
}

.erro-periodo {
  color: #b91c1c;
  font-size: 0.76rem;
  font-weight: 600;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.kpi {
  background: #f8faf9;
  border: 1px solid #eef2f0;
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.kpi-destaque {
  background: #f2f7f4;
  border-color: #d8e6dd;
}

.kpi-rotulo {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #7b8a83;
}

.kpi-valor {
  font-size: 1.12rem;
  font-weight: 700;
  color: #0d3927;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-apoio {
  font-size: 0.7rem;
  color: #8a9791;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aviso-dados {
  margin: 0 0 12px;
  font-size: 0.76rem;
  color: #7a5b13;
  background: #fff8e8;
  border: 1px solid #f3e3bd;
  border-radius: 10px;
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.grafico-container {
  position: relative;
  width: 100%;
  height: 320px;
}

.grafico-container canvas {
  width: 100% !important;
  height: 100% !important;
}

.sem-dados {
  margin: 0;
  padding: 48px 16px;
  text-align: center;
  color: #8a9791;
  font-size: 0.85rem;
}

.skeleton-chart {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 100%;
  padding: 12px 4px;
}

.sk-bar {
  flex: 1;
  background: linear-gradient(180deg, #f1f5f3 0%, #e8eeeb 100%);
  border-radius: 6px;
  animation: pulso 1.2s ease-in-out infinite;
}

@keyframes pulso {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

.dia-detalhe {
  margin-top: 14px;
  border: 1px solid #e3e8e6;
  border-radius: 12px;
  padding: 12px 14px;
  background: #fbfdfc;
}

.dia-detalhe-topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #0d1512;
  font-size: 0.85rem;
  text-transform: capitalize;
}

.fechar-detalhe {
  border: none;
  background: transparent;
  font-size: 1.15rem;
  line-height: 1;
  color: #8a9791;
  cursor: pointer;
  padding: 0 4px;
}

.dia-detalhe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px;
}

.dia-detalhe-grid span {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #7b8a83;
}

.dia-detalhe-grid strong {
  display: block;
  font-size: 0.95rem;
  color: #0d3927;
}

.dia-detalhe-grid small {
  display: block;
  font-size: 0.68rem;
  color: #8a9791;
}

.dia-aviso {
  margin: 10px 0 0;
  font-size: 0.75rem;
  color: #7a5b13;
}

.dia-nota {
  margin: 8px 0 0;
  font-size: 0.72rem;
  color: #8a9791;
}

@media (max-width: 576px) {
  .evolucao-producao {
    padding: 18px 16px 16px;
  }

  .grafico-container {
    height: 260px;
  }

  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
