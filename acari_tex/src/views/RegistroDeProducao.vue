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
              <span class="op-module-stats">
                <span class="stat">👥 <strong>{{ calcularFuncionariosOp(grupo.opId) }}</strong> func</span>
                <span class="stat" v-if="grupo.opId">📊 Produção: <strong>{{ calcularTotalOp(grupo.opId) }}</strong></span>
                <span class="stat" v-if="grupo.opId">⚙ Capacidade: <strong>{{ calcularCapacidadeOp(grupo.opId) }}</strong></span>
                <span class="stat" v-if="grupo.opId">🎯 Eficiência: <strong>{{ calcularEficienciaOp(grupo.opId) }}%</strong></span>
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
                      <th class="efic-col">Eficiência</th>
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

                        <!-- ETAPA -->
                        <td class="etapa-col">
                          <div class="etapa-wrap">
                            <select v-model="linha.etapaId" class="etapa-select" @change="onAlterarEtapa(linha)">
                              <option value="">Etapa</option>
                              <optgroup v-for="op in opsAtivasComPeca" :key="op.pecaId" :label="nomeDaOp(op.pecaId)">
                                <option v-for="etapa in etapasDaOp(op.pecaId)" :key="(etapa.id_da_funcao || etapa.etapa?.id_da_funcao)"
                                  :value="etapa.id_da_funcao || etapa.etapa?.id_da_funcao">
                                  {{ etapa.descricao || etapa.etapa?.descricao }} ({{ etapa.tempo_padrao || etapa.etapa?.tempo_padrao }}min)
                                </option>
                              </optgroup>
                            </select>
                            <button v-if="linha.tipo === 'principal'" class="btn-add-linha"
                              @click="adicionarLinhaExtra(funcionario)">+</button>
                            <button v-else class="btn-remove-linha"
                              @click="removerLinhaExtra(funcionario, idxLinha)">×</button>
                          </div>

                          <!-- TOGGLE TEMPO PADRÃO vs TEMPO DO FUNCIONÁRIO -->
                          <div v-if="linha.etapaId" class="tempo-toggle-wrap">
                            <button
                              :class="['tempo-toggle-btn', linha.modoTempo === 'padrao' ? 'tempo-ativo' : '']"
                              @click="alterarModoTempo(linha, 'padrao')"
                              :title="`Tempo padrão da etapa (fallback): ${linha.tempoPadrao} min`">
                              ⏱ {{ linha.tempoPadrao }}min
                            </button>

                            <!-- 1 ref: botão único (medição real da etapa) -->
                            <button
                              v-if="linha.tempoReferenciaOpcoes.length === 1"
                              :class="['tempo-toggle-btn', 'tempo-toggle-btn--ref', linha.modoTempo === 'referencia' ? 'tempo-ativo' : '']"
                              @click="alterarModoTempo(linha, 'referencia')"
                              :title="`Medição real da etapa: ${linha.tempoReferencia} min`">
                              👤 {{ linha.tempoReferencia }}min
                            </button>

                            <!-- N refs: dropdown de medições reais -->
                            <div v-else-if="linha.tempoReferenciaOpcoes.length > 1" class="tempo-ref-dropdown">
                              <button
                                :class="['tempo-toggle-btn', 'tempo-toggle-btn--ref', linha.modoTempo === 'referencia' ? 'tempo-ativo' : '']"
                                @click.stop="toggleRefDropdown(linha)"
                                :title="`${linha.tempoReferenciaOpcoes.length} medições reais registradas`">
                                👤 {{ linha.tempoReferencia }}min ▾
                              </button>
                              <ul v-if="refDropdownAberto[linha.id]" class="ref-list" @click.stop>
                                <li
                                  v-for="opt in linha.tempoReferenciaOpcoes"
                                  :key="opt.id"
                                  :class="{ active: opt.id === linha.referenciaSelecionadaId }"
                                  @click="selecionarReferencia(linha, opt)">
                                  {{ opt.label }}
                                </li>
                              </ul>
                            </div>

                            <span v-if="linha.tempoReferenciaOpcoes.length === 0" class="sem-referencia" title="Nenhuma medição registrada para esta etapa. Usando tempo padrão.">
                              sem medição
                            </span>
                          </div>
                        </td>

                        <!-- HORAS -->
                        <td v-for="hora in horasVisiveis" :key="hora" class="hora-td">
                          <div class="hora-box">
                            <input v-model.number="linha.registros[hora].quantidade" type="number" min="0" placeholder="0"
                              :class="['hora-input', linha.registros[hora].quantidade > 0 ? 'tem-producao' : '']"
                              @blur="onInputQuantidade(funcionario, linha, hora)" />
                            <div class="tempo-wrap">
                              <input v-model.number="linha.registros[hora].tempoProduzido" type="number" min="1" max="60"
                                class="min-input" @input="onInputQuantidade(funcionario, linha, hora)" />
                              <span class="min-label">min</span>
                            </div>
                            <div v-if="linha.registros[hora].quantidade > 0"
                              :class="['efic-chip', getEficClass(calcularEficienciaRegistro(linha.registros[hora].quantidade, linha.registros[hora].tempoProduzido, linha))]">
                              {{ calcularEficienciaRegistro(linha.registros[hora].quantidade,
                                linha.registros[hora].tempoProduzido, linha) }}%
                            </div>
                          </div>
                        </td>

                        <!-- TOTAL -->
                        <td class="total-col">{{ calcularTotalLinha(linha) }}</td>

                        <!-- EFICIÊNCIA -->
                        <td class="efic-col">
                          <div v-if="idxLinha === 0"
                            :class="['efic-badge', getEficClass(calcularEficienciaFuncionario(funcionario))]">
                            {{
                              calcularEficienciaFuncionario(funcionario)
                                ? calcularEficienciaFuncionario(funcionario) + '%'
                                : '—'
                            }}
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
      // etapas globais com tempo_referencia incluído
      etapas: [],
      // mapa: id_da_funcao → objeto etapa (para lookup rápido)
      etapasMap: {},
      configHorarios: this.carregarConfigHorarios(),
      ultimaBuscaId: 0,
      carregandoMeta: false,
      // UI: mapa linhaId → boolean para dropdown de múltiplas refs
      refDropdownAberto: {},
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

    /**
     * Agrupa funcionários por OP baseado em linha.opId.
     * Funcionário pode aparecer em mais de um módulo (uma fatia por OP).
     */
    funcionariosAgrupadosPorOp() {
      const gruposMap = new Map()

      // Cria um grupo para cada OP ativa + um grupo "Sem OP"
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

      // Distribui as linhas dos funcionários pelos grupos
      for (const func of this.funcionariosDia) {
        const linhasPorOp = new Map()

        for (const linha of func.linhas || []) {
          const key = linha.opId || null
          if (!linhasPorOp.has(key)) linhasPorOp.set(key, [])
          linhasPorOp.get(key).push(linha)
        }

        for (const [opId, linhas] of linhasPorOp) {
          const grupo = gruposMap.get(opId) || gruposMap.get(null)
          grupo.funcionarios.push({
            ...func,
            linhas,
            _grupoOpId: opId,
          })
        }
      }

      // Mantém ordem: OPs ativas primeiro, depois "Sem OP"
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
    // Fecha dropdowns de ref ao clicar fora
    this.onClickFora = () => {
      if (Object.values(this.refDropdownAberto || {}).some(Boolean)) {
        this.refDropdownAberto = {}
      }
    }
    document.addEventListener('click', this.onClickFora)
  },

  beforeUnmount() {
    socket.off()
    socket.disconnect()
    if (this.onClickFora) {
      document.removeEventListener('click', this.onClickFora)
    }
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

      const ultimaHora = this.minutosParaHora(atual)
      if (ultimaHora !== fim) {
        sequencia.push(fim)
      } else {
        sequencia.push(fim)
      }

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
        const opcoesValidas = this.opcoesHoraFim
        this.configTurnoAtivo.fim = opcoesValidas[0] || this.configTurnoAtivo.inicio
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
              linha.registros[hora] = {
                quantidade: null,
                tempoProduzido: 60,
              }
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
      if (cnpj) {
        socket.off(`nova_atualizacao_${cnpj}`)
      }

      socket.on('connect', () => { this.socketConectado = true })
      socket.on('disconnect', () => { this.socketConectado = false })
      socket.on('erro-producao', err => { console.log(err) })

      if (cnpj) {
        socket.on(`nova_atualizacao_${cnpj}`, () => {
          this.onAtualizacaoRemota()
        })
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
        console.log('Pecas carregadas:', this.pecas)
        this.etapas = this.pecas.map(p => p.etapas || [])

        // Diagnóstico: confirma estrutura da primeira etapa para validar onde está tempo_referencia
        const primeiraEtapa = this.etapas.flat()[0]
        if (primeiraEtapa) {
          console.log('[DIAGNÓSTICO] Estrutura da etapa:', {
            raiz_tem_tempo_referencia: Array.isArray(primeiraEtapa.tempo_referencia),
            etapa_tem_tempo_referencia: Array.isArray(primeiraEtapa.etapa?.tempo_referencia),
            raiz_tem_id_da_funcao: !!primeiraEtapa.id_da_funcao,
            etapa_tem_id_da_funcao: !!primeiraEtapa.etapa?.id_da_funcao,
            amostra: primeiraEtapa,
          })
        }

        // Monta mapa de etapas (item raiz) indexado por id_da_funcao.
        // A API de /pecas pode retornar id_da_funcao na raiz ou dentro de etapa;
        // toleramos ambos para conseguir localizar tempo_referencia corretamente.
        this.etapasMap = {}
        for (const listaEtapas of this.etapas) {
          for (const e of listaEtapas) {
            const idFuncao = e.id_da_funcao || e.etapa?.id_da_funcao
            if (idFuncao) {
              this.etapasMap[idFuncao] = e
            }
          }
        }

        // console.log('Funcionários:', this.funcionarios)
        // console.log('Etapas map:', this.etapasMap)
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
      return {
        _uid: Date.now() + Math.random(),
        pecaId: '',
        metaDia: 0,
      }
    },

    adicionarOp() {
      this.opsAtivas.push(this.novaOpSetup())
    },

    removerOp(idx) {
      this.opsAtivas.splice(idx, 1)
      this.salvarMetaDia()
    },

    pecasDisponiveis(pecaIdAtual) {
      const selecionadas = this.opsAtivas
        .map(o => o.pecaId)
        .filter(id => id && id !== pecaIdAtual)

      return this.pecas.filter(p => !selecionadas.includes(p.id_da_op))
    },

    nomeDaOp(pecaId) {
      const peca = this.pecas.find(p => p.id_da_op === pecaId)
      return peca?.descricao || pecaId
    },

    etapasDaOp(pecaId) {
      return this.etapas
        .flat()
        .filter(e => e.id_da_op === pecaId)
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
        // Tempo medido para o funcionário nessa etapa (tempo_por_peca do TempoReferencia ativo)
        tempoReferencia: null,
        // Lista de medições disponíveis para este (etapa, funcionário)
        tempoReferenciaOpcoes: [],
        // id da medição ativa dentro de tempoReferenciaOpcoes
        referenciaSelecionadaId: null,
        // Qual tempo está sendo usado no cálculo: 'padrao' | 'referencia'
        modoTempo: 'padrao',
        // O valor efetivo sendo usado no cálculo (pode ser tempoPadrao ou tempoReferencia)
        tempoEscolhido: 0,
        opId: null,
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
        registros[hora] = {
          quantidade: null,
          tempoProduzido: 60,
        }
      }

      return registros
    },

    adicionarLinhaExtra(funcionario) {
      if (!Array.isArray(funcionario.linhas)) {
        funcionario.linhas = []
      }

      funcionario.linhas.push(this.novaLinha('extra'))
      this.salvarMetaDia()
    },

    removerLinhaExtra(funcionario, idxLinha) {
      funcionario.linhas.splice(idxLinha, 1)
      this.salvarMetaDia()
    },

    // ── ETAPA ─────────────────────────────────────────────
    /**
     * Retorna todas as medições (tempo_referencia) registradas para a etapa.
     * tempo_referencia é um dado de medição da etapa como um todo.
     * Cada item: { id, tempo_por_peca, label }.
     * Tolerante a diferentes formatos do backend: tempo_referencia pode estar
     * na raiz do item (e.tempo_referencia) ou dentro de e.etapa.tempo_referencia.
     */
    listarRefsDaEtapa(etapa) {
      if (!etapa) return []
      const refs = etapa.tempo_referencia || etapa.etapa?.tempo_referencia || []
      if (!refs.length) return []
      return refs
        .filter(r => r && r.tempo_por_peca)
        .map(r => ({
          id: r.id,
          tempo_por_peca: r.tempo_por_peca,
          label: `Medição #${r.id} — ${r.tempo_por_peca}min`,
        }))
    },

    /**
     * Aplica uma seleção de tempo de referência na linha (não muda modoTempo).
     */
    aplicarReferencia(linha, opt) {
      if (!opt) return
      linha.referenciaSelecionadaId = opt.id
      linha.tempoReferencia = opt.tempo_por_peca
      linha.tempoEscolhido = opt.tempo_por_peca
    },

    /**
     * Ao selecionar/trocar a etapa de uma linha, atualiza todos os campos
     * relacionados a tempo. tempo_referencia é um dado de medição real da etapa:
     * se houver N registros, a UI mostra um dropdown para o usuário escolher qual usar.
     * Se não houver nenhuma medição, o sistema cai automaticamente para tempo_padrao.
     */
    onAlterarEtapa(linha) {
      const etapa = this.buscarEtapa(linha.etapaId)

      // Tolerante a backend: campos podem estar na raiz (e.tempo_padrao) ou dentro de etapa (e.etapa.tempo_padrao)
      linha.tempoPadrao = etapa?.tempo_padrao || etapa?.etapa?.tempo_padrao || 0
      linha.descricao = etapa?.descricao || etapa?.etapa?.descricao || ''
      linha.opId = etapa?.id_da_op || null

      // Busca TODAS as medições registradas para a etapa (escopo da etapa)
      const opcoes = this.listarRefsDaEtapa(etapa)
      linha.tempoReferenciaOpcoes = opcoes

      if (opcoes.length > 0) {
        // Seleciona a primeira medição automaticamente; usuário pode trocar via dropdown
        linha.referenciaSelecionadaId = opcoes[0].id
        linha.tempoReferencia = opcoes[0].tempo_por_peca
        linha.modoTempo = 'referencia'
        linha.tempoEscolhido = opcoes[0].tempo_por_peca
      } else {
        // Sem medições: fallback automático para tempo padrão
        linha.referenciaSelecionadaId = null
        linha.tempoReferencia = null
        linha.modoTempo = 'padrao'
        linha.tempoEscolhido = linha.tempoPadrao
      }

      this.salvarMetaDia()
    },

    /**
     * Alterna entre usar o tempo padrão da etapa ou o tempo medido do funcionário.
     */
    alterarModoTempo(linha, modo) {
      linha.modoTempo = modo
      if (modo === 'referencia') {
        // Garante que a ref ativa continua refletida no tempoEscolhido
        const ativo = linha.tempoReferenciaOpcoes?.find(
          o => o.id === linha.referenciaSelecionadaId
        )
        linha.tempoReferencia = ativo?.tempo_por_peca ?? linha.tempoReferencia
        linha.tempoEscolhido = linha.tempoReferencia || linha.tempoPadrao
      } else {
        linha.tempoEscolhido = linha.tempoPadrao
      }
      this.refDropdownAberto[linha.id] = false
    },

    /**
     * Abre/fecha o dropdown de múltiplas medições para a linha.
     */
    toggleRefDropdown(linha) {
      this.refDropdownAberto = {
        ...this.refDropdownAberto,
        [linha.id]: !this.refDropdownAberto[linha.id],
      }
    },

    /**
     * Seleciona uma medição específica da lista.
     */
    selecionarReferencia(linha, opt) {
      this.aplicarReferencia(linha, opt)
      linha.modoTempo = 'referencia'
      this.refDropdownAberto = { ...this.refDropdownAberto, [linha.id]: false }
    },

    buscarEtapa(etapaId) {
      return this.etapas
        .flat()
        .find(e => e.id_da_funcao === etapaId)
    },

    // ── ETAPA FINAL ──────────────────────────────────────
    isEtapaFinal(linha) {
      if (!linha?.descricao) return false

      const descricao = linha.descricao.toLowerCase()

      if (
        descricao.includes('revisão intermediaria') ||
        descricao.includes('revisao intermediaria')
      ) {
        return false
      }

      return (
        descricao.includes('final') ||
        descricao.includes('revisão final') ||
        descricao.includes('revisao final') ||
        descricao.includes('revisão') ||
        descricao.includes('revisao') ||
        descricao.includes('acabamento') ||
        descricao.includes('qualidade')
      )
    },

    // ── TOTAIS ────────────────────────────────────────────
    calcularTotalLinha(linha) {
      if (!linha?.registros) return 0

      let total = 0
      for (const hora in linha.registros) {
        total += Number(linha.registros[hora]?.quantidade || 0)
      }
      return total
    },

    calcularTotalFuncionario(funcionario) {
      if (!Array.isArray(funcionario?.linhas)) return 0

      return funcionario.linhas.reduce((soma, linha) => {
        if (!this.isEtapaFinal(linha)) return soma
        return soma + this.calcularTotalLinha(linha)
      }, 0)
    },

    calcularTotalGeral() {
      return this.funcionariosDia.reduce(
        (soma, funcionario) => soma + this.calcularTotalFuncionario(funcionario),
        0
      )
    },

    calcularTotalOp(pecaId) {
      if (!pecaId) return 0

      let total = 0
      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (!this.isEtapaFinal(linha)) continue
          if (linha.opId !== pecaId) continue
          total += this.calcularTotalLinha(linha)
        }
      }
      return total
    },

    /**
     * Quantidade de funcionários únicos alocados (com linhas) em uma OP.
     */
    calcularFuncionariosOp(opId) {
      if (!opId) return 0
      const emails = new Set()
      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (linha.opId === opId) {
            emails.add(func.email)
            break
          }
        }
      }
      return emails.size
    },

    /**
     * Eficiência consolidada de uma OP (soma produzida / soma tempo * 100).
     */
    calcularEficienciaOp(opId) {
      if (!opId) return 0
      let somaProduzida = 0
      let somaTempo = 0

      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (linha.opId !== opId) continue
          const tempo = linha.tempoEscolhido || linha.tempoPadrao || 0
          for (const hora in linha.registros || {}) {
            const reg = linha.registros[hora]
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
     * Capacidade produtiva estimada da OP: soma de floor(minutos_uteis / tempoEscolhido)
     * para cada linha da OP. minutos_uteis = horasVisiveis.length * 60.
     */
    calcularCapacidadeOp(opId) {
      if (!opId) return 0
      const minutosUteis = (this.horasVisiveis?.length || 1) * 60
      let capacidade = 0
      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (linha.opId !== opId) continue
          const t = linha.tempoEscolhido || linha.tempoPadrao || 60
          if (t > 0) capacidade += Math.floor(minutosUteis / t)
        }
      }
      return capacidade
    },

    // ── EFICIÊNCIA ────────────────────────────────────────
    /**
     * Calcula eficiência de um registro individual.
     * Usa linha.tempoEscolhido, que pode ser o tempo padrão da etapa
     * ou o tempo medido do funcionário (tempo_por_peca do TempoReferencia).
     */
    calcularEficienciaRegistro(quantidade, tempoProduzido, linha) {
      const tempo = linha?.tempoEscolhido || linha?.tempoPadrao || 0

      if (!quantidade || !tempoProduzido || !tempo) return 0

      return Math.round(((quantidade * tempo) / tempoProduzido) * 100)
    },

    /**
     * Eficiência total da linha usando tempoEscolhido de cada linha.
     */
    calcularEficienciaLinha(linha) {
      if (!linha?.registros) return 0

      let produzido = 0
      let tempoProduzido = 0
      const tempo = linha.tempoEscolhido || linha.tempoPadrao || 0

      for (const hora in linha.registros) {
        const reg = linha.registros[hora]
        if (reg && reg.quantidade > 0) {
          produzido += reg.quantidade * tempo
          tempoProduzido += reg.tempoProduzido || 60
        }
      }

      if (!tempoProduzido) return 0
      return Math.round((produzido / tempoProduzido) * 100)
    },

    /**
     * Eficiência geral do funcionário, somando todas as linhas
     * com seus respectivos tempoEscolhido.
     */
    calcularEficienciaFuncionario(funcionario) {
      if (!funcionario?.linhas?.length) return 0

      let somaProduzida = 0
      let somaTempo = 0

      for (const linha of funcionario.linhas) {
        if (!linha?.registros) continue

        const tempo = linha.tempoEscolhido || linha.tempoPadrao || 0

        for (const hora in linha.registros) {
          const reg = linha.registros[hora]
          if (reg && reg.quantidade > 0) {
            somaProduzida += reg.quantidade * tempo
            somaTempo += reg.tempoProduzido || 60
          }
        }
      }

      if (!somaTempo) return 0
      return Math.round((somaProduzida / somaTempo) * 100)
    },

    getEficClass(pct) {
      if (pct >= 100) return 'efic-alta'
      if (pct >= 75) return 'efic-media'
      if (pct > 0) return 'efic-baixa'
      return ''
    },

    // ── INPUT ─────────────────────────────────────────────
    onInputQuantidade: debounce(function (funcionario, linha, hora) {
      const registro = linha.registros[hora]

      if (!funcionario?.email || !linha?.etapaId) return

      const etapa = this.buscarEtapa(linha.etapaId)
      const opId = etapa?.id_da_op || null

      socket.emit('salvar-producao', {
        funcionarioId: funcionario.email,
        etapaId: linha.etapaId,
        opId,
        quantidade: registro.quantidade || 0,
        hora,
        data: this.dataSelecionada,
        estabelecimento: this.store.pegar_usuario.cnpj,
        tipoRegistro: linha.tipo,
        tempoProduzido: registro.tempoProduzido || 60,
      })
    }, 1500),

    // ── META ──────────────────────────────────────────────
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
            modoTempo: linha.modoTempo,
            referenciaSelecionadaId: linha.referenciaSelecionadaId,
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
        if (buscaId === this.ultimaBuscaId) {
          this.carregandoMeta = false
        }
      }, 8000)

      socket.emit(
        'buscar-meta-dia',
        {
          estabelecimento: this.store.pegar_usuario.cnpj,
          data: dataDaRequisicao,
        },
        response => {
          if (
            buscaId !== this.ultimaBuscaId ||
            dataDaRequisicao !== this.dataSelecionada
          ) {
            return
          }

          this.carregandoMeta = false

          if (!response?.sucesso) return

          const meta = response.metaDia
          if (!meta) {
            this.opsAtivas = [this.novaOpSetup()]
            this.inicializarFuncionarios()
            return
          }

          // Restaurar OPs
          if (meta.pecas?.length) {
            this.opsAtivas = meta.pecas.map(p => ({
              _uid: Date.now() + Math.random(),
              pecaId: p.id_da_op,
              metaDia: p.meta || 0,
            }))
          }

          this.inicializarFuncionarios()

          for (const metaFunc of meta.funcionarios || []) {
            const funcionario = this.funcionariosDia.find(
              f => f.email === metaFunc.funcionarioId
            )
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

                // Restaura medições reais da etapa ao carregar do banco
                const etapaGlobal = this.buscarEtapa(etapaId)
                const opcoes = this.listarRefsDaEtapa(etapaGlobal)
                linha.tempoReferenciaOpcoes = opcoes

                if (opcoes.length > 0) {
                  // Tenta restaurar a ref antes salva; se não existir mais, usa a primeira
                  const persistidaId = producao.referencia_selecionada_id
                  const persistida = opcoes.find(o => o.id === persistidaId) || opcoes[0]
                  linha.referenciaSelecionadaId = persistida.id
                  linha.tempoReferencia = persistida.tempo_por_peca
                  linha.modoTempo = 'referencia'
                  linha.tempoEscolhido = persistida.tempo_por_peca
                } else {
                  linha.referenciaSelecionadaId = null
                  linha.tempoReferencia = null
                  linha.modoTempo = 'padrao'
                  linha.tempoEscolhido = linha.tempoPadrao
                }

                linhas.push(linha)
              }

              const hora = producao.hora_registro
              if (!hora || !linha.registros?.[hora]) continue

              linha.registros[hora] = {
                quantidade: producao.quantidade_pecas || 0,
                tempoProduzido: producao.tempo_produzido || 60,
              }
            }

            funcionario.linhas = linhas.length
              ? linhas
              : [this.novaLinha('principal')]
          }
        }
      )
    },
  },
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
  min-height: 100vh;
}

