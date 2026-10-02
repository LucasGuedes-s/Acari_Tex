<template>
  <div class="d-flex flex-column flex-xl-row">
    <SidebarNav />
    <main class="content-wrapper flex-grow-1">
      <div v-if="loading">
        <CarregandoTela />
      </div>

      <!-- ── Erro ── -->
      <div v-else-if="erro" class="estado-box">
        <i class="bi bi-exclamation-triangle estado-icone"></i>
        <p>{{ mensagemErro }}</p>
        <button class="btn-acao" @click="carregar">Tentar novamente</button>
      </div>

      <div v-else class="conteudo">

        <!-- ── Cabeçalho do profissional ── -->
        <section class="cabecalho">
          <div class="cabecalho-perfil">
            <img v-if="profissional.foto" :src="profissional.foto" alt="Foto do profissional" class="avatar" />
            <div v-else class="avatar avatar-placeholder">{{ iniciais(profissional.nome) }}</div>
            <div class="cabecalho-info">
              <h2>{{ profissional.nome }}</h2>
              <p class="sub">{{ profissional.funcoes || 'Profissional' }} · Análise de produção</p>
              <p class="periodo">
                <i class="bi bi-calendar3"></i>
                {{ periodoLabel }}
                <span v-if="profissional.status && profissional.status !== 'ativo'" class="badge-status">
                  {{ profissional.status }}
                </span>
              </p>
            </div>
          </div>
          <RouterLink to="/MinhaEquipe" class="btn-voltar">
            <i class="bi bi-arrow-left"></i> Voltar
          </RouterLink>
        </section>

        <!-- ── Filtros ── -->
        <section class="card-padrao filtros">
          <div class="chips-periodo">
            <button
              v-for="opcao in opcoesPeriodo"
              :key="opcao.id"
              :class="['chip', { ativo: tipoPeriodo === opcao.id }]"
              @click="trocarPeriodo(opcao.id)"
            >
              {{ opcao.label }}
            </button>
          </div>

          <div v-if="tipoPeriodo === 'personalizado'" class="datas-personalizadas">
            <input type="date" v-model="customInicio" class="input-data" />
            <span class="ate">até</span>
            <input type="date" v-model="customFim" class="input-data" />
            <button class="btn-acao" @click="aplicarPersonalizado" :disabled="!customInicio || !customFim">
              Aplicar
            </button>
          </div>

          <div class="filtros-extras">
            <select v-model="filtroOp" class="input-select">
              <option value="">Todas as OPs</option>
              <option v-for="op in opsDisponiveis" :key="op.id" :value="op.id">
                OP {{ op.id }}{{ op.descricao ? ` · ${op.descricao}` : '' }}
              </option>
            </select>
            <select v-model="filtroEtapa" class="input-select">
              <option value="">Todas as etapas</option>
              <option v-for="etapa in etapasDisponiveis" :key="etapa" :value="etapa">
                {{ etapa }}
              </option>
            </select>
            <button v-if="filtroOp !== '' || filtroEtapa !== ''" class="btn-limpar" @click="limparFiltros">
              <i class="bi bi-x-circle"></i> Limpar
            </button>
          </div>
        </section>

        <!-- ── Sem dados ── -->
        <div v-if="dados && dados.vazio" class="estado-box">
          <i class="bi bi-inbox estado-icone"></i>
          <p>Não existem registros de produção para este profissional no período selecionado.</p>
        </div>

        <template v-else-if="dados">
          <!-- ── Cards de indicadores ── -->
          <section class="grid-cards">
            <div class="card-indicador destaque">
              <span class="card-label">Produção total</span>
              <span class="card-valor">{{ fmtInt(resumo.producaoTotal) }}</span>
              <span class="card-sub">peças</span>
            </div>
            <div class="card-indicador">
              <span class="card-label">Horas trabalhadas</span>
              <span class="card-valor">{{ fmtNum2(resumo.horasTrabalhadas) }}h</span>
              <span class="card-sub">{{ resumo.registros }} registros</span>
            </div>
            <div class="card-indicador">
              <span class="card-label">Eficiência média</span>
              <span :class="['card-valor', getEficClass(resumo.eficienciaReferencia)]">
                {{ fmtPct(resumo.eficienciaReferencia) }}
              </span>
              <span class="card-sub">Tempo Fábrica · Ficha: {{ fmtPct(resumo.eficienciaFicha) }}</span>
            </div>
            <div class="card-indicador">
              <span class="card-label">Tempo médio por peça</span>
              <span class="card-valor">{{ fmtNum2(resumo.tempoMedioPorPeca) }} min</span>
              <span class="card-sub">Realizado por peça</span>
            </div>
            <div class="card-indicador">
              <span class="card-label">Tempo Fábrica médio</span>
              <span class="card-valor">{{ fmtNum2(resumo.tempoReferenciaMedio) }} min</span>
              <span class="card-sub">Padrão da etapa: {{ fmtNum2(resumo.tempoPadraoMedio) }} min</span>
            </div>
            <div class="card-indicador">
              <span class="card-label">OPs trabalhadas</span>
              <span class="card-valor">{{ fmtInt(resumo.opsTrabalhadas) }}</span>
              <span class="card-sub">{{ resumo.etapasTrabalhadas }} etapas · {{ resumo.diasTrabalhados }} dias</span>
            </div>
          </section>

          <!-- ── Evolução vs período anterior ── -->
          <section class="card-padrao evolucao-card">
            <h3 class="titulo-secao">
              <i class="bi bi-graph-up-arrow"></i>
              Evolução no período
            </h3>
            <template v-if="evolucao.temDadosAnteriores">
              <div class="evolucao-grid">
                <div class="evolucao-item">
                  <span class="evolucao-label">Eficiência</span>
                  <span class="evolucao-comparacao">
                    {{ fmtPct(evolucao.eficienciaReferenciaAnterior) }}
                    <i class="bi bi-arrow-right"></i>
                    <strong>{{ fmtPct(evolucao.eficienciaReferenciaAtual) }}</strong>
                  </span>
                  <span :class="['evolucao-delta', deltaClasse(evolucao.variacaoPontos)]">
                    {{ deltaTexto(evolucao.variacaoPontos, 'p.p.') }}
                  </span>
                </div>
                <div class="evolucao-item">
                  <span class="evolucao-label">Produção</span>
                  <span class="evolucao-comparacao">
                    {{ fmtInt(evolucao.producaoAnterior) }}
                    <i class="bi bi-arrow-right"></i>
                    <strong>{{ fmtInt(evolucao.producaoAtual) }}</strong>
                  </span>
                  <span class="evolucao-label">peças</span>
                </div>
                <div class="evolucao-item">
                  <span class="evolucao-label">Tempo médio/peça</span>
                  <span class="evolucao-comparacao">
                    {{ fmtNum2(evolucao.tempoMedioPorPecaAnterior) }} min
                    <i class="bi bi-arrow-right"></i>
                    <strong>{{ fmtNum2(evolucao.tempoMedioPorPecaAtual) }} min</strong>
                  </span>
                  <span class="evolucao-label">menor é melhor</span>
                </div>
              </div>
              <p class="evolucao-nota">
                Comparação com o período anterior ({{ periodoAnteriorLabel }}).
              </p>
            </template>
            <p v-else class="evolucao-nota">
              Sem dados suficientes no período anterior<template v-if="periodoAnteriorLabel"> ({{ periodoAnteriorLabel }})</template>
              para comparar a evolução.
            </p>
          </section>

          <!-- ── Gráficos ── -->
          <section class="card-padrao grafico-card">
            <h3 class="titulo-secao">
              <i class="bi bi-graph-up"></i>
              Evolução da eficiência
            </h3>
            <div v-if="porDiaFiltrado.length" class="grafico-box">
              <LineChart :data="chartEvolucaoEficiencia" :options="opcoesEvolucao" />
            </div>
            <p v-else class="sem-dados">Sem dados para os filtros selecionados</p>
          </section>

          <section class="card-padrao grafico-card">
            <h3 class="titulo-secao">
              <i class="bi bi-bar-chart"></i>
              Produção por dia
            </h3>
            <div v-if="porDiaFiltrado.length" class="grafico-box">
              <BarChart :data="chartProducaoDia" :options="opcoesProducao" />
            </div>
            <p v-else class="sem-dados">Sem dados para os filtros selecionados</p>
          </section>

          <section class="card-padrao grafico-card">
            <h3 class="titulo-secao">
              <i class="bi bi-stopwatch"></i>
              Evolução do tempo (realizado × Tempo Fábrica)
            </h3>
            <div v-if="porDiaFiltrado.length" class="grafico-box">
              <LineChart :data="chartEvolucaoTempo" :options="opcoesTempoDia" />
            </div>
            <p v-else class="sem-dados">Sem dados para os filtros selecionados</p>
          </section>

          <section class="card-padrao grafico-card">
            <h3 class="titulo-secao">
              <i class="bi bi-layers"></i>
              Tempos por OP (padrão × Tempo Fábrica × realizado)
            </h3>
            <p v-if="porOpFiltrada.length > 15" class="nota-grafico">
              Exibindo as 15 OPs com maior produção.
            </p>
            <div v-if="opsGrafico.length" class="grafico-box">
              <BarChart :data="chartTemposPorOp" :options="opcoesTempos" />
            </div>
            <p v-else class="sem-dados">Sem dados para os filtros selecionados</p>
          </section>

          <section class="card-padrao grafico-card">
            <h3 class="titulo-secao">
              <i class="bi bi-speedometer2"></i>
              Eficiência por OP
            </h3>
            <div v-if="opsGrafico.length" class="grafico-box">
              <BarChart :data="chartEficienciaPorOp" :options="opcoesEficienciaOp" />
            </div>
            <p v-else class="sem-dados">Sem dados para os filtros selecionados</p>
          </section>

          <!-- ── Tabela por OP ── -->
          <section class="card-padrao tabela-card">
            <h3 class="titulo-secao">
              <i class="bi bi-table"></i>
              Análise por OP
            </h3>
            <div v-if="linhasOrdenadas.length" class="table-scroll">
              <table class="tabela-op">
                <thead>
                  <tr>
                    <th
                      v-for="col in colunasTabela"
                      :key="col.campo"
                      :class="col.classe"
                      @click="ordenarPor(col.campo)"
                    >
                      {{ col.label }}
                      <i
                        v-if="sortKey === col.campo"
                        :class="['bi', sortDir === 1 ? 'bi-caret-up-fill' : 'bi-caret-down-fill']"
                      ></i>
                    </th>
                    <th>Detalhar</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="linha in linhasOrdenadas" :key="chaveLinha(linha)">
                    <tr>
                      <td class="td-op">
                        OP {{ linha.idOp }}
                        <small v-if="linha.descricaoOp" class="td-op-descricao">{{ linha.descricaoOp }}</small>
                      </td>
                      <td>{{ linha.descricaoEtapa }}</td>
                      <td class="num">{{ fmtInt(linha.producao) }}</td>
                      <td class="num">{{ fmtNum2(linha.tempoPadrao) }}</td>
                      <td class="num">
                        {{ fmtNum2(linha.tempoReferenciaIndividual) }}
                        <i
                          v-if="linha.trVariavel"
                          class="bi bi-asterisk asterisco"
                          title="Tempo de referência variou no período — valor é a média ponderada"
                        ></i>
                      </td>
                      <td class="num">{{ fmtNum2(linha.tempoRealizadoPorPeca) }}</td>
                      <td class="num">{{ fmtMinutos(linha.tempoRealizadoMin) }}</td>
                      <td class="num">{{ fmtInt(linha.capacidade) }}</td>
                      <td class="num">
                        <span :class="['badge-efic', getEficClass(linha.eficienciaReferencia)]">
                          {{ fmtPct(linha.eficienciaReferencia) }}
                        </span>
                      </td>
                      <td class="num">{{ fmtInt(linha.registros) }}</td>
                      <td class="td-acao">
                        <button class="btn-detalhar" @click="alternarDetalhe(chaveLinha(linha))">
                          {{ opDetalhada === chaveLinha(linha) ? 'Fechar' : 'Detalhar' }}
                        </button>
                      </td>
                    </tr>
                    <tr v-if="opDetalhada === chaveLinha(linha)" class="linha-detalhe">
                      <td :colspan="colunasTabela.length + 1">
                        <div class="detalhe-panel">
                          <div class="detalhe-resumo">
                            <span>
                              <strong>Período:</strong> {{ fmtDataBR(linha.primeiraData) }} →
                              {{ fmtDataBR(linha.ultimaData) }}
                            </span>
                            <span>
                              <strong>Origem do Tempo Fábrica:</strong>
                              {{ labelOrigemTR(linha.origemTempoReferencia) }}
                            </span>
                            <span v-if="linha.opQuantidadeTotal != null">
                              <strong>Quantidade total da OP:</strong> {{ fmtInt(linha.opQuantidadeTotal) }}
                            </span>
                            <span>
                              <strong>Tempo Fábrica:</strong> {{ fmtNum2(linha.tempoReferenciaIndividual) }} min/peça
                            </span>
                          </div>
                          <div class="table-scroll">
                            <table class="tabela-dias">
                              <thead>
                                <tr>
                                  <th>Data</th>
                                  <th class="num">Produção</th>
                                  <th class="num">Tempo total</th>
                                  <th class="num">Realizado (min/peça)</th>
                                  <th class="num">Tempo Fábrica (min/peça)</th>
                                  <th class="num">Eficiência</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr v-for="d in linha.dias || []" :key="d.data">
                                  <td>{{ fmtDataBR(d.data) }}</td>
                                  <td class="num">{{ fmtInt(d.producao) }}</td>
                                  <td class="num">{{ fmtMinutos(d.tempoTrabalhado) }}</td>
                                  <td class="num">{{ fmtNum2(d.tempoRealizadoPorPeca) }}</td>
                                  <td class="num">{{ fmtNum2(d.tempoReferenciaIndividual) }}</td>
                                  <td class="num">
                                    <span :class="['badge-efic', getEficClass(d.eficienciaReferencia)]">
                                      {{ fmtPct(d.eficienciaReferencia) }}
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
            <p v-else class="sem-dados">Sem dados para os filtros selecionados</p>
            <p class="legenda">
              <i class="bi bi-asterisk asterisco"></i> média ponderada no período ·
              Eficiência calculada pela fórmula oficial (Σ Peças × SAM ÷ Tempo Trabalhado),
              igual às demais telas do sistema.
            </p>
          </section>
        </template>
      </div>
    </main>
  </div>
