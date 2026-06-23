<template>
  <div class="painel">

    <!-- TOP BAR -->
    <header class="top-bar">
      <div class="metrics-row">
        <div class="metric-chip accent">
          <span class="mc-label">Eficiência da turma</span>
          <span class="mc-val">{{ eficienciaMediaTurma }}%</span>
        </div>
        <div class="metric-chip">
          <span class="mc-label">Funcionários</span>
          <span class="mc-val">{{ funcionariosOrdenados.length }}</span>
        </div>
        <div class="metric-chip">
          <span class="mc-label">Peças entregues</span>
          <span class="mc-val">{{ totalPecasGeral }}</span>
        </div>
        <div class="metric-chip" v-if="opsAtivas.length">
          <span class="mc-label">Peça do dia</span>
          <span class="mc-val peca-chip">{{ opsAtivas.map(o => nomeDaOp(o.pecaId)).join(', ') }}</span>
        </div>
      </div>

      <div class="top-bar-right">
        <span class="socket-dot" :class="{ conectado: socketConectado }" :title="socketConectado ? 'Conectado' : 'Desconectado'"></span>
      </div>
    </header>

    <!-- MAIN -->
    <div class="main-layout" :class="{ 'panel-open': selecionado !== null }">

      <!-- LISTA -->
      <div class="grid-area">
        <div class="list-toolbar">
          <span class="list-title">Profissionais</span>
          <div class="list-toolbar-right">
            <input class="search-input" v-model="busca" placeholder="Buscar…" />
            <span class="list-count">{{ funcionariosFiltrados.length }} de {{ funcionariosOrdenados.length }}</span>
          </div>
        </div>

        <div class="list-header">
          <span class="lh-name">Nome</span>
          <span class="lh-col">Peças</span>
          <span class="lh-col">Eficiência</span>
        </div>

        <div class="list-body">
          <div
            v-for="func in funcionariosFiltrados"
            :key="func.email"
            class="list-row"
            :class="{ selected: selecionado === func._idx }"
            @click="selecionar(func._idx)"
          >
            <div class="lr-name">
              <span class="lr-pos" :class="{ medal: func._idx < 3 }">{{ rankIcon(func._idx) }}</span>
              <div class="lr-avatar-wrap">
                <img v-if="func.foto" class="lr-avatar" :src="func.foto" :alt="func.nome" @error="onImgError" />
                <div v-else class="lr-avatar-fb">{{ initials(func.nome) }}</div>
                <span class="lr-dot" :class="clsEfic(calcularEficienciaFuncionario(func))"></span>
              </div>
              <div class="lr-info">
                <span class="lr-nome">{{ func.nome }}</span>
                <span class="lr-sub">{{ func.email }}</span>
              </div>
            </div>

            <span class="lr-col mono">{{ calcularTotalFuncionario(func) }}</span>

            <span class="lr-col" style="display:flex; gap:4px; align-items:center; justify-content:flex-end;">
              <span class="badge" :class="clsEfic(calcularEficienciaFuncionario(func))">
                {{ calcularEficienciaFuncionario(func) }}%
              </span>
            </span>
          </div>

          <div v-if="!funcionariosFiltrados.length && !loading" class="list-empty">
            <span v-if="busca">Nenhum resultado para "{{ busca }}"</span>
            <span v-else>Sem dados para esta data</span>
          </div>

          <div v-if="loading" class="list-empty">Carregando…</div>
        </div>
      </div>

      <!-- PAINEL DETALHE -->
      <transition name="panel-slide">
        <aside v-if="selecionado !== null && funcSelecionado" class="detail-panel">

          <div class="dp-topbar">
            <span class="dp-topbar-title">Detalhes</span>
            <button class="dp-close" @click="selecionado = null">✕</button>
          </div>

          <!-- Profile -->
          <div class="dp-profile">
            <div class="dp-avatar-wrap">
              <img v-if="funcSelecionado.foto" class="dp-avatar" :src="funcSelecionado.foto" :alt="funcSelecionado.nome" @error="onImgError" />
              <div v-else class="dp-avatar-fb">{{ initials(funcSelecionado.nome) }}</div>
              <span class="dp-dot" :class="clsEfic(calcularEficienciaFuncionario(funcSelecionado))"></span>
            </div>
            <div class="dp-profile-info">
              <h3 class="dp-nome">{{ funcSelecionado.nome }}</h3>
              <p class="dp-email">{{ funcSelecionado.email }}</p>
            </div>
            <span class="badge xlg" :class="clsEfic(calcularEficienciaFuncionario(funcSelecionado))">
              {{ calcularEficienciaFuncionario(funcSelecionado) }}%
            </span>
          </div>

          <!-- Métricas -->
          <div class="dp-stats">
            <div class="dp-stat">
              <span class="dp-stat-label">Peças (final)</span>
              <span class="dp-stat-val">{{ calcularTotalFinalizadoFuncionario(funcSelecionado) }}</span>
            </div>
            <div class="dp-stat-div"></div>
            <div class="dp-stat">
              <span class="dp-stat-label">Eficiência</span>
              <span class="dp-stat-val" :class="clsEfic(calcularEficienciaFuncionario(funcSelecionado))">
                {{ calcularEficienciaFuncionario(funcSelecionado) }}%
              </span>
            </div>
            <div class="dp-stat-div"></div>
            <div class="dp-stat">
              <span class="dp-stat-label">Linhas</span>
              <span class="dp-stat-val">{{ (funcSelecionado.linhas || []).length }}</span>
            </div>
          </div>

          <!-- Barra de eficiência -->
          <div class="dp-eff-bar-wrap">
            <div class="dp-eff-bar-labels">
              <span>Eficiência geral</span>
              <span :class="clsEfic(calcularEficienciaFuncionario(funcSelecionado))">
                {{ calcularEficienciaFuncionario(funcSelecionado) }}%
              </span>
            </div>
            <div class="dp-eff-bar-track">
              <div
                class="dp-eff-bar-fill"
                :class="clsEfic(calcularEficienciaFuncionario(funcSelecionado))"
                :style="{ width: Math.min(calcularEficienciaFuncionario(funcSelecionado), 100) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="dp-tabs">
            <button
              v-for="tab in tabs"
              :key="tab"
              class="dp-tab"
              :class="{ active: abaAtiva === tab }"
              @click="abaAtiva = tab"
            >{{ tab }}</button>
          </div>

          <!-- TAB: Etapas -->
          <div v-if="abaAtiva === 'Etapas'" class="dp-content">
            <div v-for="linha in (funcSelecionado.linhas || [])" :key="linha.id" class="dp-etapa">
              <div class="dp-etapa-top">
                <span class="dp-etapa-nome">
                  {{ linha.descricao || linha.etapaId || '—' }}
                  <span v-if="isEtapaFinal(linha)" class="tag-final">final</span>
                </span>
                <span class="badge sm" :class="clsEfic(calcularEficienciaLinha(linha))">
                  {{ calcularEficienciaLinha(linha) }}%
                </span>
              </div>
              <div class="dp-etapa-bar-track">
                <div
                  class="dp-etapa-bar-fill"
                  :class="clsEfic(calcularEficienciaLinha(linha))"
                  :style="{ width: Math.min(calcularEficienciaLinha(linha), 100) + '%' }"
                ></div>
              </div>
              <div class="dp-etapa-bottom">
                <span class="mono small">{{ calcularTotalLinha(linha) }} peças</span>
                <span class="mono small">tempo padrão: {{ linha.tempoPadrao }} min/pç</span>
              </div>
            </div>

            <div v-if="!(funcSelecionado.linhas || []).length" class="dp-empty">
              Sem etapas registradas
            </div>
          </div>

          <!-- TAB: Por hora -->
          <div v-if="abaAtiva === 'Por hora'" class="dp-content">
            <div v-for="(hg, hi) in horasPorFuncionario(funcSelecionado)" :key="hi" class="dp-hora-bloco">
              <div class="dp-hora-head">
                <div class="dp-hora-head-left">
                  <span class="dp-hora-clock">🕐</span>
                  <span class="dp-hora-label">{{ hg.hora }}</span>
                </div>
                <span class="dp-hora-total">{{ hg.totalPecas }} peças · {{ hg.eficiencia }}%</span>
              </div>

              <div class="dp-hora-eff-row">
                <div class="dp-hora-eff-bar-track">
                  <div
                    class="dp-hora-eff-bar-fill"
                    :class="clsEfic(hg.eficiencia)"
                    :style="{ width: Math.min(hg.eficiencia, 100) + '%' }"
                  ></div>
                </div>
              </div>

              <table class="dp-hora-tbl">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th class="ta-r">Qtd.</th>
                    <th class="ta-r">Tempo prod.</th>
                    <th class="ta-r">Eficiência</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(et, ei) in hg.etapas" :key="ei">
                    <td class="dp-hora-etapa-nome">
                      {{ et.descricao }}
                      <span v-if="et.isFinal" class="tag-final">final</span>
                    </td>
                    <td class="ta-r mono">{{ et.quantidade }} pç</td>
                    <td class="ta-r mono">{{ et.tempoProduzido }} min</td>
                    <td class="ta-r">
                      <span class="badge sm" :class="clsEfic(et.eficiencia)">{{ et.eficiencia }}%</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="!horasPorFuncionario(funcSelecionado).length" class="dp-empty">
              Sem dados de produção por hora
            </div>
          </div>

        </aside>
      </transition>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client'