.page-section {
  padding: 1.2rem;
}

/* ── HEADER ────────────────────────────────────────── */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.socket-status {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  background: #ffecec;
  color: #d23b3b;
}

.socket-status.online {
  background: #e7f8ef;
  color: #0d7a3f;
}

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
  font-size: 12px;
  font-weight: 700;
  color: #0d6632;
  display: flex;
  align-items: center;
  animation: pulseFade 1.1s ease-in-out infinite;
}

@keyframes pulseFade {
  0%, 100% { opacity: .5; }
  50% { opacity: 1; }
}

/* ── SETUP CARD ────────────────────────────────────── */
.setup-card {
  background: linear-gradient(135deg, #ffffff, #f8fcf9);
  border-radius: 24px;
  border: 1px solid #dceee3;
  padding: 1.4rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 18px rgba(0, 0, 0, .03);
}

.setup-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.4rem;
  flex-wrap: wrap;
}

.setup-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

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
  box-shadow: 0 8px 20px rgba(13, 102, 50, .2);
}

.setup-title h3 {
  margin: 0;
  font-size: 22px;
  color: #052e14;
}

.setup-title span {
  font-size: 13px;
  color: #72907e;
}

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
  font-size: 13px;
}

.turno-btn:hover {
  background: rgba(13, 102, 50, .08);
}