</template>
<script>
import SidebarNav from '@/components/Sidebar.vue'
import CarregandoTela from '@/components/carregandoTela.vue'
import { useAuthStore } from '@/store/store'
import api from '@/Axios'
import router from '@/router'
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  LineController,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar as BarChart, Line as LineChart } from 'vue-chartjs'

ChartJS.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
)

// Mesmo limiar de eficiência adotado na tela de Registro de Produção
const LIMIAR_EFICIENCIA_REFERENCIA = 80

const COR = {
  verde: '#10B981',
  verdeEscuro: '#047857',
  verdeClaro: '#6EE7B7',
  cinza: '#94A3A0',
  vermelho: '#EF4444',
}

export default {
  name: 'AnaliseProfissional',

  components: { SidebarNav, CarregandoTela, BarChart, LineChart },

  props: {
    id: { type: String, default: '' },
  },

  setup() {
    const store = useAuthStore()
    return { store }
  },

  data() {
    return {
      loading: true,
      erro: false,
      mensagemErro: '',
      dados: null,
      tipoPeriodo: '30',
      customInicio: '',
      customFim: '',
      filtroOp: '',
      filtroEtapa: '',
      sortKey: 'producao',
      sortDir: -1,
      opDetalhada: null,

      opcoesPeriodo: [
        { id: 'hoje', label: 'Hoje' },
        { id: '7', label: 'Últimos 7 dias' },
        { id: '30', label: 'Últimos 30 dias' },
        { id: 'mesAtual', label: 'Mês atual' },
        { id: 'mesAnterior', label: 'Mês anterior' },
        { id: 'personalizado', label: 'Personalizado' },
      ],

      colunasTabela: [
        { campo: 'idOp', label: 'OP' },
        { campo: 'descricaoEtapa', label: 'Etapa' },
        { campo: 'producao', label: 'Produção', classe: 'num' },
        { campo: 'tempoPadrao', label: 'Padrão (min/peça)', classe: 'num' },
        {
          campo: 'tempoReferenciaIndividual',
          label: 'Tempo Fábrica (min/peça)',
          classe: 'num',
        },
        {
          campo: 'tempoRealizadoPorPeca',
          label: 'Realizado (min/peça)',
          classe: 'num',
        },
        {
          campo: 'tempoRealizadoMin',
          label: 'Tempo total',
          classe: 'num',
        },
        { campo: 'capacidade', label: 'Capacidade', classe: 'num' },
        {
          campo: 'eficienciaReferencia',
          label: 'Eficiência',
          classe: 'num',
        },
        { campo: 'registros', label: 'Registros', classe: 'num' },
      ],
    }
  },

  computed: {
    profissional() {
      return this.dados?.profissional || {}
    },

    resumo() {
      return (
        this.dados?.resumo || {
          producaoTotal: 0,
          horasTrabalhadas: 0,
          eficienciaReferencia: 0,
          eficienciaFicha: 0,
          tempoMedioPorPeca: 0,
          tempoReferenciaMedio: 0,
          tempoPadraoMedio: 0,
          opsTrabalhadas: 0,
          etapasTrabalhadas: 0,
          diasTrabalhados: 0,
          registros: 0,
        }
      )
    },

    evolucao() {
      return (
        this.dados?.evolucao || {
          temDadosAnteriores: false,
          periodoAnterior: {},
          eficienciaReferenciaAtual: 0,
          eficienciaReferenciaAnterior: null,
          variacaoPontos: null,
          producaoAtual: 0,
          producaoAnterior: null,
          tempoMedioPorPecaAtual: 0,
          tempoMedioPorPecaAnterior: null,
        }
      )
    },

    /**
     * Calcula o período sempre usando datas locais.
     *
     * Importante:
     * NÃO usamos new Date('YYYY-MM-DD'), pois o JavaScript interpreta
     * esse formato como UTC e, no fuso do Brasil, isso pode resultar
     * no dia anterior.
     */
    periodoSelecionado() {
      const hoje = this.criarDataLocal(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        new Date().getDate()
      )

      switch (this.tipoPeriodo) {
        case 'hoje':
          return {
            inicio: this.dataISO(hoje),
            fim: this.dataISO(hoje),
          }

        case '7': {
          const ini = new Date(
            hoje.getFullYear(),
            hoje.getMonth(),
            hoje.getDate()
          )

          ini.setDate(ini.getDate() - 6)

          return {
            inicio: this.dataISO(ini),
            fim: this.dataISO(hoje),
          }
        }

        case '30': {
          const ini = new Date(
            hoje.getFullYear(),
            hoje.getMonth(),
            hoje.getDate()
          )

          ini.setDate(ini.getDate() - 29)

          return {
            inicio: this.dataISO(ini),
            fim: this.dataISO(hoje),
          }
        }

        case 'mesAtual':
          return {
            inicio: this.dataISO(
              new Date(hoje.getFullYear(), hoje.getMonth(), 1)
            ),
            fim: this.dataISO(
              new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
            ),
          }

        case 'mesAnterior':
          return {
            inicio: this.dataISO(
              new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
            ),
            fim: this.dataISO(
              new Date(hoje.getFullYear(), hoje.getMonth(), 0)
            ),
          }

        case 'personalizado':
          return {
            inicio: this.customInicio,
            fim: this.customFim,
          }

        default:
          return {
            inicio: '',
            fim: '',
          }
      }
    },

    periodoLabel() {
      if (this.dados?.periodo?.label) {
        return this.dados.periodo.label
      }

      const p = this.periodoSelecionado

      return p.inicio && p.fim
        ? `${this.fmtDataBR(p.inicio)} a ${this.fmtDataBR(p.fim)}`
        : ''
    },

    periodoAnteriorLabel() {
      const p = this.evolucao.periodoAnterior

      return p && p.inicio
        ? `${this.fmtDataBR(p.inicio)} a ${this.fmtDataBR(p.fim)}`
        : ''
    },

    opsDisponiveis() {
      const mapa = new Map()
      const linhas = this.dados?.porOp || []

      linhas.forEach(l => {
        if (!mapa.has(l.idOp)) {
          mapa.set(l.idOp, {
            id: l.idOp,
            descricao: l.descricaoOp || '',
          })
        }
      })

      return Array.from(mapa.values()).sort((a, b) => a.id - b.id)
    },

    etapasDisponiveis() {
      const linhas = this.dados?.porOp || []

      const etapas = new Set(
        linhas.map(l => l.descricaoEtapa)
      )

      return Array.from(etapas).sort((a, b) =>
        String(a).localeCompare(String(b))
      )
    },

    porOpFiltrada() {
      let linhas = this.dados?.porOp || []

      if (this.filtroOp !== '') {
        linhas = linhas.filter(
          l => String(l.idOp) === String(this.filtroOp)
        )
      }

      if (this.filtroEtapa !== '') {
        linhas = linhas.filter(
          l => l.descricaoEtapa === this.filtroEtapa
        )
      }

      return linhas
    },

    /**
     * Dias usados pelos gráficos.
     *
     * A data permanece SEMPRE como string YYYY-MM-DD.
     * Não convertemos para Date, evitando qualquer deslocamento
     * causado por UTC/fuso horário.
     */
    porDiaFiltrado() {
      if (this.filtroOp === '' && this.filtroEtapa === '') {
        return this.dados?.porDia || []
      }

      const mapa = new Map()

      this.porOpFiltrada.forEach(linha => {
        const diasDaLinha = linha.dias || []

        diasDaLinha.forEach(d => {
          if (!mapa.has(d.data)) {
            mapa.set(d.data, {
              data: d.data,
              producao: 0,
              tempoTrabalhado: 0,
              tempoReferencia: 0,
              tempoFicha: 0,
            })
          }

          const dia = mapa.get(d.data)

          dia.producao += Number(d.producao) || 0
          dia.tempoTrabalhado += Number(d.tempoTrabalhado) || 0
          dia.tempoReferencia += Number(d.tempoReferencia) || 0
          dia.tempoFicha += Number(d.tempoFicha) || 0
        })
      })

      return Array.from(mapa.values())
        .sort((a, b) => String(a.data).localeCompare(String(b.data)))
        .map(d => ({
          data: d.data,
          producao: d.producao,
          tempoTrabalhado: d.tempoTrabalhado,

          eficienciaReferencia: d.tempoTrabalhado
            ? Math.round(
                (d.tempoReferencia / d.tempoTrabalhado) * 10000
              ) / 100
            : 0,

          eficienciaFicha: d.tempoTrabalhado
            ? Math.round(
                (d.tempoFicha / d.tempoTrabalhado) * 10000
              ) / 100
            : 0,

          tempoMedioPorPeca:
            d.producao > 0
              ? Math.round(
                  (d.tempoTrabalhado / d.producao) * 100
                ) / 100
              : 0,

          tempoReferenciaMedio:
            d.producao > 0
              ? Math.round(
                  (d.tempoReferencia / d.producao) * 100
                ) / 100
              : 0,
        }))
    },

    linhasOrdenadas() {
      const linhas = [...this.porOpFiltrada]
      const campo = this.sortKey
      const dir = this.sortDir

      return linhas.sort((a, b) => {
        const va = a[campo]
        const vb = b[campo]

        if (
          typeof va === 'string' ||
          typeof vb === 'string'
        ) {
          return (
            String(va ?? '').localeCompare(
              String(vb ?? '')
            ) * dir
          )
        }

        return (
          ((Number(va) || 0) -
            (Number(vb) || 0)) *
          dir
        )
      })
    },

    opsGrafico() {
      return [...this.porOpFiltrada]
        .sort(
          (a, b) =>
            (Number(b.producao) || 0) -
            (Number(a.producao) || 0)
        )
        .slice(0, 15)
    },

    rotulosOps() {
      return this.opsGrafico.map(
        l =>
          `OP ${l.idOp} · ${this.etapaCurta(
            l.descricaoEtapa
          )}`
      )
    },

    chartEvolucaoEficiencia() {
      const dias = this.porDiaFiltrado

      const labels = dias.map(d =>
        this.fmtDataCurta(d.data)
      )

      return {
        labels,

        datasets: [
          {
            label: 'Eficiência Tempo Fábrica (%)',
            data: dias.map(
              d => d.eficienciaReferencia
            ),
            borderColor: COR.verde,
            backgroundColor: COR.verde,
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
          },

          {
            label: 'Eficiência Ficha (%)',
            data: dias.map(
              d => d.eficienciaFicha
            ),
            borderColor: COR.cinza,
            backgroundColor: COR.cinza,
            borderWidth: 2,
            borderDash: [6, 4],
            tension: 0.3,
            pointRadius: 2,
          },

          {
            label: 'Referência 100%',
            data: labels.map(() => 100),
            borderColor: COR.vermelho,
            backgroundColor: COR.vermelho,
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
          },
        ],
      }
    },

    opcoesEvolucao() {
      return {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          mode: 'index',
          intersect: false,
        },

        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 10,
            },
          },

          tooltip: {
            callbacks: {
              label: ctx =>
                `${ctx.dataset.label}: ${this.fmtNum2(
                  ctx.raw
                )}%`,
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
              text: 'Eficiência (%)',
            },
          },
        },
      }
    },

    chartProducaoDia() {
      const dias = this.porDiaFiltrado

      return {
        labels: dias.map(d =>
          this.fmtDataCurta(d.data)
        ),

        datasets: [
          {
            label: 'Peças produzidas',
            data: dias.map(d => d.producao),
            backgroundColor: COR.verde + 'CC',
            borderColor: COR.verde,
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      }
    },

    opcoesProducao() {
      return {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: {
            display: false,
          },

          tooltip: {
            callbacks: {
              label: ctx =>
                `${this.fmtInt(ctx.raw)} peças`,
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
              text: 'Peças',
            },
          },
        },
      }
    },

    chartEvolucaoTempo() {
      const dias = this.porDiaFiltrado

      return {
        labels: dias.map(d =>
          this.fmtDataCurta(d.data)
        ),

        datasets: [
          {
            label: 'Realizado (min/peça)',
            data: dias.map(
              d => d.tempoMedioPorPeca
            ),
            borderColor: COR.verdeEscuro,
            backgroundColor: COR.verdeEscuro,
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
          },

          {
            label: 'Tempo Fábrica (min/peça)',
            data: dias.map(
              d => d.tempoReferenciaMedio
            ),
            borderColor: COR.verde,
            backgroundColor: COR.verde,
            borderWidth: 2,
            borderDash: [6, 4],
            tension: 0.3,
            pointRadius: 2,
          },
        ],
      }
    },

    opcoesTempoDia() {
      return {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          mode: 'index',
          intersect: false,
        },

        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 10,
            },
          },

          tooltip: {
            callbacks: {
              label: ctx =>
                `${ctx.dataset.label}: ${this.fmtNum2(
                  ctx.raw
                )}`,
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
              text: 'min por peça',
            },
          },
        },
      }
    },

    chartTemposPorOp() {
      const linhas = this.opsGrafico

      return {
        labels: this.rotulosOps,

        datasets: [
          {
            label: 'Padrão da etapa',
            data: linhas.map(
              l => l.tempoPadrao
            ),
            backgroundColor: COR.cinza + 'CC',
            borderColor: COR.cinza,
            borderWidth: 1,
            borderRadius: 4,
          },

          {
            label: 'Tempo Fábrica (referência)',
            data: linhas.map(
              l => l.tempoReferenciaIndividual
            ),
            backgroundColor: COR.verde + 'CC',
            borderColor: COR.verde,
            borderWidth: 1,
            borderRadius: 4,
          },

          {
            label: 'Realizado',
            data: linhas.map(
              l => l.tempoRealizadoPorPeca
            ),
            backgroundColor: COR.verdeEscuro + 'CC',
            borderColor: COR.verdeEscuro,
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      }
    },

    opcoesTempos() {
      return {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          mode: 'index',
          intersect: false,
        },

        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 10,
            },
          },

          tooltip: {
            callbacks: {
              label: ctx =>
                `${ctx.dataset.label}: ${this.fmtNum2(
                  ctx.raw
                )} min/peça`,
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
              text: 'min por peça',
            },
          },
        },
      }
    },

    chartEficienciaPorOp() {
      const linhas = this.opsGrafico
      const labels = this.rotulosOps

      const ok = l =>
        Number(l.eficienciaReferencia) >=
        LIMIAR_EFICIENCIA_REFERENCIA

      return {
        labels,

        datasets: [
          {
            label: 'Eficiência Tempo Fábrica (%)',

            data: linhas.map(
              l => l.eficienciaReferencia
            ),

            backgroundColor: linhas.map(l =>
              ok(l)
                ? COR.verde + 'CC'
                : COR.vermelho + 'CC'
            ),

            borderColor: linhas.map(l =>
              ok(l)
                ? COR.verde
                : COR.vermelho
            ),

            borderWidth: 1,
            borderRadius: 4,
          },

          {
            label: 'Referência 100%',
            type: 'line',
            data: labels.map(() => 100),
            borderColor: COR.verdeEscuro,
            backgroundColor: COR.verdeEscuro,
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
          },
        ],
      }
    },

    opcoesEficienciaOp() {
      return {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          mode: 'index',
          intersect: false,
        },

        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 10,
            },
          },

          tooltip: {
            callbacks: {
              label: ctx =>
                ctx.dataset.type === 'line'
                  ? 'Referência: 100%'
                  : `${this.fmtNum2(ctx.raw)}%`,
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
              text: 'Eficiência (%)',
            },
          },
        },
      }
    },
  },

  watch: {
    id() {
      this.filtroOp = ''
      this.filtroEtapa = ''
      this.carregar()
    },
  },

  mounted() {
    if (!this.verificarAutenticacao()) return
    this.carregar()
  },

  methods: {
    /**
     * Cria uma data LOCAL explicitamente.
     *
     * Evita:
     * new Date('2026-10-02')
     *
     * pois essa forma é interpretada como UTC e pode virar
     * 01/10/2026 no fuso -03:00.
     */
    criarDataLocal(ano, mes, dia) {
      return new Date(ano, mes - 1, dia)
    },

    /**
     * Converte Date para YYYY-MM-DD sem UTC.
     */
    dataISO(d) {
      if (!(d instanceof Date) || isNaN(d.getTime())) {
        return ''
      }

      return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-')
    },

    fmtInt(v) {
      return Number(v || 0).toLocaleString('pt-BR')
    },

    fmtNum2(v) {
      return Number(v || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    },

    fmtPct(v) {
      return `${this.fmtNum2(v)}%`
    },

    /**
     * Formata YYYY-MM-DD diretamente.
     *
     * IMPORTANTE:
     * Não usamos new Date(iso).
     */
    fmtDataBR(iso) {
      if (!iso) return '—'

      const partes = String(iso).substring(0, 10).split('-')

      if (partes.length !== 3) {
        return String(iso)
      }

      const [ano, mes, dia] = partes

      return `${dia}/${mes}/${ano}`
    },

    /**
     * Formata YYYY-MM-DD diretamente para DD/MM.
     *
     * Essa função é usada pelos labels dos gráficos.
     */
    fmtDataCurta(iso) {
      if (!iso) return ''

      const partes = String(iso).substring(0, 10).split('-')

      if (partes.length !== 3) {
        return String(iso)
      }

      const [, mes, dia] = partes

      return `${dia}/${mes}`
    },

    fmtMinutos(min) {
      const total = Math.round(
        Number(min || 0)
      )

      const horas = Math.floor(total / 60)
      const minutos = total % 60

      return horas > 0
        ? `${horas}h ${String(minutos).padStart(
            2,
            '0'
          )}min`
        : `${minutos}min`
    },

    iniciais(nome) {
      if (!nome) return '?'

      const partes = String(nome)
        .trim()
        .split(/\s+/)

      const primeira =
        partes[0]?.[0] || ''

      const ultima =
        partes.length > 1
          ? partes[partes.length - 1][0]
          : ''

      return (
        primeira + ultima
      ).toUpperCase()
    },

    etapaCurta(descricao) {
      return String(descricao || '').replace(
        /\s*\([^)]*\)\s*$/,
        ''
      )
    },

    getEficClass(pct) {
      const valor = Number(pct || 0)

      return valor >=
        LIMIAR_EFICIENCIA_REFERENCIA
        ? 'efic-alta'
        : 'efic-baixa'
    },

    deltaClasse(v) {
      if (v == null) return 'neutro'
      if (v > 0) return 'positivo'
      if (v < 0) return 'negativo'
      return 'neutro'
    },

    deltaTexto(v, sufixo = '') {
      if (v == null) return '—'

      const sinal = v > 0 ? '+' : ''

      return `${sinal}${this.fmtNum2(v)}${
        sufixo ? ` ${sufixo}` : ''
      }`
    },

    labelOrigemTR(origem) {
      const mapa = {
        peca: 'Tempo de referência individual da OP',
        ultimo_registrado:
          'Tempo de referência individual da etapa',
        padrao_ficha:
          'Sem tempo de referência individual — usado o padrão da etapa',
      }

      return mapa[origem] || '—'
    },

    chaveLinha(linha) {
      return `${linha.idOp}|${linha.idEtapa}`
    },

    ordenarPor(campo) {
      if (this.sortKey === campo) {
        this.sortDir =
          this.sortDir === 1 ? -1 : 1
      } else {
        this.sortKey = campo
        this.sortDir = -1
      }
    },

    alternarDetalhe(chave) {
      this.opDetalhada =
        this.opDetalhada === chave
          ? null
          : chave
    },

    trocarPeriodo(id) {
      if (this.loading) return

      this.tipoPeriodo = id

      if (id !== 'personalizado') {
        this.carregar()
      }
    },

    aplicarPersonalizado() {
      if (this.loading) return
      if (!this.customInicio || !this.customFim) return
      if (this.customInicio > this.customFim) return

      this.carregar()
    },

    limparFiltros() {
      this.filtroOp = ''
      this.filtroEtapa = ''
      this.opDetalhada = null
    },

    verificarAutenticacao() {
      const token = this.store.pegar_token
      const usuario = this.store.pegar_usuario

      if (!token || !usuario) {
        router.push('/')
        return false
      }

      return true
    },

    async carregar() {
      if (!this.id) {
        this.erro = true
        this.mensagemErro =
          'Profissional não informado na rota.'
        this.loading = false
        return
      }

      this.loading = true
      this.erro = false

      try {
        const {
          inicio,
          fim,
        } = this.periodoSelecionado

        if (!inicio || !fim) {
          throw new Error(
            'Selecione um período válido.'
          )
        }

        const { data } = await api.get(
          `/producao/profissional/${encodeURIComponent(
            this.id
          )}`,
          {
            params: {
              dataInicio: inicio,
              dataFim: fim,
            },

            headers: {
              Authorization:
                this.store.pegar_token,
            },
          }
        )

        this.dados = data
        this.opDetalhada = null

        console.log(
          'Análise do profissional carregada com sucesso:',
          data
        )
      } catch (e) {
        console.error(
          'Erro ao carregar análise do profissional:',
          e
        )

        this.erro = true

        this.mensagemErro =
          e.response?.data?.message ||
          e.message ||
          'Não foi possível carregar a análise do profissional.'
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
<style scoped>
/* ── Tokens (verde predominante) ── */
.content-wrapper {
  --verde-950: #052e22;
  --verde-900: #0a4030;
  --verde-800: #065f46;
  --verde-700: #047857;
  --verde-600: #059669;
  --verde-500: #10b981;
  --verde-200: #a7f3d0;
  --verde-100: #d1fae5;
  --verde-50: #ecfdf5;
  --tinta: #10261d;
  --tinta-suave: #5a6f65;
  --borda: #d3e4da;
  --alerta: #dc2626;
  --alerta-fundo: #fee2e2;

  background: var(--fundo);
  color: var(--tinta);
  padding: 24px;
  min-width: 0;
  min-height: 100vh;
}

.conteudo {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-left: 200px;
  margin: 0 auto;
}

/* ── Cards base ── */
.card-padrao {
  background: #fff;
  border: 1px solid var(--borda);
  border-radius: 12px;
  padding: 20px;
}

.titulo-secao {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--verde-900);
}

.titulo-secao i {
  color: var(--verde-600);
}

/* ── Estados (erro / vazio) ── */
.estado-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 20px;
  text-align: center;
  background: #fff;
  border: 1px dashed var(--verde-500);
  border-radius: 12px;
  color: var(--tinta-suave);
}

.estado-icone {
  font-size: 2.4rem;
  color: var(--verde-600);
}

.estado-box p {
  margin: 0;
  max-width: 460px;
}

/* ── Botões ── */
.btn-acao,
.btn-voltar,
.btn-limpar,
.btn-detalhar {
  font: inherit;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}

.btn-acao {
  background: var(--verde-600);
  color: #fff;
  border: 1px solid var(--verde-600);
  border-radius: 8px;
  padding: 8px 18px;
  font-weight: 600;
}

.btn-acao:hover:not(:disabled) {
  background: var(--verde-700);
  border-color: var(--verde-700);
}

.btn-acao:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-limpar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: var(--verde-700);
  border: 1px solid var(--verde-200);
  border-radius: 8px;
  padding: 7px 14px;
}

