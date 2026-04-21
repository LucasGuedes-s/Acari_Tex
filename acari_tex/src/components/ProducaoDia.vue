<template>
  <div class="painel">

    <!-- TOP BAR -->
    <header class="top-bar">
      <div class="metrics-row">
        <div class="metric-chip accent">
          <span class="mc-label">Eficiência da turma</span>
          <span class="mc-val">{{ producaoDia?.eficienciaMediaTurma || '—' }}</span>
        </div>
        <div class="metric-chip">
          <span class="mc-label">Funcionários</span>
          <span class="mc-val">{{ producaoDia?.quantidadePessoas || 0 }}</span>
        </div>
        <div class="metric-chip">
          <span class="mc-label">Peças entregues</span>
          <span class="mc-val">{{ producaoDia?.totalPecas || 0 }}</span>
        </div>
        <div class="metric-chip">
          <span class="mc-label">Jornada</span>
          <span class="mc-val">{{ producaoDia?.minutosDisponiveis || 0 }} min</span>
        </div>
        <div class="metric-chip" v-if="producaoDia?.descricaoPeca">
          <span class="mc-label">Peça do dia</span>
          <span class="mc-val peca-chip">{{ producaoDia.descricaoPeca }}</span>
        </div>
      </div>
      <input class="date-input" type="date" v-model="dataSelecionada" @change="emitirData" />
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
            :key="func.funcionario"
            class="list-row"
            :class="{ selected: selecionado === func._idx }"
            @click="selecionar(func._idx)"
          >
            <div class="lr-name">
              <!-- Medalha para top 3, número para os demais -->
              <span class="lr-pos" :class="{ medal: func._idx < 3 }">
                {{ rankIcon(func._idx) }}
              </span>
              <div class="lr-avatar-wrap">
                <img
                  v-if="func.foto"
                  class="lr-avatar"
                  :src="func.foto"
                  :alt="func.nome"
                  @error="onImgError"
                />
                <div v-else class="lr-avatar-fb">{{ initials(func.nome) }}</div>
                <span class="lr-dot" :class="cls(parseFloat(func.eficiencia_pessoal))"></span>
              </div>
              <div class="lr-info">
                <span class="lr-nome">{{ func.nome }}</span>
                <span class="lr-sub">{{ func.funcionario }}</span>
              </div>
            </div>
            <span class="lr-col mono">{{ func.total_pecas }}</span>
            <span class="lr-col">
              <span class="badge" :class="cls(parseFloat(func.eficiencia_pessoal))">
                {{ func.eficiencia_pessoal }}
              </span>
            </span>
          </div>

          <div v-if="funcionariosFiltrados.length === 0" class="list-empty">
            Nenhum resultado para "{{ busca }}"
          </div>
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
              <img
                v-if="funcSelecionado.foto"
                class="dp-avatar"
                :src="funcSelecionado.foto"
                :alt="funcSelecionado.nome"
                @error="onImgError"
              />
              <div v-else class="dp-avatar-fb">{{ initials(funcSelecionado.nome) }}</div>
              <span class="dp-dot" :class="cls(parseFloat(funcSelecionado.eficiencia_pessoal))"></span>
            </div>
            <div class="dp-profile-info">
              <h3 class="dp-nome">{{ funcSelecionado.nome }}</h3>
              <p class="dp-email">{{ funcSelecionado.funcionario }}</p>
            </div>
            <span class="badge xlg" :class="cls(parseFloat(funcSelecionado.eficiencia_pessoal))">
              {{ funcSelecionado.eficiencia_pessoal }}
            </span>
          </div>

          <!-- Métricas compactas -->
          <div class="dp-stats">
            <div class="dp-stat">
              <span class="dp-stat-label">Peças</span>
              <span class="dp-stat-val">{{ funcSelecionado.total_pecas }}</span>
            </div>
            <div class="dp-stat-div"></div>
            <div class="dp-stat">
              <span class="dp-stat-label">Min. produzidos</span>
              <span class="dp-stat-val" :class="cls(parseFloat(funcSelecionado.eficiencia_pessoal))">
                {{ funcSelecionado.tempo_padrao_produzido }}
              </span>
            </div>
            <div class="dp-stat-div"></div>
            <div class="dp-stat">
              <span class="dp-stat-label">Jornada</span>
              <span class="dp-stat-val">{{ funcSelecionado.tempo_real_total }} min</span>
            </div>
          </div>

          <!-- Barra de eficiência geral -->
          <div class="dp-eff-bar-wrap">
            <div class="dp-eff-bar-labels">
              <span>Eficiência geral</span>
              <span :class="cls(parseFloat(funcSelecionado.eficiencia_pessoal))">
                {{ funcSelecionado.eficiencia_pessoal }}
              </span>
            </div>
            <div class="dp-eff-bar-track">
              <div
                class="dp-eff-bar-fill"
                :class="cls(parseFloat(funcSelecionado.eficiencia_pessoal))"
                :style="{ width: Math.min(parseFloat(funcSelecionado.eficiencia_pessoal), 100) + '%' }"
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
            <div
              v-for="(et, i) in funcSelecionado.etapas"
              :key="i"
              class="dp-etapa"
            >
              <div class="dp-etapa-top">
                <span class="dp-etapa-nome">{{ et.descricao }}</span>
                <span class="badge sm" :class="cls(parseFloat(et.eficiencia_etapa))">{{ et.eficiencia_etapa }}</span>
              </div>
              <div class="dp-etapa-bar-track">
                <div
                  class="dp-etapa-bar-fill"
                  :class="cls(parseFloat(et.eficiencia_etapa))"
                  :style="{ width: Math.min(parseFloat(et.eficiencia_etapa), 100) + '%' }"
                ></div>
              </div>
              <div class="dp-etapa-bottom">
                <span class="mono small">{{ et.pecas_produzidas }} peças</span>
                <span class="mono small">{{ et.tempo_padrao_total }} min padrão</span>
              </div>
            </div>
          </div>

          <!-- TAB: Por hora -->
          <div v-if="abaAtiva === 'Por hora'" class="dp-content">
            <div
              v-for="(hg, hi) in funcSelecionado.producaoPorHora"
              :key="hi"
              class="dp-hora-bloco"
            >
              <div class="dp-hora-head">
                <div class="dp-hora-head-left">
                  <span class="dp-hora-clock">🕐</span>
                  <span class="dp-hora-label">{{ hg.hora }}</span>
                </div>
                <span class="dp-hora-total">{{ hg.total }} peças nessa hora</span>
              </div>

              <div class="dp-hora-eff-row">
                <div class="dp-hora-eff-bar-track">
                  <div
                    class="dp-hora-eff-bar-fill"
                    :class="cls(eficienciaHora(hg))"
                    :style="{ width: Math.min(eficienciaHora(hg), 100) + '%' }"
                  ></div>
                </div>
              </div>

              <table class="dp-hora-tbl">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th class="ta-r">Qtd.</th>
                    <th class="ta-r">Eficiência</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(et, ei) in hg.etapas" :key="ei">
                    <td class="dp-hora-etapa-nome">{{ et.etapa }}</td>
                    <td class="ta-r mono">{{ et.total }} pç</td>
                    <td class="ta-r">
                      <span class="badge sm" :class="cls(parseFloat(et.eficiencia_etapa_hora))">
                        {{ et.eficiencia_etapa_hora }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="!funcSelecionado.producaoPorHora?.length" class="dp-empty">
              Sem dados de produção por hora
            </div>
          </div>

        </aside>
      </transition>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PainelProfissionais',
  props: {
    producaoDados: { type: Object, default: null },
  },
  data() {
    return {
      selecionado: null,
      abaAtiva: 'Etapas',
      busca: '',
      dataSelecionada: new Date().toISOString().slice(0, 10),
      tabs: ['Etapas', 'Por hora'],
    };
  },
  computed: {
    producaoDia() {
      return this.producaoDados?.producao?.producaoDia || null;
    },
    funcionariosOrdenados() {
      return [...(this.producaoDia?.funcionarios || [])]
        .sort((a, b) => parseFloat(b.eficiencia_pessoal) - parseFloat(a.eficiencia_pessoal))
        .map((f, i) => ({ ...f, _idx: i }));
    },
    funcionariosFiltrados() {
      const q = this.busca.trim().toLowerCase();
      if (!q) return this.funcionariosOrdenados;
      return this.funcionariosOrdenados.filter(f =>
        f.nome.toLowerCase().includes(q) || f.funcionario.toLowerCase().includes(q)
      );
    },
    funcSelecionado() {
      return this.selecionado !== null
        ? this.funcionariosOrdenados[this.selecionado]
        : null;
    },
  },
  methods: {
    selecionar(idx) {
      if (this.selecionado === idx) { this.selecionado = null; return; }
      this.selecionado = idx;
      this.abaAtiva = 'Etapas';
    },
    emitirData() { this.$emit('filtrar-data', this.dataSelecionada); },
    cls(v) {
      const n = parseFloat(v);
      if (n >= 90) return 'verde';
      if (n >= 60) return 'amarelo';
      return 'vermelho';
    },
    eficienciaHora(hg) {
      if (!hg.etapas?.length) return 0;
      const vals = hg.etapas.map(e => parseFloat(e.eficiencia_etapa_hora) || 0);
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    },
    initials(nome) {
      return (nome || '').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
    },
    onImgError(e) { e.target.style.display = 'none'; },
    rankIcon(i) {
      return ['🥇', '🥈', '🥉'][i] ?? i + 1;
    },
  },
};
</script>

