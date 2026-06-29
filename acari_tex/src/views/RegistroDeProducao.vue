<template>
  <div>
    <SidebarNav />
    <carregandoTela v-if="loading" />

    <main v-else class="content-wrapper">
      <div class="page-section">

        <!-- HEADER -->
        <div class="header">
          <div class="header-actions">
            <div class="socket-status" :class="{ online: socketConectado }">
              <span class="status-dot"></span>
              {{ socketConectado ? 'Online' : 'Offline' }}
            </div>
            <input v-model="dataSelecionada" type="date" class="date-input" />
            <span v-if="carregandoMeta" class="data-loading">Atualizando…</span>
          </div>
        </div>

        <!-- SETUP CARD -->
        <div class="setup-card">

          <!-- LINHA SUPERIOR: título + turno -->
          <div class="setup-topbar">
            <div class="setup-title">
              <div class="setup-icon">⚙️</div>
              <div>
                <h3>Configuração do Dia</h3>
                <span>{{ funcionariosDia.length }} funcionários ativos</span>
              </div>
            </div>
            <div class="turno-config-group">
              <div class="turno-switch">
                <button :class="['turno-btn', turnoAtivo === 'manha' ? 'active' : '']" @click="turnoAtivo = 'manha'">
                  ☀️ Manhã
                </button>
                <button :class="['turno-btn', turnoAtivo === 'tarde' ? 'active' : '']" @click="turnoAtivo = 'tarde'">
                  🌙 Tarde
                </button>
              </div>

              <div class="horarios-config-inline">
                <select v-model="configTurnoAtivo.inicio" class="horario-select-sm" @change="onAlterarConfigHorario">
                  <option v-for="h in opcoesHoraInicio" :key="h" :value="h">{{ h }}</option>
                </select>
                <span class="horario-ate">até</span>
                <select v-model="configTurnoAtivo.fim" class="horario-select-sm" @change="onAlterarConfigHorario">
                  <option v-for="h in opcoesHoraFim" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- OPs ATIVAS -->
          <div class="ops-section">
            <div class="ops-list">
              <div v-for="(op, idx) in opsAtivas" :key="op._uid" class="op-card">
                <div class="op-card-header">
                  <span class="op-badge">OP {{ idx + 1 }}</span>
                  <button v-if="opsAtivas.length > 1" class="btn-remove-op" @click="removerOp(idx)">×</button>
                </div>

                <div class="op-fields">
                  <div class="field field-op">
                    <label>Ordem de Produção</label>
                    <select v-model="op.pecaId" @change="salvarMetaDia">
                      <option value="">Selecione uma OP</option>
                      <option v-for="peca in pecasDisponiveis(op.pecaId)" :key="peca.id_da_op" :value="peca.id_da_op">
                        {{ peca.descricao }}
                      </option>
                    </select>
                  </div>

                  <div class="field field-meta">
                    <label>Meta do Dia</label>
                    <div class="meta-input-wrap">
                      <input v-model.number="op.metaDia" type="number" min="0" placeholder="0" class="meta-input"
                        @input="salvarMetaDia" />
                      <span class="meta-suffix">peças</span>
                    </div>
                  </div>

                  <div class="field field-total">
                    <label>Produção Atual</label>
                    <div class="total-box">{{ calcularTotalOp(op.pecaId) }}</div>
                  </div>
                </div>

                <!-- BARRA DE PROGRESSO -->
                <div v-if="op.metaDia > 0 && op.pecaId" class="meta-progress">
                  <div class="meta-progress-top">
                    <span>Progresso</span>
                    <strong>{{ calcularTotalOp(op.pecaId) }} / {{ op.metaDia }}</strong>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill"
                      :style="{ width: Math.min((calcularTotalOp(op.pecaId) / op.metaDia) * 100, 100) + '%' }"></div>
                  </div>
                  <div class="progress-footer">
                    <span>{{ Math.round((calcularTotalOp(op.pecaId) / op.metaDia) * 100) || 0 }}% concluído</span>
                    <span>Faltam {{ Math.max(op.metaDia - calcularTotalOp(op.pecaId), 0) }} peças</span>
                  </div>
                </div>
              </div>
            </div>

            <button class="btn-add-op" @click="adicionarOp">
              <span>+</span> Nova OP
            </button>
          </div>

          <!-- TOTAL GERAL (quando há mais de 1 OP) -->
          <div v-if="opsAtivas.length > 1" class="total-geral-row">
            <span>Total geral de todas as OPs:</span>
            <div class="total-box-sm">{{ calcularTotalGeral() }}</div>
          </div>

        </div>

        <!-- TABELA AGRUPADA POR OP (MÓDULOS) -->
        <div v-if="opsAtivasComPeca.length > 0 && funcionariosAgrupadosPorOp.length > 0" class="ops-modulos-wrapper">
          <template v-for="grupo in funcionariosAgrupadosPorOp" :key="grupo.opId || 'sem-op'">

            <!-- HEADER DO MÓDULO -->
            <div
              :class="[
                'op-module-header',
                !grupo.opId ? 'op-module-header--empty' : '',
                opsAtivasComPeca.length === 1 ? 'op-module-header--single' : ''
              ]">

              <span class="op-module-badge">
                <span v-if="!grupo.opId">⚠ {{ grupo.label }}</span>
                <span v-else>📦 {{ grupo.label }}</span>
              </span>

              <!-- PAINÉIS DE CÁLCULO DUPLO — apenas para OPs com pecaId -->
              <div v-if="grupo.opId" class="calc-panels">

                <!-- PAINEL 1: FICHA TÉCNICA (tempo_padrao uniforme) -->
                <div class="calc-panel calc-panel--padrao">
                  <div class="calc-panel-title">
                    <span class="calc-panel-icon">📋</span>
                    Ficha Técnica
                  </div>
                  <div class="calc-panel-stats">
                    <div class="calc-stat">
                      <span class="calc-stat-label">👥 Funcionários</span>
                      <strong>{{ calcularFuncionariosOp(grupo.opId) }}</strong>
                    </div>
                    <div class="calc-stat">
                      <span class="calc-stat-label">📊 Produção</span>
                      <strong>{{ calcularTotalOp(grupo.opId) }}</strong>
                    </div>
                    <div class="calc-stat">
                      <span class="calc-stat-label">⚙ Capacidade</span>
                      <strong>{{ calcularCapacidadeOpPadrao(grupo.opId) }}</strong>
                    </div>
                    <div class="calc-stat">
                      <span class="calc-stat-label">🎯 Eficiência</span>
                      <strong :class="getEficClass(calcularEficienciaOpPadrao(grupo.opId))">
                        {{ calcularEficienciaOpPadrao(grupo.opId) }}%
                      </strong>
                    </div>
                  </div>
                </div>

                <div class="calc-panel-divider">vs</div>

                <!-- PAINEL 2: TEMPO DE REFERÊNCIA (individual por funcionário) -->
                <div class="calc-panel calc-panel--referencia">
                  <div class="calc-panel-title">
                    <span class="calc-panel-icon">👤</span>
                    Tempo de Referência
                  </div>
                  <div class="calc-panel-stats">
                    <div class="calc-stat">
                      <span class="calc-stat-label">👥 Funcionários</span>
                      <strong>{{ calcularFuncionariosOp(grupo.opId) }}</strong>
                    </div>
                    <div class="calc-stat">
                      <span class="calc-stat-label">📊 Produção</span>
                      <strong>{{ calcularTotalOp(grupo.opId) }}</strong>
                    </div>
                    <div class="calc-stat">
                      <span class="calc-stat-label">⚙ Capacidade</span>
                      <strong>{{ calcularCapacidadeOpReferencia(grupo.opId) }}</strong>
                    </div>
                    <div class="calc-stat">
                      <span class="calc-stat-label">🎯 Eficiência</span>
                      <strong :class="getEficClass(calcularEficienciaOpReferencia(grupo.opId))">
                        {{ calcularEficienciaOpReferencia(grupo.opId) }}%
                      </strong>
                    </div>
                  </div>
                </div>

              </div>

              <!-- Grupo sem OP: contagem simples -->
              <span v-else class="op-module-stats">
                <span class="stat">👥 <strong>{{ calcularFuncionariosOp(grupo.opId) }}</strong> func</span>
              </span>

            </div>

            <!-- TABELA DO MÓDULO -->
            <div class="table-wrapper">
              <div class="table-scroll">
                <table class="apontamento-table">
                  <thead>
                    <tr>
                      <th class="func-col">Funcionário</th>
                      <th class="etapa-col">Etapa</th>
                      <th v-for="hora in horasVisiveis" :key="hora" class="hora-th">{{ hora }}h</th>
                      <th class="total-col">Total</th>
                      <th class="efic-col">Efic. Ficha</th>
                      <th class="efic-col efic-col--ref">Efic. Ref.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="funcionario in grupo.funcionarios" :key="funcionario.email + '_' + (grupo.opId || 'sem')">
                      <tr v-for="(linha, idxLinha) in funcionario.linhas" :key="linha.id"
                        :class="{ 'linha-extra': linha.tipo === 'extra' }">

                        <!-- FUNCIONÁRIO -->
                        <td class="func-col">
                          <div v-if="idxLinha === 0" class="func-info">
                            <img :src="funcionario.foto || '/default-avatar.png'" />
                            <span>{{ funcionario.nome }}</span>
                          </div>
                          <div v-else class="extra-tag">↳ Extra</div>
                        </td>

                        <!-- ETAPA + indicadores de tempo (somente leitura) -->
                        <td class="etapa-col">
                          <div class="etapa-wrap">
                            <select v-model="linha.etapaId" class="etapa-select" @change="onAlterarEtapa(linha)">
                              <option value="">Etapa</option>
                              <optgroup v-for="op in opsAtivasComPeca" :key="op.pecaId" :label="nomeDaOp(op.pecaId)">
                                <option v-for="etapa in etapasDaOp(op.pecaId)"
                                  :key="(etapa.id_da_funcao || etapa.etapa?.id_da_funcao)"
                                  :value="etapa.id_da_funcao || etapa.etapa?.id_da_funcao">
                                  {{ etapa.descricao || etapa.etapa?.descricao }} ({{ etapa.tempo_padrao || etapa.etapa?.tempo_padrao }}min)
                                </option>
                              </optgroup>
                            </select>
                            <!-- × em todas as linhas extras -->
                            <button v-if="linha.tipo === 'extra'" class="btn-remove-linha"
                              @click="removerLinhaExtra(funcionario, idxLinha)" title="Remover esta etapa">×</button>
                            <!-- + sempre na última linha do funcionário (usa _funcRef para comprimento real) -->
                            <button v-if="idxLinha === (funcionario._funcRef || funcionario).linhas.length - 1"
                              class="btn-add-linha"
                              @click="adicionarLinhaExtra(funcionario)" title="Adicionar etapa">+</button>
                          </div>

                          <!-- SELETOR DE TEMPO: padrão ou uma das referências da etapa -->
                          <div v-if="linha.etapaId" class="tempo-toggle-wrap">
                            <select
                              class="tempo-select"
                              :value="linha.modoTempo === 'referencia' ? linha.referenciaSelecionadaId : '__padrao__'"
                              @change="onSelecionarTempo(linha, $event.target.value)">
                              <option value="__padrao__">⏱ Ficha: {{ linha.tempoPadrao }}min</option>
                              <option
                                v-for="ref in listarRefsDaEtapa(buscarEtapa(linha.etapaId))"
                                :key="ref.id"
                                :value="ref.id">
                                👤 {{ ref.nomeFunc }}: {{ ref.tempo }}min
                              </option>
                            </select>
                          </div>
                        </td>

                        <!-- HORAS -->
                        <td v-for="hora in horasVisiveis" :key="hora" class="hora-td">
                          <div class="hora-box-outer">
                            <!-- Esquerda: campo de quantidade + minutos -->
                            <div class="hora-box-inputs">
                              <input v-model.number="linha.registros[hora].quantidade" type="number" min="0" placeholder="0"
                                :class="['hora-input', linha.registros[hora].quantidade > 0 ? 'tem-producao' : '']"
                                @blur="onInputQuantidade(funcionario, linha, hora)" />
                              <div class="tempo-wrap">
                                <input v-model.number="linha.registros[hora].tempoProduzido" type="number" min="1" max="60"
                                  class="min-input" @input="onInputQuantidade(funcionario, linha, hora)" />
                                <span class="min-label">min</span>
                              </div>
                            </div>
                            <!-- Direita: FT e TR, só visíveis quando há produção -->
                            <div v-if="linha.registros[hora].quantidade > 0" class="efic-inline-col">
                              <span :class="['efic-inline', getEficClass(calcularEficienciaRegistroPadrao(linha.registros[hora].quantidade, linha.registros[hora].tempoProduzido, linha))]">
                                <span class="efic-inline-label">FT</span>
                                {{ calcularEficienciaRegistroPadrao(linha.registros[hora].quantidade, linha.registros[hora].tempoProduzido, linha) }}%
                              </span>
                              <span :class="['efic-inline efic-inline--ref', getEficClass(calcularEficienciaRegistroReferencia(linha.registros[hora].quantidade, linha.registros[hora].tempoProduzido, linha, funcionario))]">
                                <span class="efic-inline-label">TR</span>
                                {{ calcularEficienciaRegistroReferencia(linha.registros[hora].quantidade, linha.registros[hora].tempoProduzido, linha, funcionario) }}%
                              </span>
                            </div>
                          </div>
                        </td>

                        <!-- TOTAL -->
                        <td class="total-col">{{ calcularTotalLinha(linha) }}</td>

                        <!-- EFICIÊNCIA FICHA (por funcionário) -->
                        <td class="efic-col">
                          <div v-if="idxLinha === 0"
                            :class="['efic-badge', getEficClass(calcularEficienciaFuncionarioPadrao(funcionario))]">
                            {{ calcularEficienciaFuncionarioPadrao(funcionario)
                              ? calcularEficienciaFuncionarioPadrao(funcionario) + '%'
                              : '—' }}
                          </div>
                        </td>

                        <!-- EFICIÊNCIA REFERÊNCIA (por funcionário) -->
                        <td class="efic-col efic-col--ref">
                          <div v-if="idxLinha === 0"
                            :class="['efic-badge efic-badge--ref', getEficClass(calcularEficienciaFuncionarioReferencia(funcionario))]">
                            {{ calcularEficienciaFuncionarioReferencia(funcionario)
                              ? calcularEficienciaFuncionarioReferencia(funcionario) + '%'
                              : '—' }}
                          </div>
                        </td>

                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
        </div>

      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue'