.turno-btn.active {
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
  box-shadow: 0 4px 14px rgba(13, 102, 50, .25);
}

.turno-config-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.horarios-config-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.horario-select-sm {
  height: 42px;
  border-radius: 12px;
  border: 1px solid #dceee3;
  background: white;
  padding: 0 10px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: #052e14;
  transition: .2s;
}

.horario-select-sm:focus {
  border-color: #118a43;
  box-shadow: 0 0 0 4px rgba(17, 138, 67, .08);
  outline: none;
}

.horario-ate {
  font-size: 12px;
  font-weight: 700;
  color: #648673;
}

/* ── OPs SECTION ───────────────────────────────────── */
.ops-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ops-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.op-card {
  flex: 1 1 340px;
  background: white;
  border: 1px solid #dceee3;
  border-radius: 18px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: .75rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, .03);
}

.op-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.op-badge {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .06em;
  color: #0d6632;
  background: #e7f8ef;
  border-radius: 8px;
  padding: 3px 10px;
  text-transform: uppercase;
}

.btn-remove-op {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 8px;
  background: #ffecec;
  color: #d93b3b;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
}

.op-fields {
  display: grid;
  grid-template-columns: 1fr 180px 120px;
  gap: .75rem;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 11px;
  font-weight: 700;
  color: #648673;
  padding-left: 2px;
}