import { useAuthStore } from '@/store/store'
import api from '@/Axios'

const socket = io('https://acari-tex.onrender.com', { transports: ['websocket'] })

export default {
  name: 'PainelProfissionais',

  props: {
    filtro: { type: Object, default: () => ({}) },
  },

  setup() {
    return { store: useAuthStore() }
  },

  data() {
    return {
      loading: true,
      socketConectado: false,
      busca: '',
      selecionado: null,
      abaAtiva: 'Etapas',
      tabs: ['Etapas', 'Por hora'],

      opsAtivas: [],
      funcionariosDia: [],
      pecas: [],
    }
  },

  computed: {
    todasHoras() {
      const horasSet = new Set()

      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          for (const hora of Object.keys(linha.registros || {})) {
            horasSet.add(hora)
          }
        }
      }

      return [...horasSet].sort((a, b) => this.horaParaMinutos(a) - this.horaParaMinutos(b))
    },

    funcionariosOrdenados() {
      return [...this.funcionariosDia]
        .sort((a, b) => this.calcularEficienciaFuncionario(b) - this.calcularEficienciaFuncionario(a))
        .map((f, i) => ({ ...f, _idx: i }))
    },

    funcionariosFiltrados() {
      const q = this.busca.trim().toLowerCase()
      if (!q) return this.funcionariosOrdenados
      return this.funcionariosOrdenados.filter(f =>
        (f.nome || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
      )
    },

    funcSelecionado() {
      return this.selecionado !== null
        ? this.funcionariosOrdenados[this.selecionado]
        : null
    },

    // Eficiência da turma ponderada pelas peças FINALIZADAS (etapa final).
    // Só considera registros com tempoProduzido > 0 — sem fallback fictício.
    eficienciaMediaTurma() {
      // SAM e tempo do turno vêm da OP ativa
      const op = this.pecas.find(p => p.id_da_op === this.opsAtivas[0]?.pecaId)
      const sam = op?.tempo_padrao || 0
      // const tempoTurno = op?.Estabelecimento?.tempo_de_producao || 540 // minutos
      const tempoTurno = 540 // minutos

      const nFuncionarios = this.funcionariosOrdenados.length
      if (!nFuncionarios || !sam || !tempoTurno) return 0

      // Soma peças finalizadas de todos os funcionários no dia
      let totalPecas = 0
      for (const func of this.funcionariosOrdenados) {
        totalPecas += this.calcularTotalFinalizadoFuncionario(func)
      }

      // (Qtd × SAM) / (Nº Operadores × Tempo do Turno) × 100
      const tempoDisponivel = nFuncionarios * tempoTurno
      // console.log('totalPecas:', totalPecas, 'SAM:', sam, 'nFunc:', nFuncionarios, 'tempoTurno:', tempoTurno)
      // console.log(Math.round((totalPecas * sam) / tempoDisponivel * 100))
      return Math.round((totalPecas * sam) / tempoDisponivel * 100)
    },

    totalPecasGeral() {
      return this.funcionariosOrdenados.reduce(
        (soma, f) => soma + this.calcularTotalFinalizadoFuncionario(f),
        0
      )
    },
  },

  watch: {
    filtro: {
      deep: true,
      handler() {
        this.buscarMetaDia()
      },
    },
  },

  async mounted() {
    this.iniciarSocket()
    await this.carregarPecas()
    await this.buscarMetaDia()
  },

  beforeUnmount() {
    socket.off()
    socket.disconnect()
  },

  methods: {
    // ── HORA HELPERS ──────────────────────────────────────
    horaParaMinutos(hora) {
      if (!hora || typeof hora !== 'string') return 0
      const [h, m] = hora.split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    },

    // ── SOCKET ────────────────────────────────────────────
    iniciarSocket() {
      socket.on('connect', () => { this.socketConectado = true })
      socket.on('disconnect', () => { this.socketConectado = false })

      const cnpj = this.store.pegar_usuario.cnpj
      socket.on(`nova_atualizacao_${cnpj}`, () => {
        this.buscarMetaDia()
      })
    },

    // ── PEÇAS ─────────────────────────────────────────────
    async carregarPecas() {
      try {
        const res = await api.get('/pecas', {
          headers: { Authorization: this.store.pegar_token },
        })
        this.pecas = res.data.peca.em_progresso || []
        console.log('Peças carregadas:', this.pecas)
      } catch (err) {
        console.error(err)
      }
    },

    nomeDaOp(pecaId) {
      const peca = this.pecas.find(p => p.id_da_op === pecaId)
      return peca?.descricao || pecaId
    },

    // ── BUSCAR META (via rota HTTP) ───────────────────────
    async buscarMetaDia() {
      this.loading = true
      try {
        const res = await api.get('/producao/meta', {
          headers: { Authorization: this.store.pegar_token },
          params: {
            estabelecimento: this.filtro.estabelecimento ?? this.store.pegar_usuario.cnpj,
            data: this.filtro,
          },
        })

        const meta = res.data.metaDia
        if (!meta) {
          this.opsAtivas = []
          this.funcionariosDia = []
          return
        }

        this.opsAtivas = (meta.pecas || []).map(p => ({
          _uid: Date.now() + Math.random(),
          pecaId: p.id_da_op,
          metaDia: p.meta || 0,
        }))

        this.funcionariosDia = []

        for (const metaFunc of meta.funcionarios || []) {
          const linhas = []

          for (const producao of metaFunc.producoes || []) {
            const etapaId = producao.id_da_funcao

            let linha = linhas.find(l => l.etapaId === etapaId)

            if (!linha) {
              linha = {
                id: Date.now() + Math.random(),
                tipo: linhas.length === 0 ? 'principal' : 'extra',
                etapaId,
                descricao: producao.producao_etapa?.descricao || '',
                tempoPadrao: producao.producao_etapa?.tempo_padrao || 0,
                opId: producao.id_da_op || null,
                registros: {},
              }
              linhas.push(linha)
            }

            const hora = producao.hora_registro
            if (!hora) continue

            linha.registros[hora] = {
              quantidade: producao.quantidade_pecas || 0,
              tempoProduzido: producao.tempo_produzido || 0,
            }
          }

          this.funcionariosDia.push({
            email: metaFunc.funcionarioId,
            nome: metaFunc.funcionario?.nome || metaFunc.funcionarioId,
            foto: metaFunc.funcionario?.foto || null,
            linhas: linhas.length ? linhas : [],
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    // ── ETAPA FINAL ───────────────────────────────────────
    isEtapaFinal(linha) {
      if (!linha?.descricao) return false

      const desc = linha.descricao.toLowerCase()

      const palavrasIgnoradas = [
        'revisão médio',
        'revisao medio',
        'revisão média',
        'revisao media',
        'revisão intermediaria',
        'revisão intermediária',
        'revisao intermediaria',
        'revisao intermediária'
      ]

      if (palavrasIgnoradas.some(palavra => desc.includes(palavra))) {
        return false
      }

      const palavrasFinal = [
        'final',
        'acabamento',
        'finalização',
        'finalizacao',
        'revisão final',
        'revisao final',
        'revisão',
        'revisao',
        'qualidade',
        'expedição',
        'expedicao'
      ]

      return palavrasFinal.some(palavra => desc.includes(palavra))
    },

    // ── TOTAIS ────────────────────────────────────────────
    calcularTotalLinha(linha) {
      if (!linha?.registros) return 0
      return Object.values(linha.registros).reduce(
        (soma, reg) => soma + (Number(reg?.quantidade) || 0),
        0
      )
    },

    calcularTotalFuncionario(func) {
      if (!Array.isArray(func?.linhas)) return 0
      return func.linhas.reduce((soma, linha) => soma + this.calcularTotalLinha(linha), 0)
    },

    calcularTotalFinalizadoFuncionario(func) {
      if (!Array.isArray(func?.linhas)) return 0
      return func.linhas.reduce((soma, linha) => {
        if (!this.isEtapaFinal(linha)) return soma
        return soma + this.calcularTotalLinha(linha)
      }, 0)
    },

    // ── EFICIÊNCIA ────────────────────────────────────────
    // Só considera registros com tempoProduzido > 0 — sem || 60 fictício.

    calcularEficienciaRegistro(quantidade, tempoProduzido, tempoPadrao) {
      if (!quantidade || !tempoProduzido || !tempoPadrao) return 0
      return Math.round(((quantidade * tempoPadrao) / tempoProduzido) * 100)
    },

    calcularEficienciaLinha(linha) {
      if (!linha?.registros) return 0
      let produzido = 0
      let tempoProduzido = 0

      for (const reg of Object.values(linha.registros)) {
        if (reg && reg.quantidade > 0 && reg.tempoProduzido > 0) {
          produzido += reg.quantidade * (linha.tempoPadrao || 0)
          tempoProduzido += reg.tempoProduzido
        }
      }

      if (!tempoProduzido) return 0
      return Math.round((produzido / tempoProduzido) * 100)
    },

    calcularEficienciaFuncionario(func) {
      if (!func?.linhas?.length) return 0
      let somaProduzida = 0
      let somaTempo = 0

      for (const linha of func.linhas) {
        if (!linha?.registros) continue
        for (const reg of Object.values(linha.registros)) {
          if (reg && reg.quantidade > 0 && reg.tempoProduzido > 0) {
            somaProduzida += reg.quantidade * (linha.tempoPadrao || 0)
            somaTempo += reg.tempoProduzido
          }
        }
      }

      if (!somaTempo) return 0
      return Math.round((somaProduzida / somaTempo) * 100)
    },

    // ── POR HORA ──────────────────────────────────────────
    horasPorFuncionario(func) {
      if (!func?.linhas?.length) return []

      const resultado = []

      for (const hora of this.todasHoras) {
        const etapas = []
        let totalPecas = 0
        let somaProduzida = 0
        let somaTempoProduzido = 0

        for (const linha of func.linhas) {
          const reg = linha.registros?.[hora]
          if (!reg || !reg.quantidade || !reg.tempoProduzido) continue

          const eficiencia = this.calcularEficienciaRegistro(
            reg.quantidade,
            reg.tempoProduzido,
            linha.tempoPadrao
          )

          etapas.push({
            descricao: linha.descricao || linha.etapaId || '—',
            isFinal: this.isEtapaFinal(linha),
            quantidade: reg.quantidade,
            tempoProduzido: reg.tempoProduzido,
            eficiencia,
          })

          totalPecas += reg.quantidade
          somaProduzida += reg.quantidade * (linha.tempoPadrao || 0)
          somaTempoProduzido += reg.tempoProduzido
        }

        if (!etapas.length) continue

        resultado.push({
          hora,
          etapas,
          totalPecas,
          eficiencia: somaTempoProduzido
            ? Math.round((somaProduzida / somaTempoProduzido) * 100)
            : 0,
        })
      }

      return resultado
    },

    // ── HELPERS ───────────────────────────────────────────
    clsEfic(pct) {
      const n = parseFloat(pct)
      if (n >= 90) return 'verde'
      if (n >= 60) return 'amarelo'
      return 'vermelho'
    },

    selecionar(idx) {
      if (this.selecionado === idx) { this.selecionado = null; return }
      this.selecionado = idx
      this.abaAtiva = 'Etapas'
    },

    initials(nome) {
      return (nome || '').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
    },

    onImgError(e) { e.target.style.display = 'none' },

    rankIcon(i) {
      return ['🥇', '🥈', '🥉'][i] ?? i + 1
    },
  },
}
</script>

<style scoped>
.painel {
  --g900: #052e16;
  --g800: #14532d;
  --g700: #166534;
  --g600: #16a34a;
  --g200: #bbf7d0;
  --g100: #dcfce7;
  --g50:  #f0fdf4;

  --a700: #92400e;
  --a600: #d97706;
  --a100: #fef3c7;

  --r700: #991b1b;
  --r600: #dc2626;
  --r100: #fee2e2;

  --ink:  #0d1512;
  --ink2: #2d3f39;
  --ink3: #6b7f79;
  --line: #e3e8e6;
  --surf: #f6f8f7;
  --bg:   #ffffff;

  --rc: 10px;
  --rp: 999px;
  --rs: 6px;

  font-size: 14px;
  line-height: 1.5;
  border-radius: 10px;
  background: var(--bg);
  color: var(--ink);
  width: 100%;
  box-sizing: border-box;
  padding: 0;
}

/* TOP BAR */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
  flex-wrap: wrap;
}

.metrics-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.metric-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surf);
  border: 1px solid var(--line);
  border-radius: var(--rc);
  padding: 10px 18px;
}

.metric-chip.accent {
  background: var(--g800);
  border-color: transparent;
}

.mc-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .09em;
  color: var(--ink3);
}