.btn-limpar:hover {
  background: var(--verde-50);
  border-color: var(--verde-500);
}

.btn-acao:focus-visible,
.btn-voltar:focus-visible,
.btn-limpar:focus-visible,
.btn-detalhar:focus-visible,
.chip:focus-visible,
.input-data:focus-visible,
.input-select:focus-visible {
  outline: 3px solid var(--verde-200);
  outline-offset: 2px;
}

/* ── Cabeçalho (peça de destaque da tela) ── */
.cabecalho {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 24px;
  border-radius: 14px;
  background: var(--verde-900);
  color: #fff;
}

.cabecalho-perfil {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--verde-500);
  flex-shrink: 0;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--verde-500);
  color: var(--verde-950);
  font-size: 1.5rem;
  font-weight: 700;
}

.cabecalho-info {
  min-width: 0;
}

.cabecalho-info h2 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1.2;
}

.cabecalho-info .sub {
  margin: 4px 0 0;
  color: var(--verde-200);
}

.cabecalho-info .periodo {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0 0;
  font-size: 0.9rem;
  color: var(--verde-100);
}

.badge-status {
  background: var(--verde-100);
  color: var(--verde-900);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.btn-voltar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border: 1px solid var(--verde-500);
  border-radius: 8px;
  color: #fff;
  text-decoration: none;
}