.field select {
  height: 46px;
  border-radius: 13px;
  border: 1px solid #dceee3;
  background: white;
  padding: 0 12px;
  font-family: inherit;
  font-size: 13px;
  width: 100%;
  transition: .2s;
}

.field select:focus {
  border-color: #118a43;
  box-shadow: 0 0 0 4px rgba(17, 138, 67, .08);
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
  box-shadow: 0 0 0 4px rgba(17, 138, 67, .08);
}

.meta-input {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 12px;
  font-size: 17px;
  font-weight: 700;
  color: #052e14;
}

.meta-input:focus {
  outline: none;
}

.meta-suffix {
  height: 100%;
  padding: 0 12px;
  display: flex;
  align-items: center;
  background: #f2f8f4;
  border-left: 1px solid #e2eee7;
  color: #5d8470;
  font-size: 11px;
  font-weight: 700;
}

.total-box {
  height: 46px;
  border-radius: 13px;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  box-shadow: 0 6px 16px rgba(13, 102, 50, .2);
}

.meta-progress {
  margin-top: .25rem;
  padding: .85rem 1rem;
  border-radius: 14px;
  background: linear-gradient(135deg, #f7fcf9, #edf7f1);
  border: 1px solid #dceee3;
}

.meta-progress-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #537664;
}