.metric-chip.accent .mc-label { color: var(--g200); }

.mc-val {
  font-size: 20px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -.02em;
}

.metric-chip.accent .mc-val { color: #fff; }

.peca-chip {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.socket-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--r600);
  flex-shrink: 0;
  transition: background .3s;
}

.socket-dot.conectado { background: var(--g600); }

/* LAYOUT */
.main-layout {
  display: grid;
  grid-template-columns: 1fr;
  min-height: 0;
}

.main-layout.panel-open {
  grid-template-columns: 1fr 440px;
}

/* LISTA */
.grid-area {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px 10px;
  gap: 12px;
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.list-toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  font-size: 13px;
  padding: 5px 12px;
  border: 1px solid var(--line);
  border-radius: var(--rp);
  background: var(--surf);
  color: var(--ink);
  width: 180px;
  transition: border-color .15s;
}

.search-input:focus {
  outline: none;
  border-color: var(--g600);
}

.list-count {
  font-size: 12.5px;
  color: var(--ink3);
  white-space: nowrap;
}

.list-header {
  display: grid;
  grid-template-columns: 1fr 72px 110px;
  align-items: center;
  padding: 6px 24px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: var(--surf);
  position: sticky;
  top: 0;
  z-index: 1;
}

.lh-name {
  font-size: 11px;
  font-weight: 600;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink3);
}