import carregandoTela from '@/components/carregandoTela.vue'
import { useAuthStore } from '@/store/store'
import api from '@/Axios'
import router from '@/router'
import Swal from 'sweetalert2'
import { io } from 'socket.io-client'
import debounce from 'lodash/debounce'

const socket = io('https://acari-tex.onrender.com', { transports: ['websocket'] })

const LOCAL_STORAGE_KEY = 'apontamento-horarios-turno'

const CONFIG_PADRAO = {
  manha: { inicio: '08:00', fim: '12:30' },
  tarde: { inicio: '13:30', fim: '18:00' },
}

export default {
  name: 'ApontamentoDia',
  components: { SidebarNav, carregandoTela },
  setup() {
    return { store: useAuthStore() }
  },

  data() {
    return {
      loading: true,
      socketConectado: false,
      dataSelecionada: this.formatarDataLocal(),
      turnoAtivo: 'manha',
      opsAtivas: [this.novaOpSetup()],
      funcionarios: [],
      funcionariosDia: [],
      pecas: [],
      etapas: [],
      etapasMap: {},
      configHorarios: this.carregarConfigHorarios(),
      ultimaBuscaId: 0,
      carregandoMeta: false,
    }
  },

  computed: {
    configTurnoAtivo() {
      return this.configHorarios[this.turnoAtivo]
    },

    opcoesHoraInicio() {
      return this.gerarOpcoesHorario(6, 22)
    },

    opcoesHoraFim() {
      const todas = this.gerarOpcoesHorario(6, 23)
      const inicioMin = this.horaParaMinutos(this.configTurnoAtivo.inicio)
      return todas.filter(h => this.horaParaMinutos(h) > inicioMin)
    },

    horasVisiveis() {
      const { inicio, fim } = this.configTurnoAtivo
      return this.gerarSequenciaHoras(inicio, fim)
    },

    opsAtivasComPeca() {
      return this.opsAtivas.filter(op => op.pecaId)
    },

    funcionariosAgrupadosPorOp() {
      const gruposMap = new Map()

      gruposMap.set(null, {
        opId: null,
        label: 'Funcionários sem OP',
        funcionarios: [],
      })

      for (const op of this.opsAtivasComPeca) {
        gruposMap.set(op.pecaId, {
          opId: op.pecaId,
          label: this.nomeDaOp(op.pecaId),
          funcionarios: [],
        })
      }

      for (const func of this.funcionariosDia) {
        const linhasPorOp = new Map()

        for (const linha of func.linhas || []) {
          const key = linha.opId || null
          if (!linhasPorOp.has(key)) linhasPorOp.set(key, [])
          linhasPorOp.get(key).push(linha)
        }

        for (const [opId, linhas] of linhasPorOp) {
          const grupo = gruposMap.get(opId) || gruposMap.get(null)
          // Preserva referência ao objeto real: adicionarLinhaExtra e
          // removerLinhaExtra devem mutar func._funcRef.linhas, não a fatia.
          grupo.funcionarios.push({ ...func, linhas, _grupoOpId: opId, _funcRef: func })
        }
      }

      const ordem = [...this.opsAtivasComPeca.map(o => o.pecaId), null]
      return ordem
        .map(id => gruposMap.get(id))
        .filter(g => g.funcionarios.length > 0)
    },
  },

  watch: {
    dataSelecionada() {
      this.buscarMetaDia()
    },
  },

  async mounted() {
    if (!this.store.pegar_token) router.push('/')
    this.iniciarSocket()
    await this.aguardarConexaoSocket()
    await this.carregarDados()
    await this.buscarMetaDia()
  },

  beforeUnmount() {
    socket.off()
    socket.disconnect()
  },

  methods: {
    // ── DATA ──────────────────────────────────────────────
    formatarDataLocal(data = new Date()) {
      return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
    },

    // ── HORÁRIOS ──────────────────────────────────────────
    horaParaMinutos(hora) {
      const [h, m] = hora.split(':').map(Number)
      return h * 60 + m
    },

    minutosParaHora(minutos) {
      const h = Math.floor(minutos / 60) % 24
      const m = minutos % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    },

    gerarOpcoesHorario(horaInicial, horaFinal) {
      const opcoes = []
      for (let h = horaInicial; h <= horaFinal; h++) {
        opcoes.push(`${String(h).padStart(2, '0')}:00`)
        if (h < horaFinal) opcoes.push(`${String(h).padStart(2, '0')}:30`)
      }
      return opcoes
    },

    gerarSequenciaHoras(inicio, fim) {
      const inicioMin = this.horaParaMinutos(inicio)
      const fimMin = this.horaParaMinutos(fim)

      if (!inicio || !fim || fimMin <= inicioMin) {
        return inicio ? [inicio] : []
      }

      const sequencia = []
      let atual = inicioMin

      while (atual < fimMin) {
        sequencia.push(this.minutosParaHora(atual))
        atual += 60
      }

      sequencia.push(fim)
      return sequencia
    },

    carregarConfigHorarios() {
      try {
        const salvo = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (!salvo) return JSON.parse(JSON.stringify(CONFIG_PADRAO))

        const parsed = JSON.parse(salvo)
        return {
          manha: {
            inicio: parsed?.manha?.inicio || CONFIG_PADRAO.manha.inicio,
            fim: parsed?.manha?.fim || CONFIG_PADRAO.manha.fim,
          },
          tarde: {
            inicio: parsed?.tarde?.inicio || CONFIG_PADRAO.tarde.inicio,
            fim: parsed?.tarde?.fim || CONFIG_PADRAO.tarde.fim,
          },
        }
      } catch (err) {
        console.warn('Erro ao carregar horários salvos, usando padrão.', err)
        return JSON.parse(JSON.stringify(CONFIG_PADRAO))
      }
    },

    salvarConfigHorarios() {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.configHorarios))
      } catch (err) {
        console.warn('Não foi possível salvar os horários no navegador.', err)
      }
    },

    onAlterarConfigHorario() {
      const inicioMin = this.horaParaMinutos(this.configTurnoAtivo.inicio)
      const fimMin = this.horaParaMinutos(this.configTurnoAtivo.fim)

      if (fimMin <= inicioMin) {
        this.configTurnoAtivo.fim = this.opcoesHoraFim[0] || this.configTurnoAtivo.inicio
      }

      this.salvarConfigHorarios()
      this.ajustarRegistrosParaNovasHoras()
    },

    ajustarRegistrosParaNovasHoras() {
      const horasAtuais = this.horasVisiveis

      for (const funcionario of this.funcionariosDia) {
        for (const linha of funcionario.linhas || []) {
          if (!linha.registros) linha.registros = {}

          for (const hora of horasAtuais) {
            if (!linha.registros[hora]) {
              linha.registros[hora] = { quantidade: null, tempoProduzido: 60 }
            }
          }
        }
      }
    },

    // ── SOCKET ────────────────────────────────────────────
    iniciarSocket() {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('erro-producao')

      const cnpj = this.store.pegar_usuario?.cnpj
      if (cnpj) socket.off(`nova_atualizacao_${cnpj}`)

      socket.on('connect', () => { this.socketConectado = true })
      socket.on('disconnect', () => { this.socketConectado = false })
      socket.on('erro-producao', err => { console.log(err) })

      if (cnpj) {
        socket.on(`nova_atualizacao_${cnpj}`, () => this.onAtualizacaoRemota())
      }

      if (!socket.connected) {
        socket.connect()
      } else {
        this.socketConectado = true
      }
    },

    onAtualizacaoRemota: debounce(function () {
      this.buscarMetaDia()
    }, 800),

    aguardarConexaoSocket(timeoutMs = 5000) {
      if (socket.connected) {
        this.socketConectado = true
        return Promise.resolve()
      }

      return new Promise(resolve => {
        const timeout = setTimeout(() => {
          socket.off('connect', onConnect)
          resolve()
        }, timeoutMs)

        const onConnect = () => {
          clearTimeout(timeout)
          resolve()
        }

        socket.once('connect', onConnect)
      })
    },

    // ── CARREGAMENTO ──────────────────────────────────────
    async carregarDados() {
      try {
        const token = this.store.pegar_token

        const [resFuncs, resPecas] = await Promise.all([
          api.get('/Funcionarios', { headers: { Authorization: token } }),
          api.get('/pecas', { headers: { Authorization: token } }),
        ])

        this.funcionarios = resFuncs.data.funcionarios || []
        this.pecas = resPecas.data.peca.em_progresso || []
        this.etapas = this.pecas.map(p => p.etapas || [])

        this.etapasMap = {}
        for (const listaEtapas of this.etapas) {
          for (const e of listaEtapas) {
            const idFuncao = e.id_da_funcao || e.etapa?.id_da_funcao
            if (idFuncao) this.etapasMap[idFuncao] = e
          }
        }

        this.inicializarFuncionarios()

      } catch (err) {
        console.log(err)
        Swal.fire('Erro', 'Erro ao carregar dados', 'error')
      } finally {
        this.loading = false
      }
    },

    // ── OPs SETUP ─────────────────────────────────────────
    novaOpSetup() {
      return { _uid: Date.now() + Math.random(), pecaId: '', metaDia: 0 }
    },

    adicionarOp() {
      this.opsAtivas.push(this.novaOpSetup())
    },

    removerOp(idx) {
      this.opsAtivas.splice(idx, 1)
      this.salvarMetaDia()
    },

    pecasDisponiveis(pecaIdAtual) {
      const selecionadas = this.opsAtivas.map(o => o.pecaId).filter(id => id && id !== pecaIdAtual)
      return this.pecas.filter(p => !selecionadas.includes(p.id_da_op))
    },

    nomeDaOp(pecaId) {
      const peca = this.pecas.find(p => p.id_da_op === pecaId)
      return peca?.descricao || pecaId
    },

    etapasDaOp(pecaId) {
      return this.etapas.flat().filter(e => e.id_da_op === pecaId)
    },

    // ── FUNCIONÁRIOS ──────────────────────────────────────
    inicializarFuncionarios() {
      this.funcionariosDia = this.funcionarios
        .filter(func => Number(func.permissoes) !== 1)
        .map(func => ({
          ...func,
          linhas: [this.novaLinha('principal')],
        }))
    },

    novaLinha(tipo = 'extra') {
      return {
        id: Date.now() + Math.random(),
        tipo,
        etapaId: '',
        descricao: '',
        tempoPadrao: 0,
        opId: null,
        // Qual tempo está sendo usado na exibição: 'padrao' | 'referencia'
        // Usado apenas para colorir o toggle na UI — os dois painéis de
        // cálculo (Ficha Técnica e Referência) sempre existem em paralelo.
        modoTempo: 'padrao',
        referenciaSelecionadaId: null,
        registros: this.criarRegistros(),
      }
    },

    criarRegistros() {
      const registros = {}
      const horas = [
        ...this.gerarSequenciaHoras(this.configHorarios.manha.inicio, this.configHorarios.manha.fim),
        ...this.gerarSequenciaHoras(this.configHorarios.tarde.inicio, this.configHorarios.tarde.fim),
      ]
      for (const hora of horas) {
        registros[hora] = { quantidade: null, tempoProduzido: 60 }
      }
      return registros
    },

    adicionarLinhaExtra(funcionario) {
      // funcionario pode ser a fatia do grupo (com _funcRef apontando ao real)
      const real = funcionario._funcRef || funcionario
      if (!Array.isArray(real.linhas)) real.linhas = []
      real.linhas.push(this.novaLinha('extra'))
      this.salvarMetaDia()
    },

    removerLinhaExtra(funcionario, idxLinha) {
      const real = funcionario._funcRef || funcionario
      real.linhas.splice(idxLinha, 1)
      this.salvarMetaDia()
    },

    /**
     * Lista todas as referências de tempo de uma etapa, com nome do
     * funcionário resolvido a partir de this.funcionarios.
     * Retorna: [{ id, nomeFunc, tempo }]
     */
    listarRefsDaEtapa(etapa) {
      if (!etapa) return []
      const refs = etapa.tempo_referencia || etapa.etapa?.tempo_referencia || []
      if (!Array.isArray(refs) || !refs.length) return []

      return refs
        .filter(r => r && (r.tempo_minutos || r.tempo_por_peca))
        .map(r => {
          const t = Number(r.tempo_minutos ?? r.tempo_por_peca ?? 0)
          const func = this.funcionarios.find(f => f.email === r.id_funcionario)
          return {
            id: r.id_funcionario,           // usa email como id único
            nomeFunc: func?.nome || r.id_funcionario,
            tempo: t,
          }
        })
        .filter(r => r.tempo > 0)
    },

    /**
     * Chamado quando o select de tempo muda.
     * Se o valor for '__padrao__', usa tempo padrão da ficha técnica.
     * Caso contrário, é o id da referência escolhida (email do funcionário).
     */
    onSelecionarTempo(linha, valor) {
      if (valor === '__padrao__') {
        linha.modoTempo = 'padrao'
        linha.referenciaSelecionadaId = null
      } else {
        linha.modoTempo = 'referencia'
        linha.referenciaSelecionadaId = valor
      }
    },

    // ── RESOLVERS DE TEMPO ────────────────────────────────
    /**
     * Retorna todas as referências de tempo cadastradas para uma OP,
     * cruzando funcionários alocados com as etapas dessa OP.
     * Retorna: [{ funcionarioId, nomeFunc, foto, etapaId, etapaDescricao, tempo, tempoPadrao }]
     * Exibido no painel de referências acima de cada tabela de módulo.
     */
    listarReferenciasOp(opId) {
      if (!opId) return []
      const resultado = []
      const etapasOp = this.etapas.flat().filter(e => e.id_da_op === opId)

      for (const func of this.funcionariosDia) {
        // verifica se o funcionário tem pelo menos uma linha nessa OP
        const temLinhaOp = (func.linhas || []).some(l => l.opId === opId)
        if (!temLinhaOp) continue

        for (const etapa of etapasOp) {
          const refs = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []
          if (!Array.isArray(refs)) continue

          const ref = refs.find(r => r && r.id_funcionario === func.email)
          if (!ref) continue

          const t = Number(ref.tempo_minutos ?? ref.tempo_por_peca ?? 0)
          if (!t) continue

          resultado.push({
            funcionarioId: func.email,
            nomeFunc: func.nome || func.email,
            foto: func.foto || null,
            etapaId: etapa.id_da_funcao || etapa.etapa?.id_da_funcao,
            etapaDescricao: etapa.descricao || etapa.etapa?.descricao || '—',
            tempo: t,
            tempoPadrao: Number(etapa.tempo_padrao ?? etapa.etapa?.tempo_padrao ?? 0),
          })
        }
      }

      return resultado
    },
    /**
     * Retorna o tempo_padrao da ficha técnica para uma linha.
     * Ponto único de verdade para o cálculo pela Ficha Técnica.
     * Tolerante a backend: lê da etapa global ou do campo cacheado na linha.
     */
    resolverTempoPadrao(linha) {
      const etapa = this.buscarEtapa(linha?.etapaId)
      return Number(
        etapa?.tempo_padrao
        ?? etapa?.etapa?.tempo_padrao
        ?? linha?.tempoPadrao
        ?? 0
      )
    },

    /**
     * Retorna o tempo_minutos do funcionário em tempo_referencia da etapa,
     * ou null se não houver registro para este funcionário.
     * NÃO faz fallback — o chamador decide o que fazer com null.
     */
    resolverTempoReferencia(funcionario, linha) {
      const etapa = this.buscarEtapa(linha?.etapaId)
      const refs = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []

      if (!Array.isArray(refs) || !funcionario?.email) return null

      const ref = refs.find(r => r && r.id_funcionario === funcionario.email)
      if (!ref) return null

      const t = Number(ref.tempo_minutos ?? ref.tempo_por_peca ?? 0)
      return t > 0 ? t : null
    },

    /**
     * Tempo efetivo para o cálculo pelo painel "Tempo de Referência".
     *
     * Respeita a escolha do select de cada linha:
     *   – modoTempo === 'referencia' → usa o tempo da referência selecionada
     *     (referenciaSelecionadaId é o id_funcionario do registro escolhido)
     *   – modoTempo === 'padrao' (ou sem escolha) → usa tempo_padrao
     *
     * Fallback final: se a referência escolhida não for encontrada, usa tempo_padrao.
     */
    resolverTempoEfetivoReferencia(funcionario, linha) {
      if (linha?.modoTempo === 'referencia' && linha?.referenciaSelecionadaId) {
        const etapa = this.buscarEtapa(linha.etapaId)
        const refs = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []
        const ref = Array.isArray(refs)
          ? refs.find(r => r && r.id_funcionario === linha.referenciaSelecionadaId)
          : null
        if (ref) {
          const t = Number(ref.tempo_minutos ?? ref.tempo_por_peca ?? 0)
          if (t > 0) return t
        }
      }
      // Fallback: tempo padrão da ficha técnica
      return this.resolverTempoPadrao(linha)
    },

    // ── ETAPA ─────────────────────────────────────────────
    onAlterarEtapa(linha) {
      const etapa = this.buscarEtapa(linha.etapaId)
      linha.tempoPadrao = Number(etapa?.tempo_padrao ?? etapa?.etapa?.tempo_padrao ?? 0)
      linha.descricao = etapa?.descricao || etapa?.etapa?.descricao || ''
      linha.opId = etapa?.id_da_op || null
      this.salvarMetaDia()
    },

    buscarEtapa(etapaId) {
      return this.etapas.flat().find(e => e.id_da_funcao === etapaId)
    },

    // ── ETAPA FINAL ──────────────────────────────────────
    isEtapaFinal(linha) {
      if (!linha?.descricao) return false
      const d = linha.descricao.toLowerCase()
      if (d.includes('revisão intermediaria') || d.includes('revisao intermediaria')) return false
      return (
        d.includes('final') || d.includes('revisão final') || d.includes('revisao final') ||
        d.includes('revisão') || d.includes('revisao') ||
        d.includes('acabamento') || d.includes('qualidade')
      )
    },

    // ── TOTAIS ────────────────────────────────────────────
    calcularTotalLinha(linha) {
      if (!linha?.registros) return 0
      return Object.values(linha.registros).reduce((s, r) => s + Number(r?.quantidade || 0), 0)
    },

    calcularTotalFuncionario(funcionario) {
      if (!Array.isArray(funcionario?.linhas)) return 0
      return funcionario.linhas.reduce((soma, linha) => {
        if (!this.isEtapaFinal(linha)) return soma
        return soma + this.calcularTotalLinha(linha)
      }, 0)
    },

    calcularTotalGeral() {
      return this.funcionariosDia.reduce((s, f) => s + this.calcularTotalFuncionario(f), 0)
    },

    calcularTotalOp(pecaId) {
      if (!pecaId) return 0
      let total = 0
      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (!this.isEtapaFinal(linha) || linha.opId !== pecaId) continue
          total += this.calcularTotalLinha(linha)
        }
      }
      return total
    },

    calcularFuncionariosOp(opId) {
      if (!opId) return 0
      const emails = new Set()
      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (linha.opId === opId) { emails.add(func.email); break }
        }
      }
      return emails.size
    },

    // ── CÁLCULOS — FICHA TÉCNICA (tempo_padrao uniforme) ──
    /**
     * Eficiência da OP usando tempo_padrao para todos os funcionários.
     * Lógica original preservada sem alteração.
     */
    calcularEficienciaOpPadrao(opId) {
      if (!opId) return 0
      let somaProduzida = 0
      let somaTempo = 0

      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (linha.opId !== opId) continue
          const tempo = this.resolverTempoPadrao(linha)
          for (const reg of Object.values(linha.registros || {})) {
            if (reg && reg.quantidade > 0) {
              somaProduzida += reg.quantidade * tempo
              somaTempo += reg.tempoProduzido || 60
            }
          }
        }
      }

      if (!somaTempo) return 0
      return Math.round((somaProduzida / somaTempo) * 100)
    },

    /**
     * Capacidade da OP pela Ficha Técnica.
     *
     * Usa o tempo realmente registrado (soma de tempoProduzido de cada
     * registro com produção > 0) em vez de uma jornada fixa.
     * Fórmula: Σ floor(tempoProduzido_do_registro / tempo_padrao)
     * — ou seja, quantas peças o padrão indicaria naquele intervalo real.
     * Quando nenhum registro existe ainda, estima com as horas visíveis.
     */
    calcularCapacidadeOpPadrao(opId) {
      if (!opId) return 0
      let capacidade = 0
      let tempoRegistrado = 0

      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (linha.opId !== opId) continue
          const t = this.resolverTempoPadrao(linha)
          if (!t) continue
          for (const reg of Object.values(linha.registros || {})) {
            if (reg && reg.quantidade > 0) {
              const minutos = reg.tempoProduzido || 60
              capacidade += Math.floor(minutos / t)
              tempoRegistrado += minutos
            }
          }
        }
      }

      // Sem registros ainda: estima pela configuração do turno
      if (!tempoRegistrado) {
        const minutosUteis = (this.horasVisiveis?.length || 1) * 60
        for (const func of this.funcionariosDia) {
          for (const linha of func.linhas || []) {
            if (linha.opId !== opId) continue
            const t = this.resolverTempoPadrao(linha) || 60
            if (t > 0) capacidade += Math.floor(minutosUteis / t)
          }
        }
      }

      return capacidade
    },

    /**
     * Eficiência do funcionário usando tempo_padrao em todas as linhas.
     */
    calcularEficienciaFuncionarioPadrao(funcionario) {
      if (!funcionario?.linhas?.length) return 0
      let somaProduzida = 0
      let somaTempo = 0

      for (const linha of funcionario.linhas) {
        if (!linha?.registros) continue
        const tempo = this.resolverTempoPadrao(linha)
        for (const reg of Object.values(linha.registros)) {
          if (reg && reg.quantidade > 0) {
            somaProduzida += reg.quantidade * tempo
            somaTempo += reg.tempoProduzido || 60
          }
        }
      }

      if (!somaTempo) return 0
      return Math.round((somaProduzida / somaTempo) * 100)
    },

    /**
     * Eficiência de um registro individual — Ficha Técnica.
     */
    calcularEficienciaRegistroPadrao(quantidade, tempoProduzido, linha) {
      const tempo = this.resolverTempoPadrao(linha)
      if (!quantidade || !tempoProduzido || !tempo) return 0
      return Math.round(((quantidade * tempo) / tempoProduzido) * 100)
    },

    // ── CÁLCULOS — TEMPO DE REFERÊNCIA (individual) ───────
    /**
     * Eficiência da OP usando o tempo efetivo de cada funcionário.
     * Lucas → tempo_referencia de Lucas; Maria → tempo_padrao (sem ref); etc.
     * Consolidado após cálculo individual.
     */
    calcularEficienciaOpReferencia(opId) {
      if (!opId) return 0
      let somaProduzida = 0
      let somaTempo = 0

      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (linha.opId !== opId) continue
          const tempo = this.resolverTempoEfetivoReferencia(func, linha)
          for (const reg of Object.values(linha.registros || {})) {
            if (reg && reg.quantidade > 0) {
              somaProduzida += reg.quantidade * tempo
              somaTempo += reg.tempoProduzido || 60
            }
          }
        }
      }

      if (!somaTempo) return 0
      return Math.round((somaProduzida / somaTempo) * 100)
    },

    /**
     * Capacidade da OP pelo Tempo de Referência Individual.
     *
     * Mesma fórmula que a Ficha Técnica, mas o tempo usado por linha é:
     *   – tempo_referencia do funcionário, quando existir
     *   – tempo_padrao como fallback
     * Cada funcionário pode ter um tempo diferente para a mesma etapa.
     */
    calcularCapacidadeOpReferencia(opId) {
      if (!opId) return 0
      let capacidade = 0
      let tempoRegistrado = 0

      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (linha.opId !== opId) continue
          const t = this.resolverTempoEfetivoReferencia(func, linha)
          if (!t) continue
          for (const reg of Object.values(linha.registros || {})) {
            if (reg && reg.quantidade > 0) {
              const minutos = reg.tempoProduzido || 60
              capacidade += Math.floor(minutos / t)
              tempoRegistrado += minutos
            }
          }
        }
      }

      // Sem registros ainda: estima pela configuração do turno
      if (!tempoRegistrado) {
        const minutosUteis = (this.horasVisiveis?.length || 1) * 60
        for (const func of this.funcionariosDia) {
          for (const linha of func.linhas || []) {
            if (linha.opId !== opId) continue
            const t = this.resolverTempoEfetivoReferencia(func, linha) || 60
            if (t > 0) capacidade += Math.floor(minutosUteis / t)
          }
        }
      }

      return capacidade
    },

    /**
     * Eficiência do funcionário usando tempo_referencia individual por linha.
     */
    calcularEficienciaFuncionarioReferencia(funcionario) {
      if (!funcionario?.linhas?.length) return 0
      let somaProduzida = 0
      let somaTempo = 0

      for (const linha of funcionario.linhas) {
        if (!linha?.registros) continue
        const tempo = this.resolverTempoEfetivoReferencia(funcionario, linha)
        for (const reg of Object.values(linha.registros)) {
          if (reg && reg.quantidade > 0) {
            somaProduzida += reg.quantidade * tempo
            somaTempo += reg.tempoProduzido || 60
          }
        }
      }

      if (!somaTempo) return 0
      return Math.round((somaProduzida / somaTempo) * 100)
    },

    /**
     * Eficiência de um registro individual — Tempo de Referência.
     */
    calcularEficienciaRegistroReferencia(quantidade, tempoProduzido, linha, funcionario) {
      const tempo = this.resolverTempoEfetivoReferencia(funcionario, linha)
      if (!quantidade || !tempoProduzido || !tempo) return 0
      return Math.round(((quantidade * tempo) / tempoProduzido) * 100)
    },

    // ── UTILITÁRIOS ───────────────────────────────────────
    getEficClass(pct) {
      if (pct >= 100) return 'efic-alta'
      if (pct >= 75) return 'efic-media'
      if (pct > 0) return 'efic-baixa'
      return ''
    },

    // ── INPUT ─────────────────────────────────────────────
    // Payload idêntico ao original — zero campos de tempo adicionados
    onInputQuantidade: debounce(function (funcionario, linha, hora) {
      const registro = linha.registros[hora]
      if (!funcionario?.email || !linha?.etapaId) return

      const etapa = this.buscarEtapa(linha.etapaId)
      socket.emit('salvar-producao', {
        funcionarioId: funcionario.email,
        etapaId: linha.etapaId,
        opId: etapa?.id_da_op || null,
        quantidade: registro.quantidade || 0,
        hora,
        data: this.dataSelecionada,
        estabelecimento: this.store.pegar_usuario.cnpj,
        tipoRegistro: linha.tipo,
        tempoProduzido: registro.tempoProduzido || 60,
      })
    }, 1500),

    // ── META ──────────────────────────────────────────────
    // Payload idêntico ao original — zero campos de tempo adicionados
    salvarMetaDia: debounce(function () {
      const pecasAtivas = this.opsAtivasComPeca
      if (!pecasAtivas.length) return

      socket.emit('salvar-meta-dia', {
        estabelecimento: this.store.pegar_usuario.cnpj,
        usuario: this.store.pegar_usuario.email,
        data: this.dataSelecionada,
        pecas: pecasAtivas.map(op => ({
          id_da_op: op.pecaId,
          meta: op.metaDia,
        })),
        funcionarios: this.funcionariosDia.map(func => ({
          funcionarioId: func.email,
          linhas: (func.linhas || []).map(linha => ({
            tipo: linha.tipo,
            etapaId: linha.etapaId,
            opId: linha.opId,
          })),
        })),
      })
    }, 500),

    // ── BUSCAR META ───────────────────────────────────────
    async buscarMetaDia() {
      await this.aguardarConexaoSocket()

      const dataDaRequisicao = this.dataSelecionada
      this.ultimaBuscaId = (this.ultimaBuscaId || 0) + 1
      const buscaId = this.ultimaBuscaId
      this.carregandoMeta = true

      setTimeout(() => {
        if (buscaId === this.ultimaBuscaId) this.carregandoMeta = false
      }, 8000)

      socket.emit(
        'buscar-meta-dia',
        { estabelecimento: this.store.pegar_usuario.cnpj, data: dataDaRequisicao },
        response => {
          if (buscaId !== this.ultimaBuscaId || dataDaRequisicao !== this.dataSelecionada) return

          this.carregandoMeta = false
          if (!response?.sucesso) return

          const meta = response.metaDia
          if (!meta) {
            this.opsAtivas = [this.novaOpSetup()]
            this.inicializarFuncionarios()
            return
          }

          if (meta.pecas?.length) {
            this.opsAtivas = meta.pecas.map(p => ({
              _uid: Date.now() + Math.random(),
              pecaId: p.id_da_op,
              metaDia: p.meta || 0,
            }))
          }

          this.inicializarFuncionarios()

          for (const metaFunc of meta.funcionarios || []) {
            const funcionario = this.funcionariosDia.find(f => f.email === metaFunc.funcionarioId)
            if (!funcionario) continue

            const linhas = []

            for (const producao of metaFunc.producoes || []) {
              const etapaId = producao.id_da_funcao
              let linha = linhas.find(l => l.etapaId === etapaId)

              if (!linha) {
                linha = this.novaLinha(linhas.length === 0 ? 'principal' : 'extra')
                linha.etapaId = etapaId
                linha.descricao = producao.producao_etapa?.descricao || ''
                linha.tempoPadrao = producao.producao_etapa?.tempo_padrao || 0
                linha.opId = producao.id_da_op || null
                // tempo_referencia é lido da etapa global em tempo de execução —
                // nenhuma informação de modo ou seleção é restaurada/persistida.
                linhas.push(linha)
              }

              const hora = producao.hora_registro
              if (!hora) continue

              // Garante que a hora existe no objeto de registros mesmo que
              // o turno configurado tenha mudado desde o lançamento original.
              // Isso também suporta múltiplas etapas no mesmo período:
              // cada linha tem seu próprio objeto registros, portanto dois
              // lançamentos na mesma hora mas em etapas distintas ficam em
              // linhas separadas sem conflito.
              if (!linha.registros[hora]) {
                linha.registros[hora] = { quantidade: null, tempoProduzido: 60 }
              }

              linha.registros[hora] = {
                quantidade: producao.quantidade_pecas || 0,
                tempoProduzido: producao.tempo_produzido || 60,
              }
            }

            funcionario.linhas = linhas.length ? linhas : [this.novaLinha('principal')]
          }
        }
      )
    },
  },
}
</script>