.meta-progress-top strong {
  color: #052e14;
  font-size: 13px;
}

.progress-bar {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: #dceee3;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0d6632, #20b15a);
  transition: width .3s ease;
}

.progress-footer {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #648673;
}

.btn-add-op {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 18px;
  border: 2px dashed #b2d9c0;
  border-radius: 13px;
  background: transparent;
  color: #0d6632;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: .2s;
  font-family: inherit;
}

.btn-add-op:hover {
  background: #edf7f1;
  border-color: #0d6632;
}

.btn-add-op span {
  font-size: 18px;
  line-height: 1;
}

.total-geral-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e6f2ea;
  font-size: 13px;
  font-weight: 700;
  color: #537664;
}

.total-box-sm {
  min-width: 80px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(13, 102, 50, .2);
  padding: 0 16px;
}

/* ── TABLE ─────────────────────────────────────────── */
.table-wrapper {
  background: white;
  border-radius: 20px;
  border: 1px solid #e3f0e7;
  overflow: hidden;
}

.table-scroll {
  overflow-x: auto;
}

.apontamento-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1400px;
}

.apontamento-table thead {
  background: linear-gradient(90deg, #0d6632, #084d24);
}

.apontamento-table th {
  height: 54px;
  color: white;
  font-size: 13px;
  font-weight: 700;
  padding: 0 8px;
  text-align: justify;
  white-space: nowrap;
}

.apontamento-table td {
  border-bottom: 1px solid #edf6f1;
  padding: 6px;
  vertical-align: top;
}

.func-col {
  width: 190px;
  min-width: 190px;
}

.func-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 50px;
}