.lh-col {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink3);
  text-align: right;
}

.list-body {
  overflow-y: auto;
  max-height: calc(100vh - 210px);
}

.list-row {
  display: grid;
  grid-template-columns: 1fr 72px 110px;
  align-items: center;
  padding: 9px 24px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background .1s;
}

.list-row:hover { background: var(--surf); }

.list-row.selected {
  background: var(--g50);
  border-right: 2px solid var(--g600);
}

.lr-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.lr-pos {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink3);
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  line-height: 1;
}

.lr-pos.medal { font-size: 18px; }

.lr-avatar-wrap { position: relative; flex-shrink: 0; }

.lr-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--line);
  display: block;
}

.lr-avatar-fb {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--g100);
  color: var(--g800);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lr-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid var(--bg);
}

.lr-dot.verde    { background: var(--g600); }
.lr-dot.amarelo  { background: var(--a600); }
.lr-dot.vermelho { background: var(--r600); }

.lr-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.lr-nome {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lr-sub {
  font-size: 11.5px;
  color: var(--ink3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lr-col {
  text-align: -webkit-center;
  font-size: 14px;
  color: var(--ink2);
}

.mono { font-variant-numeric: tabular-nums; }

.list-empty {
  padding: 36px 24px;
  text-align: center;
  color: var(--ink3);
  font-size: 14px;
}

/* BADGES */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--rp);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.badge.verde    { background: var(--g100); color: var(--g800); }
.badge.amarelo  { background: var(--a100); color: var(--a700); }
.badge.vermelho { background: var(--r100); color: var(--r700); }
.badge.sm  { font-size: 12px; padding: 2px 8px; }
.badge.xlg { font-size: 15px; padding: 5px 16px; }

.tag-final {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  background: var(--g100);
  color: var(--g800);
  border-radius: var(--rp);
  padding: 1px 6px;
  margin-left: 5px;
  vertical-align: middle;
}

/* PAINEL LATERAL */
.detail-panel {
  border-left: 1px solid var(--line);
  background: var(--bg);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 210px);
}

.dp-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 18px;
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  background: var(--bg);
  z-index: 2;
}