<style scoped>
/* ══════════════════════════════════════════
   TOKENS
══════════════════════════════════════════ */
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
  --a50:  #fffbeb;

  --r700: #991b1b;
  --r600: #dc2626;
  --r100: #fee2e2;
  --r50:  #fff5f5;

  --ink:  #0d1512;
  --ink2: #2d3f39;
  --ink3: #6b7f79;
  --line: #e3e8e6;
  --surf: #f6f8f7;
  --bg:   #ffffff;

  --rc:  10px;
  --rp:  999px;
  --rs:  6px;

  font-size: 14px;
  line-height: 1.5;
  background: var(--bg);
  color: var(--ink);
  width: 100%;
  box-sizing: border-box;
  padding: 0;
}

/* ══════════════════════════════════════════
   TOP BAR
══════════════════════════════════════════ */
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

.date-input {
  font-size: 12px;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: var(--rs);
  background: var(--surf);
  color: var(--ink3);
  cursor: pointer;
  flex-shrink: 0;
}
.date-input:focus { outline: none; border-color: var(--g600); color: var(--ink); }

/* ══════════════════════════════════════════
   LAYOUT
══════════════════════════════════════════ */
.main-layout {
  display: grid;
  grid-template-columns: 1fr;
  min-height: 0;
}

.main-layout.panel-open {
  grid-template-columns: 1fr 440px;
}