.func-info img {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.func-info span {
  font-size: 12px;
  font-weight: 700;
  color: #052e14;
}

.extra-tag {
  padding-left: 12px;
  font-size: 11px;
  font-weight: 700;
  color: #5d8972;
}

.etapa-col {
  width: 240px;
  min-width: 240px;
}

.etapa-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.etapa-select {
  width: 100%;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #dceee3;
  padding: 0 10px;
  font-size: 11px;
  font-family: inherit;
  background: white;
}

.btn-add-linha,
.btn-remove-linha {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-add-linha {
  background: #0d6632;
  color: white;
}

.btn-remove-linha {
  background: #ffecec;
  color: #d93b3b;
}

.linha-extra {
  background: #f8fcf9;
}

/* ── TOGGLE TEMPO ──────────────────────────────────── */
.tempo-toggle-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  flex-wrap: wrap;
}

.tempo-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 22px;
  padding: 0 8px;
  border-radius: 20px;
  border: 1.5px solid #dceee3;
  background: #f4faf6;
  color: #5d8470;
  font-size: 10px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}

.tempo-toggle-btn:hover {
  border-color: #0d6632;
  color: #0d6632;
  background: #edf7f1;
}

/* Botão de tempo padrão ativo */
.tempo-toggle-btn.tempo-ativo {
  background: #0d6632;
  border-color: #0d6632;
  color: white;
  box-shadow: 0 2px 6px rgba(13, 102, 50, .25);
}