.dp-topbar-title {
  font-size: 12.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .09em;
  color: var(--ink3);
}

.dp-close {
  background: var(--surf);
  border: 1px solid var(--line);
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 12px;
  color: var(--ink3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .1s;
}

.dp-close:hover { background: var(--line); color: var(--ink); }

.dp-profile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
}

.dp-avatar-wrap { position: relative; flex-shrink: 0; }

.dp-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--line);
  display: block;
}

.dp-avatar-fb {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--g100);
  color: var(--g800);
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dp-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--bg);
}

.dp-dot.verde    { background: var(--g600); }
.dp-dot.amarelo  { background: var(--a600); }
.dp-dot.vermelho { background: var(--r600); }

.dp-profile-info { flex: 1; min-width: 0; }

.dp-nome {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dp-email {
  font-size: 12px;
  color: var(--ink3);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dp-stats {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}

.dp-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: center;
}

.dp-stat-div { width: 1px; height: 36px; background: var(--line); }

.dp-stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink3);
}

.dp-stat-val {
  font-size: 20px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -.02em;
}

.dp-stat-val.verde    { color: var(--g700); }
.dp-stat-val.amarelo  { color: var(--a600); }
.dp-stat-val.vermelho { color: var(--r600); }

.dp-eff-bar-wrap {
  padding: 12px 18px 14px;
  border-bottom: 1px solid var(--line);
}