/* ══════════════════════════════════════════
   LISTA
══════════════════════════════════════════ */
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

/* LINHAS */
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

/* Posição / medalha */
.lr-pos {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink3);
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  line-height: 1;
}

.lr-pos.medal {
  font-size: 18px;   /* medalhas maiores que números */
}

.lr-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

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
  text-align: right;
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

/* ══════════════════════════════════════════
   BADGES
══════════════════════════════════════════ */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--rp);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.badge.verde    { background: var(--g100);  color: var(--g800); }
.badge.amarelo  { background: var(--a100);  color: var(--a700); }
.badge.vermelho { background: var(--r100);  color: var(--r700); }
.badge.sm  { font-size: 12px; padding: 2px 8px; }
.badge.xlg { font-size: 15px; padding: 5px 16px; }

/* ══════════════════════════════════════════
   PAINEL LATERAL (440px)
══════════════════════════════════════════ */
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

/* Profile */
.dp-profile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
}

.dp-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

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

.dp-profile-info {
  flex: 1;
  min-width: 0;
}

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

/* Stats em linha */
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

.dp-stat-div {
  width: 1px;
  height: 36px;
  background: var(--line);
}

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

/* Barra eficiência */
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

/* Tabs */
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

/* Conteúdo tabs */
.dp-content {
  padding: 16px 18px;
  flex: 1;
}

/* Etapas */
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

.dp-etapa-bottom {
  display: flex;
  justify-content: space-between;
}

.small { font-size: 12px; color: var(--ink3); }

/* ══════════════════════════════════════════
   POR HORA
══════════════════════════════════════════ */
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

.dp-hora-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.dp-hora-total {
  font-size: 12.5px;
  color: var(--ink3);
}

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

.dp-hora-tbl {
  width: 100%;
  border-collapse: collapse;
}

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
  font-size: 13.5px;
  color: var(--ink);
  border-bottom: 1px solid var(--line);
}

.dp-hora-tbl tr:last-child td { border-bottom: none; }

.dp-hora-etapa-nome {
  font-weight: 500;
  color: var(--ink2);
}

.ta-r { text-align: right; }

.dp-empty {
  text-align: center;
  color: var(--ink3);
  font-size: 14px;
  padding: 28px 0;
}

/* ══════════════════════════════════════════
   TRANSIÇÃO
══════════════════════════════════════════ */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: opacity .18s ease, transform .2s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

/* ══════════════════════════════════════════
   RESPONSIVO
══════════════════════════════════════════ */
@media (max-width: 900px) {
  .main-layout.panel-open { grid-template-columns: 1fr; }
  .detail-panel {
    border-left: none;
    border-top: 1px solid var(--line);
    max-height: 55vh;
  }
}

@media (max-width: 560px) {
  .top-bar { padding: 12px 16px; }
  .list-header, .list-row { padding: 8px 16px; }
  .list-title { display: none; }
  .search-input { width: 130px; }
}
</style>