/* Botão de tempo do funcionário (inativo) */
.tempo-toggle-btn--ref {
  border-color: #c8b7f0;
  background: #f7f4ff;
  color: #6d48c9;
}

.tempo-toggle-btn--ref:hover {
  border-color: #6d48c9;
  background: #ede8ff;
  color: #5030b0;
}

/* Botão de tempo do funcionário ativo */
.tempo-toggle-btn--ref.tempo-ativo {
  background: #6d48c9;
  border-color: #6d48c9;
  color: white;
  box-shadow: 0 2px 6px rgba(109, 72, 201, .3);
}

.sem-referencia {
  font-size: 10px;
  color: #b0c5b8;
  font-style: italic;
  padding-left: 2px;
}

/* ── HORAS ─────────────────────────────────────────── */
.hora-th {
  min-width: 120px;
}

.hora-td {
  padding: 4px;
}

.hora-box {
  display: flex;
  gap: 4px;
  align-items: center;
}

.hora-input {
  width: 56px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #dceee3;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  transition: .15s;
}

.hora-input:focus {
  outline: none;
  border-color: #0d6632;
}

.hora-input.tem-producao {
  background: #e9f2ff;
  border-color: #2b77d9;
  color: #1454ad;
}

.tempo-wrap {
  display: flex;
  align-items: center;
  gap: 2px;
}

