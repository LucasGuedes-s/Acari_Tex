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
            <div class="turno-switch">
              <button :class="['turno-btn', turnoAtivo === 'manha' ? 'active' : '']" @click="turnoAtivo = 'manha'">
                ☀️ 07h → 12h
              </button>
              <button :class="['turno-btn', turnoAtivo === 'tarde' ? 'active' : '']" @click="turnoAtivo = 'tarde'">
                🌙 13h → 18h
              </button>
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

        <!-- TABELA -->
        <div v-if="opsAtivasComPeca.length > 0" class="table-wrapper">
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
                <template v-for="funcionario in funcionariosDia" :key="funcionario.email">
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
                            <option v-for="etapa in etapasDaOp(op.pecaId)" :key="etapa.id_da_funcao"
                              :value="etapa.id_da_funcao">
                              {{ etapa.etapa?.descricao }} ({{ etapa.etapa?.tempo_padrao }}min)
                            </option>
                          </optgroup>
                        </select>
                        <button v-if="linha.tipo === 'principal'" class="btn-add-linha"
                          @click="adicionarLinhaExtra(funcionario)">+</button>
                        <button v-else class="btn-remove-linha"
                          @click="removerLinhaExtra(funcionario, idxLinha)">×</button>
                      </div>
                    </td>

                    <!-- HORAS -->
                    <td v-for="hora in horasVisiveis" :key="hora" class="hora-td">
                      <div class="hora-box">
                        <input v-model.number="linha.registros[hora].quantidade" type="number" min="0" placeholder="0" :class="['hora-input', linha.registros[hora].quantidade > 0 ? 'tem-producao' : '']" @blur="onInputQuantidade(funcionario, linha, hora)"/>
                        <div class="tempo-wrap">
                          <input v-model.number="linha.registros[hora].tempoProduzido" type="number" min="1" max="60"
                            class="min-input" @input="onInputQuantidade(funcionario, linha, hora)" />
                          <span class="min-label">min</span>
                        </div>
                        <div v-if="linha.registros[hora].quantidade > 0"
                          :class="['efic-chip', getEficClass(calcularEficienciaRegistro(linha.registros[hora].quantidade, linha.registros[hora].tempoProduzido, linha.tempoPadrao))]">
                          {{ calcularEficienciaRegistro(linha.registros[hora].quantidade,
                            linha.registros[hora].tempoProduzido, linha.tempoPadrao) }}%
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
      // Array de OPs ativas, cada uma com { _uid, pecaId, metaDia }
      opsAtivas: [this.novaOpSetup()],
      funcionarios: [],
      funcionariosDia: [],
      pecas: [],
      etapas: [],
      horasTurno: {
        manha: ['08:00', '09:00', '10:00', '11:00', '12:30'],
        tarde: ['13:30', '14:30', '15:30', '16:30', '17:30', '18:00'],
      },
    }
  },

  computed: {
    horasVisiveis() {
      return this.horasTurno[this.turnoAtivo]
    },
    opsAtivasComPeca() {
      return this.opsAtivas.filter(op => op.pecaId)
    },
    
  },

  watch: {
    dataSelecionada() {
      this.buscarMetaDia()
    },
  },

  async mounted() {
    if (!this.store.pegar_token) router.push('/')
    await this.carregarDados()
    await this.buscarMetaDia()
    this.iniciarSocket()
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

    // ── SOCKET ────────────────────────────────────────────
    iniciarSocket() {
      socket.on('connect', () => {
        this.socketConectado = true
      })

      socket.on('disconnect', () => {
        this.socketConectado = false
      })

      socket.on('erro-producao', err => {
        console.log(err)
      })
    },

    // ── CARREGAMENTO ──────────────────────────────────────
    async carregarDados() {
      try {
        const token = this.store.pegar_token

        const [resFuncs, resPecas] = await Promise.all([
          api.get('/Funcionarios', {
            headers: { Authorization: token },
          }),

          api.get('/pecas', {
            headers: { Authorization: token },
          }),
        ])

        this.funcionarios = resFuncs.data.funcionarios || []
        this.pecas = resPecas.data.peca.em_progresso || []
        this.etapas = this.pecas.map(p => p.etapas || [])
        console.log('Funcionários:', this.funcionarios)
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

      return this.pecas.filter(
        p => !selecionadas.includes(p.id_da_op)
      )
    },

    nomeDaOp(pecaId) {
      const peca = this.pecas.find(
        p => p.id_da_op === pecaId
      )

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
        opId: null,
        registros: this.criarRegistros(),
      }
    },

    criarRegistros() {
      const registros = {}

      const horas = [
        ...this.horasTurno.manha,
        ...this.horasTurno.tarde,
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

      funcionario.linhas.push(
        this.novaLinha('extra')
      )

      this.salvarMetaDia()
    },

    removerLinhaExtra(funcionario, idxLinha) {
      funcionario.linhas.splice(idxLinha, 1)
      this.salvarMetaDia()
    },

    // ── ETAPA ─────────────────────────────────────────────
    onAlterarEtapa(linha) {
      const etapa = this.buscarEtapa(linha.etapaId)

      linha.tempoPadrao =
        etapa?.etapa?.tempo_padrao || 0

      linha.descricao =
        etapa?.etapa?.descricao || ''

      linha.opId =
        etapa?.id_da_op || null

      this.salvarMetaDia()
    },

    buscarEtapa(etapaId) {
      return this.etapas
        .flat()
        .find(e => e.id_da_funcao === etapaId)
    },

    // ── ETAPA FINAL ──────────────────────────────────────
    isEtapaFinal(linha) {
    if (!linha?.descricao) return false;

    const descricao = linha.descricao.toLowerCase();

    return (
      descricao.includes('final') ||
      descricao.includes('revisão') ||
      descricao.includes('revisao') ||
      descricao.includes('acabamento') ||
      descricao.includes('qualidade')
    );
  },

    // ── TOTAIS ────────────────────────────────────────────
    calcularTotalLinha(linha) {
      if (!linha?.registros) return 0

      let total = 0

      for (const hora in linha.registros) {
        total += Number(
          linha.registros[hora]?.quantidade || 0
        )
      }

      return total
    },

    calcularTotalFuncionario(funcionario) {
      if (!Array.isArray(funcionario?.linhas)) {
        return 0
      }

      return funcionario.linhas.reduce(
        (soma, linha) => {

          // só soma etapa final
          if (!this.isEtapaFinal(linha)) {
            return soma
          }

          return soma + this.calcularTotalLinha(linha)

        },
        0
      )
    },

    calcularTotalGeral() {
      return this.funcionariosDia.reduce(
        (soma, funcionario) =>
          soma + this.calcularTotalFuncionario(funcionario),
        0
      )
    },

    // ── TOTAL DA OP (SOMENTE ETAPA FINAL) ────────────────
    calcularTotalOp(pecaId) {
      if (!pecaId) return 0

      let total = 0

      for (const func of this.funcionariosDia) {

        for (const linha of func.linhas || []) {

          // precisa ser etapa final
          if (!this.isEtapaFinal(linha)) {
            continue
          }

          // precisa pertencer à OP
          if (linha.opId !== pecaId) {
            continue
          }

          total += this.calcularTotalLinha(linha)
        }
      }

      return total
    },

    // ── EFICIÊNCIA ────────────────────────────────────────
    calcularEficienciaRegistro(
      quantidade,
      tempoProduzido,
      tempoPadrao
    ) {

      if (
        !quantidade ||
        !tempoProduzido ||
        !tempoPadrao
      ) {
        return 0
      }

      return Math.round(
        ((quantidade * tempoPadrao) / tempoProduzido) * 100
      )
    },

    calcularEficienciaLinha(linha) {

      if (!linha?.registros) {
        return 0
      }

      let produzido = 0
      let tempoProduzido = 0

      for (const hora in linha.registros) {

        const reg = linha.registros[hora]

        if (reg && reg.quantidade > 0) {

          produzido +=
            reg.quantidade *
            (linha.tempoPadrao || 0)

          tempoProduzido +=
            reg.tempoProduzido || 60
        }
      }

      if (!tempoProduzido) {
        return 0
      }

      return Math.round(
        (produzido / tempoProduzido) * 100
      )
    },
    calcularEficienciaFuncionario(funcionario) {

      if (!funcionario?.linhas?.length) {
        return 0
      }

      let somaProduzida = 0
      let somaTempo = 0

      for (const linha of funcionario.linhas) {

        if (!linha?.registros) continue

        for (const hora in linha.registros) {

          const reg = linha.registros[hora]

          if (reg && reg.quantidade > 0) {

            somaProduzida +=
              reg.quantidade *
              (linha.tempoPadrao || 0)

            somaTempo +=
              reg.tempoProduzido || 60
          }
        }
      }

      if (!somaTempo) {
        return 0
      }

      return Math.round(
        (somaProduzida / somaTempo) * 100
      )
    },

    getEficClass(pct) {
      if (pct >= 100) return 'efic-alta'
      if (pct >= 75) return 'efic-media'
      if (pct > 0) return 'efic-baixa'
      return ''
    },

    // ── INPUT ─────────────────────────────────────────────
    onInputQuantidade: debounce(function (
      funcionario,
      linha,
      hora
    ) {

      const registro = linha.registros[hora]

      if (
        !funcionario?.email ||
        !linha?.etapaId
      ) {
        return
      }

      const etapa = this.buscarEtapa(
        linha.etapaId
      )

      const opId =
        etapa?.id_da_op || null

      socket.emit('salvar-producao', {
        funcionarioId: funcionario.email,
        etapaId: linha.etapaId,
        opId,
        quantidade: registro.quantidade || 0,
        hora,
        data: this.dataSelecionada,
        estabelecimento:
          this.store.pegar_usuario.cnpj,
        tipoRegistro: linha.tipo,
        tempoProduzido:
          registro.tempoProduzido || 60,
      })

    }, 1500),

    // ── META ──────────────────────────────────────────────
    salvarMetaDia: debounce(function () {

      const pecasAtivas =
        this.opsAtivasComPeca

      if (!pecasAtivas.length) return 
      console.log('Salvando meta do dia...', {
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
          })),
        })),
      })

      socket.emit('salvar-meta-dia', {
        estabelecimento:
          this.store.pegar_usuario.cnpj,

        usuario:
          this.store.pegar_usuario.email,

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
          })),
        })),
      })

    }, 500),

    // ── BUSCAR META ───────────────────────────────────────
    async buscarMetaDia() {

      socket.emit(
        'buscar-meta-dia',
        {
          estabelecimento:
            this.store.pegar_usuario.cnpj,
          data: this.dataSelecionada,
        },

        response => {

          if (!response?.sucesso) {
            return
          }

          const meta = response.metaDia
          if (!meta) {

            this.opsAtivas = [
              this.novaOpSetup()
            ]

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

            const funcionario =
              this.funcionariosDia.find(
                f => f.email === metaFunc.funcionarioId
              )

            if (!funcionario) continue

            const linhas = []

            for (const producao of metaFunc.producoes || []) {

              const etapaId =
                producao.id_da_funcao

              let linha = linhas.find(
                l => l.etapaId === etapaId
              )

              if (!linha) {

                linha = this.novaLinha(
                  linhas.length === 0
                    ? 'principal'
                    : 'extra'
                )

                linha.etapaId = etapaId

                linha.descricao =
                  producao.producao_etapa?.descricao || ''

                linha.tempoPadrao =
                  producao.producao_etapa?.tempo_padrao || 0

                linha.opId =
                  producao.id_da_op || null

                linhas.push(linha)
              }

              const hora =
                producao.hora_registro

              if (
                !hora ||
                !linha.registros?.[hora]
              ) {
                continue
              }

              linha.registros[hora] = {
                quantidade:
                  producao.quantidade_pecas || 0,

                tempoProduzido:
                  producao.tempo_produzido || 60,
              }
            }

            funcionario.linhas =
              linhas.length
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

.title {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  color: #052e14;
}

.subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #7ca18c;
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

/* PROGRESSO */
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

/* BOTÃO NOVA OP */
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

/* TOTAL GERAL */
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
  width: 220px;
  min-width: 220px;
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
}
</style>