.dp-eff-bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ink3);
  margin-bottom: 6px;
  font-weight: 500;
}

.dp-eff-bar-labels span:last-child { font-weight: 700; }
.dp-eff-bar-labels .verde    { color: var(--g700); }
.dp-eff-bar-labels .amarelo  { color: var(--a600); }
.dp-eff-bar-labels .vermelho { color: var(--r600); }

.dp-eff-bar-track {
  height: 7px;
  background: var(--line);
  border-radius: var(--rp);
  overflow: hidden;
}

.dp-eff-bar-fill {
  height: 100%;
  border-radius: var(--rp);
  transition: width .5s ease;
}

.dp-eff-bar-fill.verde    { background: var(--g600); }
.dp-eff-bar-fill.amarelo  { background: var(--a600); }
.dp-eff-bar-fill.vermelho { background: var(--r600); }

.dp-tabs {
  display: flex;
  border-bottom: 1px solid var(--line);
  padding: 0 18px;
}

.dp-tab {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink3);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 16px;
  cursor: pointer;
  transition: color .12s, border-color .12s;
  margin-bottom: -1px;
}

.dp-tab:hover { color: var(--ink); }

.dp-tab.active {
  color: var(--g700);
  border-bottom-color: var(--g600);
  font-weight: 600;
}