.min-input {
  width: 40px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid #ddebe3;
  text-align: center;
  font-size: 10px;
  background: #f8fcf9;
  color: #69907b;
}

.min-label {
  font-size: 10px;
  color: #8ca998;
}

.efic-chip {
  font-size: 10px;
  font-weight: 700;
  border-radius: 20px;
  padding: 2px 6px;
  white-space: nowrap;
}

.efic-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  height: 30px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  padding: 0 10px;
}

.efic-alta {
  background: #d4f1df;
  color: #0c6b34;
}

.efic-media {
  background: #fff4cf;
  color: #8a6a00;
}

.efic-baixa {
  background: #ffe8e8;
  color: #b12626;
}

.total-col {
  width: 80px;
  text-align: center;
}

.efic-col {
  width: 100px;
  text-align: center;
}

/* ── MÓDULOS POR OP ────────────────────────────────── */
.ops-modulos-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.op-module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  background: linear-gradient(90deg, #e7f8ef, #f8fcf9);
  border: 1px solid #dceee3;
  border-radius: 14px;
  padding: 12px 18px;
  margin-top: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.op-module-header--single {
  background: #f8fcf9;
  border-color: #e3f0e7;
  box-shadow: none;
}

.op-module-header--empty {
  background: #fff8e1;
  border-color: #f0d97a;
}

.op-module-badge {
  font-size: 13px;
  font-weight: 800;
  color: #0d6632;
  letter-spacing: 0.02em;
}

.op-module-header--empty .op-module-badge {
  color: #8a6a00;
}

.op-module-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 11px;
  color: #537664;
  font-weight: 700;
}

.op-module-stats .stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.op-module-stats .stat strong {
  color: #052e14;
  font-weight: 800;
}

/* ── DROPDOWN DE REFS ──────────────────────────────── */
.tempo-ref-dropdown {
  position: relative;
  display: inline-block;
}

.ref-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 50;
  background: white;
  border: 1px solid #dceee3;
  border-radius: 10px;
  min-width: 200px;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
  margin: 0;
  list-style: none;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.ref-list li {
  padding: 8px 12px;
  font-size: 11px;
  cursor: pointer;
  color: #052e14;
  transition: background 0.15s;
}

.ref-list li:hover {
  background: #f4faf6;
  color: #0d6632;
}

.ref-list li.active {
  background: #ede8ff;
  color: #5030b0;
  font-weight: 700;
}

/* ── RESPONSIVO ────────────────────────────────────── */
@media (max-width: 1024px) {
  .content-wrapper {
    padding-left: 0;
  }

  .page-section {
    padding: 1rem;
  }

  .op-fields {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .header {
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .date-input {
    width: 100%;
  }

  .turno-switch {
    width: 100%;
  }

  .turno-btn {
    flex: 1;
  }

  .progress-footer {
    flex-direction: column;
    gap: 4px;
  }

  .ops-list {
    flex-direction: column;
  }

  .turno-config-group {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .horarios-config-inline {
    width: 100%;
  }

  .horario-select-sm {
    flex: 1;
  }

  .tempo-toggle-wrap {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>