.btn-voltar:hover {
  background: var(--verde-500);
  color: var(--verde-950);
}

/* ── Filtros ── */
.filtros {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chips-periodo {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  font: inherit;
  font-size: 0.9rem;
  background: #fff;
  color: var(--verde-800);
  border: 1px solid var(--verde-200);
  border-radius: 999px;
  padding: 6px 16px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}

.chip:hover {
  background: var(--verde-50);
  border-color: var(--verde-500);
}

.chip.ativo {
  background: var(--verde-600);
  border-color: var(--verde-600);
  color: #fff;
  font-weight: 600;
}

.datas-personalizadas,
.filtros-extras {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.ate {
  color: var(--tinta-suave);
}

.input-data,
.input-select {
  font: inherit;
  background: #fff;
  color: var(--tinta);
  border: 1px solid var(--borda);
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 180px;
  max-width: 100%;
}

.input-data:focus,
.input-select:focus {
  border-color: var(--verde-500);
  outline: none;
}

/* ── Indicadores ── */
.grid-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.card-indicador {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px;
  background: #fff;
  border: 1px solid var(--borda);
  border-left: 4px solid var(--verde-500);
  border-radius: 12px;
}

.card-indicador.destaque {
  background: var(--verde-50);
  border-color: var(--verde-200);
  border-left-color: var(--verde-700);
}

.card-label {
  font-size: 0.85rem;
  color: var(--tinta-suave);
}

.card-valor {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.15;
  color: var(--verde-900);
  font-variant-numeric: tabular-nums;
}

.card-valor.efic-alta {
  color: var(--verde-600);
}

.card-valor.efic-baixa {
  color: var(--alerta);
}

.card-sub {
  font-size: 0.8rem;
  color: var(--tinta-suave);
}

/* ── Evolução ── */
.evolucao-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.evolucao-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: var(--verde-50);
  border-radius: 10px;
}

.evolucao-label {
  font-size: 0.82rem;
  color: var(--tinta-suave);
}

.evolucao-comparacao {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
}

.evolucao-comparacao i {
  color: var(--verde-600);
}

.evolucao-comparacao strong {
  color: var(--verde-900);
}

.evolucao-delta {
  align-self: flex-start;
  border-radius: 999px;
  padding: 2px 12px;
  font-size: 0.85rem;
  font-weight: 700;
}

.evolucao-delta.positivo {
  background: var(--verde-100);
  color: var(--verde-800);
}

.evolucao-delta.negativo {
  background: var(--alerta-fundo);
  color: var(--alerta);
}

.evolucao-delta.neutro {
  background: #e5ebe8;
  color: var(--tinta-suave);
}

.evolucao-nota,
.nota-grafico,
.legenda {
  margin: 12px 0 0;
  font-size: 0.82rem;
  color: var(--tinta-suave);
}

.nota-grafico {
  margin: -6px 0 12px;
}

/* ── Gráficos ── */
.grafico-box {
  position: relative;
  height: 340px;
}

.sem-dados {
  margin: 0;
  padding: 28px 0;
  text-align: center;
  color: var(--tinta-suave);
}

/* ── Tabela ── */
.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--borda);
  border-radius: 10px;
}