.dp-content { padding: 16px 18px; flex: 1; }

.dp-etapa {
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.dp-etapa:last-child { border-bottom: none; }

.dp-etapa-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
  gap: 8px;
}

.dp-etapa-nome {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dp-etapa-bar-track {
  height: 5px;
  background: var(--line);
  border-radius: var(--rp);
  overflow: hidden;
  margin-bottom: 6px;
}

.dp-etapa-bar-fill {
  height: 100%;
  border-radius: var(--rp);
  transition: width .4s ease;
}

.dp-etapa-bar-fill.verde    { background: var(--g600); }
.dp-etapa-bar-fill.amarelo  { background: var(--a600); }
.dp-etapa-bar-fill.vermelho { background: var(--r600); }

.dp-etapa-bottom { display: flex; justify-content: space-between; }

.small { font-size: 12px; color: var(--ink3); }

/* POR HORA */
.dp-hora-bloco {
  border: 1px solid var(--line);
  border-radius: var(--rs);
  overflow: hidden;
  margin-bottom: 10px;
}

.dp-hora-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  background: var(--surf);
  border-bottom: 1px solid var(--line);
}

.dp-hora-head-left {
  display: flex;
  align-items: center;
  gap: 7px;
}

.dp-hora-clock { font-size: 14px; line-height: 1; }
.dp-hora-label { font-size: 14px; font-weight: 600; color: var(--ink); }
.dp-hora-total { font-size: 12.5px; color: var(--ink3); }