<style scoped>
* { box-sizing: border-box; }

.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
  min-height: 100vh;
}

.page-section { padding: 1.2rem; }

/* ── HEADER ─────────────────────────────────────────── */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.header-actions { display: flex; align-items: center; gap: 10px; }

.socket-status {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  background: #ffecec;
  color: #d23b3b;
}

.socket-status.online { background: #e7f8ef; color: #0d7a3f; }

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.date-input {
  height: 38px;
  border-radius: 12px;
  border: 1px solid #dceee3;
  padding: 0 14px;
  font-family: inherit;
  background: white;
}

.data-loading {
  font-size: 13px;
  font-weight: 700;
  color: #0d6632;
  animation: pulseFade 1.1s ease-in-out infinite;
}

@keyframes pulseFade {
  0%, 100% { opacity: .5; }
  50% { opacity: 1; }
}

/* ── SETUP CARD ─────────────────────────────────────── */
.setup-card {
  background: linear-gradient(135deg, #ffffff, #f8fcf9);
  border-radius: 24px;
  border: 1px solid #dceee3;
  padding: 1.4rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 18px rgba(0,0,0,.03);
}

.setup-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.4rem;
  flex-wrap: wrap;
}

.setup-title { display: flex; align-items: center; gap: 14px; }

.setup-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
  font-size: 22px;
  box-shadow: 0 8px 20px rgba(13,102,50,.2);
}