.tabela-op,
.tabela-dias {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.tabela-op th,
.tabela-dias th {
  background: var(--verde-50);
  color: var(--verde-900);
  font-weight: 700;
  text-align: left;
  padding: 10px 12px;
  white-space: nowrap;
  border-bottom: 2px solid var(--verde-200);
}

.tabela-op th {
  cursor: pointer;
  user-select: none;
}

.tabela-op th:hover {
  background: var(--verde-100);
}

.tabela-op td,
.tabela-dias td {
  padding: 10px 12px;
  text-align: justify;
  border-bottom: 1px solid var(--borda);
  vertical-align: middle;
}

.tabela-op tbody tr:hover > td {
  background: #f7fbf9;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.td-op {
  font-weight: 600;
  color: var(--verde-900);
  white-space: nowrap;
}

.td-op-descricao {
  display: block;
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--tinta-suave);
}

.td-acao {
  text-align: center;
}

.asterisco {
  font-size: 0.6rem;
  color: var(--verde-600);
  vertical-align: super;
}

.badge-efic {
  display: inline-block;
  min-width: 68px;
  text-align: center;
  border-radius: 999px;
  padding: 3px 10px;
  font-weight: 700;
  font-size: 0.82rem;
}

.badge-efic.efic-alta {
  background: var(--verde-100);
  color: var(--verde-800);
}

.badge-efic.efic-baixa {
  background: var(--alerta-fundo);
  color: var(--alerta);
}

.btn-detalhar {
  background: #fff;
  color: var(--verde-700);
  border: 1px solid var(--verde-500);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 0.82rem;
  font-weight: 600;
}

.btn-detalhar:hover {
  background: var(--verde-600);
  border-color: var(--verde-600);
  color: #fff;
}

/* ── Detalhe da OP ── */
.linha-detalhe > td {
  background: var(--verde-50);
  padding: 0;
}

.detalhe-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.detalhe-resumo {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  font-size: 0.86rem;
  color: var(--tinta);
}

.detalhe-resumo strong {
  color: var(--verde-800);
}

.tabela-dias {
  background: #fff;
}

/* ── Responsivo ── */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 14px;
  }

  .cabecalho {
    padding: 18px;
  }

  .cabecalho-info h2 {
    font-size: 1.3rem;
  }

  .grafico-box {
    height: 280px;
  }

  .card-valor {
    font-size: 1.5rem;
  }

  .input-data,
  .input-select {
    flex: 1 1 100%;
  }
}
</style>