.dp-hora-eff-row {
  padding: 7px 14px 0;
  background: var(--surf);
  border-bottom: 1px solid var(--line);
}

.dp-hora-eff-bar-track {
  height: 4px;
  background: var(--line);
  border-radius: var(--rp);
  overflow: hidden;
  margin-bottom: 7px;
}

.dp-hora-eff-bar-fill {
  height: 100%;
  border-radius: var(--rp);
  transition: width .4s ease;
}

.dp-hora-eff-bar-fill.verde    { background: var(--g600); }
.dp-hora-eff-bar-fill.amarelo  { background: var(--a600); }
.dp-hora-eff-bar-fill.vermelho { background: var(--r600); }

.dp-hora-tbl { width: 100%; border-collapse: collapse; }

.dp-hora-tbl th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: var(--ink3);
  padding: 6px 14px;
  text-align: left;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
}

.dp-hora-tbl td {
  padding: 8px 14px;
  text-align: left;
  font-size: 13.5px;
  color: var(--ink);
  border-bottom: 1px solid var(--line);
}

.dp-hora-tbl tr:last-child td { border-bottom: none; }
.dp-hora-etapa-nome { font-weight: 500; color: var(--ink2); }
.ta-r { text-align: right; }

.dp-empty {
  text-align: center;
  color: var(--ink3);
  font-size: 14px;
  padding: 28px 0;
}

/* TRANSIÇÃO */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: opacity .18s ease, transform .2s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

/* RESPONSIVO */
@media (max-width: 900px) {
  .main-layout.panel-open { grid-template-columns: 1fr; }
  .detail-panel { border-left: none; border-top: 1px solid var(--line); max-height: 55vh; }
}

@media (max-width: 560px) {
  .top-bar { padding: 12px 16px; }
  .list-header, .list-row { padding: 8px 16px; }
  .list-title { display: none; }
  .search-input { width: 130px; }
}
</style>