.setup-title h3 { margin: 0; font-size: 23px; color: #052e14; }
.setup-title span { font-size: 14px; color: #72907e; }

.turno-switch {
  display: flex;
  gap: 6px;
  background: #edf7f1;
  padding: 5px;
  border-radius: 16px;
}

.turno-btn {
  height: 42px;
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #6d8c79;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
  font-size: 14px;
}

.turno-btn:hover { background: rgba(13,102,50,.08); }

.turno-btn.active {
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
  box-shadow: 0 4px 14px rgba(13,102,50,.25);
}

.turno-config-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.horarios-config-inline { display: flex; align-items: center; gap: 6px; }

.horario-select-sm {
  height: 42px;
  border-radius: 12px;
  border: 1px solid #dceee3;
  background: white;
  padding: 0 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: #052e14;
  transition: .2s;
}

.horario-select-sm:focus {
  border-color: #118a43;
  box-shadow: 0 0 0 4px rgba(17,138,67,.08);
  outline: none;
}

.horario-ate { font-size: 13px; font-weight: 700; color: #648673; }

/* ── OPs SECTION ────────────────────────────────────── */
.ops-section { display: flex; flex-direction: column; gap: 1rem; }
.ops-list { display: flex; flex-wrap: wrap; gap: 1rem; }

.op-card {
  flex: 1 1 340px;
  background: white;
  border: 1px solid #dceee3;
  border-radius: 18px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: .75rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.03);
}

.op-card-header { display: flex; align-items: center; justify-content: space-between; }

.op-badge {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .06em;
  color: #0d6632;
  background: #e7f8ef;
  border-radius: 8px;
  padding: 3px 10px;
  text-transform: uppercase;
}

.btn-remove-op {
  width: 26px; height: 26px;
  border: none; border-radius: 8px;
  background: #ffecec; color: #d93b3b;
  font-size: 16px; font-weight: 700; cursor: pointer; line-height: 1;
}

.op-fields {
  display: grid;
  grid-template-columns: 1fr 180px 120px;
  gap: .75rem;
  align-items: end;
}

.field { display: flex; flex-direction: column; gap: 6px; }

.field label { font-size: 12px; font-weight: 700; color: #648673; padding-left: 2px; }

.field select {
  height: 46px;
  border-radius: 13px;
  border: 1px solid #dceee3;
  background: white;
  padding: 0 12px;
  font-family: inherit;
  font-size: 14px;
  width: 100%;
  transition: .2s;
}

.field select:focus {
  border-color: #118a43;
  box-shadow: 0 0 0 4px rgba(17,138,67,.08);
  outline: none;
}

.meta-input-wrap {
  height: 46px;
  border-radius: 13px;
  border: 1px solid #dceee3;
  background: white;
  display: flex;
  align-items: center;
  overflow: hidden;
  transition: .2s;
}

.meta-input-wrap:focus-within {
  border-color: #118a43;
  box-shadow: 0 0 0 4px rgba(17,138,67,.08);
}

.meta-input {
  flex: 1; height: 100%; border: none; background: transparent;
  padding: 0 12px; font-size: 17px; font-weight: 700; color: #052e14;
}

.meta-input:focus { outline: none; }

.meta-suffix {
  height: 100%; padding: 0 12px;
  display: flex; align-items: center;
  background: #f2f8f4; border-left: 1px solid #e2eee7;
  color: #5d8470; font-size: 12px; font-weight: 700;
}

.total-box {
  height: 46px; border-radius: 13px;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white; display: flex; align-items: center; justify-content: center;
  font-size: 23px; font-weight: 800;
  box-shadow: 0 6px 16px rgba(13,102,50,.2);
}

.meta-progress {
  margin-top: .25rem; padding: .85rem 1rem;
  border-radius: 14px;
  background: linear-gradient(135deg, #f7fcf9, #edf7f1);
  border: 1px solid #dceee3;
}

.meta-progress-top {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px; font-size: 13px; color: #537664;
}

.meta-progress-top strong { color: #052e14; font-size: 14px; }

.progress-bar {
  width: 100%; height: 12px; border-radius: 999px;
  background: #dceee3; overflow: hidden;
}

.progress-fill {
  height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, #0d6632, #20b15a);
  transition: width .3s ease;
}

.progress-footer {
  margin-top: 8px; display: flex; justify-content: space-between;
  font-size: 12px; color: #648673;
}

.btn-add-op {
  align-self: flex-start;
  display: flex; align-items: center; gap: 6px;
  height: 40px; padding: 0 18px;
  border: 2px dashed #b2d9c0; border-radius: 13px;
  background: transparent; color: #0d6632;
  font-size: 14px; font-weight: 700; cursor: pointer;
  transition: .2s; font-family: inherit;
}

.btn-add-op:hover { background: #edf7f1; border-color: #0d6632; }
.btn-add-op span { font-size: 18px; line-height: 1; }

.total-geral-row {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 12px; margin-top: 1rem; padding-top: 1rem;
  border-top: 1px solid #e6f2ea;
  font-size: 14px; font-weight: 700; color: #537664;
}

.total-box-sm {
  min-width: 80px; height: 40px; border-radius: 12px;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white; display: flex; align-items: center; justify-content: center;
  font-size: 19px; font-weight: 800;
  box-shadow: 0 4px 12px rgba(13,102,50,.2);
  padding: 0 16px;
}

/* ── TABLE ──────────────────────────────────────────── */
.table-wrapper {
  background: white; border-radius: 20px;
  border: 1px solid #e3f0e7; overflow: hidden;
}

.table-scroll { overflow-x: auto; }

.apontamento-table {
  width: 100%; border-collapse: collapse; min-width: 1400px;
}

.apontamento-table thead {
  background: linear-gradient(90deg, #0d6632, #084d24);
}

.apontamento-table th {
  height: 48px; color: white; font-size: 13px; font-weight: 700;
  padding: 0 10px; text-align: left; white-space: nowrap;
}

.apontamento-table td {
  border-bottom: 1px solid #edf6f1;
  padding: 8px 10px;
  vertical-align: middle;
}

/* ── COLUNA FUNCIONÁRIO ─────────────────────────────── */
.func-col { width: 180px; min-width: 180px; }

.func-info {
  display: flex; align-items: center; gap: 10px;
}

.func-info img {
  width: 36px; height: 36px; border-radius: 9px;
  object-fit: cover; flex-shrink: 0;
}

.func-info span { font-size: 13px; font-weight: 700; color: #052e14; }

.extra-tag {
  padding-left: 8px;
  font-size: 12px; font-weight: 700; color: #5d8972;
}

/* ── COLUNA ETAPA ───────────────────────────────────── */
.etapa-col { width: 230px; min-width: 230px; vertical-align: top; padding-top: 10px; }

.etapa-wrap { display: flex; align-items: center; gap: 5px; }

.etapa-select {
  flex: 1; height: 34px; border-radius: 9px;
  border: 1px solid #dceee3; padding: 0 8px;
  font-size: 12px; font-family: inherit; background: white;
  min-width: 0;
}

.etapa-select:focus { outline: none; border-color: #118a43; }

.btn-add-linha, .btn-remove-linha {
  width: 26px; height: 26px; border: none; border-radius: 7px;
  font-size: 16px; font-weight: 700; cursor: pointer;
  flex-shrink: 0; line-height: 1; display: flex;
  align-items: center; justify-content: center;
}

.btn-add-linha { background: #0d6632; color: white; }
.btn-remove-linha { background: #ffecec; color: #d93b3b; }
.linha-extra { background: #f9fcfa; }

/* ── SELETOR DE TEMPO ───────────────────────────────── */
.tempo-toggle-wrap { margin-top: 5px; }

.tempo-select {
  height: 22px; border-radius: 7px;
  border: 1px solid #d4e8dc; background: #f2faf5;
  color: #052e14; font-size: 11px; font-weight: 600;
  font-family: inherit; padding: 0 6px; cursor: pointer;
  width: 100%; max-width: 240px; transition: border-color .15s;
}

.tempo-select:focus { outline: none; border-color: #0d6632; }

.sem-referencia { font-size: 10px; color: #b0c5b8; font-style: italic; }

/* ── COLUNAS DE HORA ────────────────────────────────── */
.hora-th { min-width: 120px; text-align: center !important; }
.hora-td { padding: 6px 6px; vertical-align: middle; }

/* Linha horizontal: [quantidade + min] [FT / TR] */
.hora-box-outer {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

/* Bloco esquerdo: input de quantidade + input de minutos */
.hora-box-inputs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.hora-input {
  width: 52px; height: 32px; border-radius: 8px;
  border: 1px solid #dceee3; text-align: center;
  font-size: 14px; font-weight: 700; font-family: inherit; transition: .15s;
}

.hora-input:focus { outline: none; border-color: #0d6632; }

.hora-input.tem-producao {
  background: #e9f2ff; border-color: #2b77d9; color: #1454ad;
}

.tempo-wrap { display: flex; align-items: center; gap: 2px; }

.min-input {
  width: 36px; height: 20px; border-radius: 6px;
  border: 1px solid #ddebe3; text-align: center;
  font-size: 10px; background: #f8fcf9; color: #69907b;
}

.min-label { font-size: 10px; color: #8ca998; }

/* ── INDICADORES FT / TR (à direita do input) ───────── */
.efic-inline-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.efic-inline {
    display: inline-flex;
    margin: 5px;
    align-items: center;
    gap: 13px;
    height: 15px;
    border-radius: 4px;
    padding: 0 15px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    line-height: 1;
}

.efic-inline-label {
  font-size: 9px;
  font-weight: 800;
  opacity: 0.65;
  letter-spacing: .02em;
}

/* TR: borda tracejada, sem fundo sólido */
.efic-inline--ref {
  background: transparent !important;
  border: 1px dashed currentColor;
}

/* ── BADGES DE EFICIÊNCIA POR FUNCIONÁRIO ───────────── */
.efic-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 56px; height: 28px; border-radius: 20px;
  font-size: 12px; font-weight: 700; padding: 0 10px;
}

.efic-badge--ref {
  background: transparent !important;
  border: 1.5px dashed currentColor;
}

/* ── CORES COMPARTILHADAS ────────────────────────────── */
.efic-alta { background: #d4f1df; color: #0c6b34; }
.efic-media { background: #fff4cf; color: #8a6a00; }
.efic-baixa { background: #ffe8e8; color: #b12626; }

/* ── COLUNAS TOTAIS / EFIC ───────────────────────────── */
.total-col { width: 72px; text-align: center; font-size: 13px; font-weight: 700; color: #052e14; }
.efic-col  { width: 96px; text-align: center; }

.efic-col--ref { background: rgba(109, 72, 201, 0.05); }

/* ── MÓDULOS POR OP ─────────────────────────────────── */
.ops-modulos-wrapper { display: flex; flex-direction: column; gap: 0.5rem; }

.op-module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  background: linear-gradient(90deg, #e7f8ef, #f8fcf9);
  border: 1px solid #dceee3;
  border-radius: 14px;
  padding: 14px 20px;
  margin-top: 0.75rem;
  box-shadow: 0 2px 8px rgba(0,0,0,.02);
}

.op-module-header--single { background: #f8fcf9; border-color: #e3f0e7; box-shadow: none; }
.op-module-header--empty { background: #fff8e1; border-color: #f0d97a; }

.op-module-badge { font-size: 14px; font-weight: 800; color: #0d6632; letter-spacing: .02em; }
.op-module-header--empty .op-module-badge { color: #8a6a00; }

.op-module-stats {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  font-size: 12px; color: #537664; font-weight: 700;
}

.op-module-stats .stat { display: inline-flex; align-items: center; gap: 4px; }
.op-module-stats .stat strong { color: #052e14; font-weight: 800; font-size: 13px; }

/* ── PAINÉIS DE CÁLCULO DUPLO ───────────────────────── */
.calc-panels {
  display: flex;
  align-items: stretch;
  gap: 0;
  flex-wrap: wrap;
  flex: 1;
  justify-content: flex-end;
}

.calc-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  min-width: 220px;
}

.calc-panel--padrao {
  background: linear-gradient(135deg, #f0faf5, #e7f8ef);
  border: 1px solid #b2d9c0;
}

.calc-panel--referencia {
  background: linear-gradient(135deg, #f5f0ff, #ede8ff);
  border: 1px solid #c8b7f0;
}

.calc-panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.calc-panel--padrao .calc-panel-title { color: #0d6632; }
.calc-panel--referencia .calc-panel-title { color: #5030b0; }

.calc-panel-icon { font-size: 14px; }

.calc-panel-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.calc-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.calc-stat-label {
  font-size: 11px;
  color: #7a8d80;
  font-weight: 600;
  white-space: nowrap;
}

.calc-stat strong {
  font-size: 15px;
  font-weight: 800;
  color: #052e14;
}

/* eficiência colorida dentro do painel */
.calc-stat strong.efic-alta { color: #0c6b34; }
.calc-stat strong.efic-media { color: #8a6a00; }
.calc-stat strong.efic-baixa { color: #b12626; }

.calc-panel-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 800;
  color: #a0b8a8;
  letter-spacing: .05em;
  align-self: center;
}

/* ── RESPONSIVO ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .content-wrapper { padding-left: 0; }
  .page-section { padding: 1rem; }
  .op-fields { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .header { align-items: stretch; }
  .header-actions { width: 100%; flex-wrap: wrap; }
  .date-input { width: 100%; }
  .turno-switch { width: 100%; }
  .turno-btn { flex: 1; }
  .progress-footer { flex-direction: column; gap: 4px; }
  .ops-list { flex-direction: column; }
  .turno-config-group { width: 100%; flex-direction: column; align-items: stretch; }
  .horarios-config-inline { width: 100%; }
  .horario-select-sm { flex: 1; }

  .calc-panels { justify-content: stretch; }
  .calc-panel { min-width: 100%; }
  .calc-panel-divider { padding: 6px 0; }
}
</style>
