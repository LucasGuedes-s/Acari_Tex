<!--
  ProducaoRankingTV.vue
  ======================================================================
  Tela de Produção / Ranking para exibição contínua em TV de fábrica.

  ESTA TELA SUBSTITUI A ANTERIOR. Reaproveita apenas a lógica de acesso
  a dados (chamadas à API existente e ao Socket.IO), com toda a
  interface reconstruída do zero.

  --------------------------------------------------------------------
  CONTRATO DE DADOS ESPERADO / NECESSÁRIO NO BACKEND
  --------------------------------------------------------------------
  O componente já funciona com o formato atual da API (`/producao/equipe`
  e `/meta-diaria`), mas para cumprir 100% a regra de negócio pedida
  (cálculo de eficiência conforme `tipo_de_producao` do Estabelecimento)
  o ideal é que o backend passe a devolver também:

    Estabelecimento.tipo_de_producao  -> "padrao" | "ficha"
      (pode vir dentro de `producao.estabelecimento.tipo_de_producao`
       ou em `producao.tipo_de_producao` — o componente tenta os dois)

    Por funcionário, dentro de `producao.funcionarios[i]`:
      - tempo_padrao        (tempo padrão da ficha técnica da etapa)
      - tempo_referencia    (tempo de referência do funcionário, se houver)
      - tipo_tempo_utilizado -> "padrao" | "referencia"  (opcional; se o
        backend já enviar, o componente usa direto. Se não enviar, o
        componente CALCULA sozinho a partir da regra abaixo, então a
        tela já funciona mesmo sem essa alteração no backend)
      - etapa_atual, op_atual (para exibir na linha do ranking)

  --------------------------------------------------------------------
  REGRA DE CÁLCULO (implementada em `obterInfoTempo`)
  --------------------------------------------------------------------
    tipo_de_producao === "padrao"
      -> usa SEMPRE tempo_padrao (ficha técnica)

    tipo_de_producao === "ficha"
      -> usa tempo_referencia do funcionário
      -> se o funcionário não tiver tempo_referencia para a etapa,
         cai automaticamente para tempo_padrao

  O valor de eficiência em si (`eficiencia_pessoal`) continua vindo
  pronto da API, exatamente como hoje — este componente só decide
  QUAL badge mostrar ("Tempo: Referência" / "Tempo: Ficha Técnica"),
  espelhando a mesma regra para que o texto exibido nunca contradiga
  o cálculo feito no servidor.
-->

<template>
  <div class="tv-container">
    <!-- Faixa "andon" no topo: reflete a saúde geral da produção -->
    <div class="andon-bar" :class="`andon-${statusGeralClasse}`"></div>

    <!-- ================= CARREGANDO ================= -->
    <div v-if="carregando" class="estado-tela">
      <img src="@/assets/Logofundo.png" class="estado-logo" alt="LinhaTex" />
      <h1>Carregando produção...</h1>
    </div>

    <!-- ================= SEM DADOS ================= -->
    <div v-else-if="semDados" class="estado-tela vazio">
      <img src="@/assets/Logofundo.png" class="estado-logo grande" alt="LinhaTex" />
      <h1>Nenhuma produção registrada hoje</h1>
      <p>Assim que houver apontamentos, o painel é atualizado automaticamente.</p>
    </div>

    <!-- ================= CONTEÚDO ================= -->
    <template v-else>
      <!-- ---------- CABEÇALHO ---------- -->
      <header class="tv-header">
        <div class="header-brand">
          <img src="@/assets/Logofundo.png" class="brand-logo" alt="LinhaTex" />
          <div class="brand-text">
            <span class="brand-title">{{ nomeEstabelecimento }}</span>
            <span class="brand-sub">Painel de Produção</span>
          </div>
        </div>

        <div class="header-center">
          <span class="clock">{{ horaAtual }}</span>
          <span class="date">{{ dataAtualTexto }} · {{ turnoAtual }}</span>
        </div>

        <div class="header-status">
          <div class="status-chip" :class="socketConectado ? 'chip-on' : 'chip-off'">
            <span class="pulse-dot"></span>
            {{ socketConectado ? 'Online' : 'Offline' }}
          </div>
          <div class="last-update">Atualizado {{ ultimaAtualizacaoTexto }}</div>
        </div>
      </header>

      <!-- ---------- INDICADORES PRINCIPAIS ---------- -->
      <section class="kpi-grid">
        <div v-for="kpi in kpis" :key="kpi.label" class="kpi-card">
          <span class="kpi-icon" aria-hidden="true">{{ kpi.icon }}</span>
          <span class="kpi-value" :class="kpi.colorClass">{{ kpi.value }}</span>
          <span class="kpi-label">{{ kpi.label }}</span>
        </div>
      </section>

      <!-- ---------- PALCO PRINCIPAL (modos alternados) ---------- -->
      <section class="stage">
        <transition name="stage-fade" mode="out-in">
          <!-- MODO: RANKING -->
          <div v-if="modo === 'ranking'" key="ranking" class="stage-panel">
            <div class="panel-header">
              <h2>Ranking de Eficiência</h2>
              <span class="panel-sub">{{ rankingOrdenado.length }} colaboradores em produção</span>
            </div>

            <div class="ranking-list">
              <div
                v-for="(f, i) in rankingOrdenado"
                :key="f.funcionario"
                class="ranking-row"
                :class="faixaClasse(f.eficiencia_pessoal)"
              >
                <span class="rk-pos">{{ i + 1 }}</span>

                <img :src="f.foto || fotoPadrao" class="rk-avatar" alt="" />

                <div class="rk-info">
                  <span class="rk-nome">{{ f.nome }}</span>
                  <span class="rk-etapa">{{ f.etapa_atual || 'Etapa não informada' }} · OP {{ f.op_atual || '—' }}</span>
                </div>

                <div class="rk-producao">
                  <span class="rk-producao-valor">{{ f.total_pecas ?? 0 }}</span>
                  <span class="rk-producao-label">peças</span>
                </div>

                <span class="rk-eficiencia" :class="faixaClasse(f.eficiencia_pessoal)">
                  {{ f.eficiencia_pessoal }}
                </span>

                <span class="rk-tempo-badge" :class="`badge-${obterInfoTempo(f).tipo}`">
                  Tempo: {{ obterInfoTempo(f).tipo === 'referencia' ? 'Referência' : 'Ficha Técnica' }}
                </span>
              </div>
            </div>
          </div>

          <!-- MODO: PÓDIO -->
          <div v-else-if="modo === 'podio'" key="podio" class="stage-panel">
            <div class="panel-header">
              <h2>Pódio do Dia</h2>
              <span class="panel-sub">Os três melhores desempenhos</span>
            </div>

            <div class="podio">
              <div v-if="top3[1]" class="podio-lugar lugar-2">
                <span class="podio-medalha">🥈</span>
                <img :src="top3[1].foto || fotoPadrao" class="podio-avatar" alt="" />
                <span class="podio-nome">{{ top3[1].nome }}</span>
                <span class="podio-eficiencia" :class="faixaClasse(top3[1].eficiencia_pessoal)">
                  {{ top3[1].eficiencia_pessoal }}
                </span>
                <span class="podio-producao">{{ top3[1].total_pecas ?? 0 }} peças</span>
                <div class="podio-base base-2">2</div>
              </div>

              <div v-if="top3[0]" class="podio-lugar lugar-1">
                <span class="podio-medalha">🥇</span>
                <img :src="top3[0].foto || fotoPadrao" class="podio-avatar avatar-grande" alt="" />
                <span class="podio-nome">{{ top3[0].nome }}</span>
                <span class="podio-eficiencia" :class="faixaClasse(top3[0].eficiencia_pessoal)">
                  {{ top3[0].eficiencia_pessoal }}
                </span>
                <span class="podio-producao">{{ top3[0].total_pecas ?? 0 }} peças</span>
                <div class="podio-base base-1">1</div>
              </div>

              <div v-if="top3[2]" class="podio-lugar lugar-3">
                <span class="podio-medalha">🥉</span>
                <img :src="top3[2].foto || fotoPadrao" class="podio-avatar" alt="" />
                <span class="podio-nome">{{ top3[2].nome }}</span>
                <span class="podio-eficiencia" :class="faixaClasse(top3[2].eficiencia_pessoal)">
                  {{ top3[2].eficiencia_pessoal }}
                </span>
                <span class="podio-producao">{{ top3[2].total_pecas ?? 0 }} peças</span>
                <div class="podio-base base-3">3</div>
              </div>
            </div>
          </div>

          <!-- MODO: TABELA COMPLETA -->
          <div v-else-if="modo === 'tabela'" key="tabela" class="stage-panel">
            <div class="panel-header">
              <h2>Eficiência Individual</h2>
              <span class="panel-sub">Tabela completa</span>
            </div>

            <div class="tabela-wrap">
              <table class="tabela-completa">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Funcionário</th>
                    <th>Etapa / OP</th>
                    <th>Peças</th>
                    <th>Eficiência</th>
                    <th>Tempo utilizado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(f, i) in rankingOrdenado"
                    :key="f.funcionario"
                    :class="faixaClasse(f.eficiencia_pessoal)"
                  >
                    <td>{{ i + 1 }}</td>
                    <td class="funcionario-cell">
                      <img :src="f.foto || fotoPadrao" class="avatar" alt="" />
                      <span>{{ f.nome }}</span>
                    </td>
                    <td>{{ f.etapa_atual || '—' }} · OP {{ f.op_atual || '—' }}</td>
                    <td>{{ f.total_pecas ?? 0 }}</td>
                    <td class="col-eficiencia" :class="faixaClasse(f.eficiencia_pessoal)">
                      {{ f.eficiencia_pessoal }}
                    </td>
                    <td>
                      <span class="rk-tempo-badge" :class="`badge-${obterInfoTempo(f).tipo}`">
                        {{ obterInfoTempo(f).tipo === 'referencia' ? 'Referência' : 'Ficha Técnica' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- MODO: INDICADORES EM DESTAQUE -->
          <div v-else key="indicadores" class="stage-panel">
            <div class="panel-header">
              <h2>Indicadores Gerais</h2>
              <span class="panel-sub">{{ nomeEstabelecimento }}</span>
            </div>

            <div class="indicadores-grande-grid">
              <div v-for="kpi in kpis" :key="`big-${kpi.label}`" class="indicador-grande">
                <span class="ind-icon" aria-hidden="true">{{ kpi.icon }}</span>
                <span class="ind-value" :class="kpi.colorClass">{{ kpi.value }}</span>
                <span class="ind-label">{{ kpi.label }}</span>
              </div>

              <div class="indicador-grande indicador-meta" v-if="meta">
                <span class="ind-label">Progresso da Meta</span>
                <div class="progresso-container-grande">
                  <div class="progresso-bar-grande" :style="{ width: porcentagemMeta + '%' }"></div>
                </div>
                <span class="ind-value ind-value-media">{{ porcentagemMeta }}%</span>
              </div>
            </div>
          </div>
        </transition>
      </section>

      <!-- ---------- INDICADOR DE MODO ---------- -->
      <footer class="mode-dots">
        <span
          v-for="m in modos"
          :key="m.chave"
          class="dot"
          :class="{ active: modo === m.chave }"
        ></span>
      </footer>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { io } from "socket.io-client";
import api from "@/Axios";
import { useAuthStore } from "@/store/store";

const fotoPadrao = "https://via.placeholder.com/96";

/* ================= SOCKET ================= */
const socket = io("https://acari-tex.onrender.com");
const socketConectado = ref(false);

/* ================= ESTADOS DE DADOS ================= */
const carregando = ref(true);
const semDados = ref(false);

const producao = ref(null);
const meta = ref(null);
const ultimaAtualizacao = ref(null);

/* ================= RELÓGIO ================= */
const agora = ref(new Date());
let intervaloRelogio = null;

const horaAtual = computed(() =>
  agora.value.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
);

const dataAtualTexto = computed(() =>
  agora.value.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
);

const turnoAtual = computed(() => {
  if (producao.value?.turno) return producao.value.turno;
  const h = agora.value.getHours();
  if (h >= 5 && h < 12) return "Turno Manhã";
  if (h >= 12 && h < 18) return "Turno Tarde";
  return "Turno Noite";
});

const ultimaAtualizacaoTexto = computed(() => {
  if (!ultimaAtualizacao.value) return "—";
  const diffSeg = Math.floor((agora.value - ultimaAtualizacao.value) / 1000);
  if (diffSeg < 5) return "agora mesmo";
  if (diffSeg < 60) return `há ${diffSeg}s`;
  const diffMin = Math.floor(diffSeg / 60);
  return `há ${diffMin} min`;
});

/* ================= ALTERNÂNCIA DE MODOS ================= */
const modos = [
  { chave: "ranking" },
  { chave: "podio" },
  { chave: "tabela" },
  { chave: "indicadores" },
];
const modoIndex = ref(0);
const modo = computed(() => modos[modoIndex.value].chave);
let intervaloModo = null;
const DURACAO_MODO_MS = 25 * 1000; // 20–30s conforme especificação

function proximoModo() {
  modoIndex.value = (modoIndex.value + 1) % modos.length;
}

/* ================= HELPERS DE NEGÓCIO ================= */
function toNumberPercent(valor) {
  return Number(String(valor).replace("%", "").replace(",", ".")) || 0;
}

// Faixa de eficiência para as cores do painel (verde / amarelo / vermelho)
function faixaClasse(valor) {
  const v = toNumberPercent(valor);
  if (v >= 85) return "faixa-alta";
  if (v >= 65) return "faixa-media";
  return "faixa-baixa";
}

// Tipo de produção do estabelecimento: "padrao" | "ficha"
const tipoProducaoFabrica = computed(() => {
  return (
    producao.value?.estabelecimento?.tipo_de_producao ||
    producao.value?.tipo_de_producao ||
    "padrao"
  );
});

// Decide qual tempo foi (ou seria) utilizado para aquele funcionário,
// seguindo exatamente a regra descrita no topo do arquivo.
function obterInfoTempo(funcionario) {
  // Se o backend já mandar a decisão pronta, respeita ela.
  if (funcionario.tipo_tempo_utilizado === "referencia" || funcionario.tipo_tempo_utilizado === "padrao") {
    return {
      tipo: funcionario.tipo_tempo_utilizado === "referencia" ? "referencia" : "ficha",
      valor:
        funcionario.tipo_tempo_utilizado === "referencia"
          ? funcionario.tempo_referencia
          : funcionario.tempo_padrao,
    };
  }

  if (tipoProducaoFabrica.value === "padrao") {
    return { tipo: "ficha", valor: funcionario.tempo_padrao };
  }

  // tipoProducaoFabrica === "ficha" -> tenta tempo de referência do funcionário
  const temReferencia = Number(funcionario.tempo_referencia) > 0;
  if (temReferencia) {
    return { tipo: "referencia", valor: funcionario.tempo_referencia };
  }
  return { tipo: "ficha", valor: funcionario.tempo_padrao };
}

/* ================= RANKING / TOP 3 ================= */
const rankingOrdenado = computed(() => {
  if (!producao.value?.funcionarios) return [];
  return [...producao.value.funcionarios].sort(
    (a, b) => toNumberPercent(b.eficiencia_pessoal) - toNumberPercent(a.eficiencia_pessoal)
  );
});

const top3 = computed(() => rankingOrdenado.value.slice(0, 3));

/* ================= META ================= */
const porcentagemMeta = computed(() => {
  if (!meta.value || !producao.value) return 0;
  return Math.min(100, Math.round((producao.value.totalPecas / meta.value.meta_diaria) * 100));
});

/* ================= NOME / STATUS GERAL ================= */
const nomeEstabelecimento = computed(() => {
  return producao.value?.estabelecimento?.nome || producao.value?.nomeEstabelecimento || "LinhaTex";
});

const statusGeralClasse = computed(() => faixaClasse(producao.value?.eficienciaMediaTurma ?? 0).replace("faixa-", ""));

/* ================= INDICADORES (KPIs) ================= */
const quantidadeOPs = computed(() => {
  if (!producao.value?.funcionarios) return 0;
  const ops = producao.value.funcionarios.map((f) => f.op_atual).filter(Boolean);
  return new Set(ops).size || producao.value?.quantidadeOPs || 0;
});

const kpis = computed(() => {
  if (!producao.value) return [];
  return [
    {
      label: "Produção Total",
      icon: "📦",
      value: producao.value.totalPecas ?? 0,
      colorClass: "",
    },
    {
      label: "Meta do Dia",
      icon: "🎯",
      value: meta.value ? meta.value.meta_diaria : "—",
      colorClass: "",
    },
    {
      label: "% da Meta",
      icon: "📈",
      value: `${porcentagemMeta.value}%`,
      colorClass: faixaClasse(porcentagemMeta.value),
    },
    {
      label: "Eficiência Média",
      icon: "⚙️",
      value: producao.value.eficienciaMediaTurma ?? "—",
      colorClass: faixaClasse(producao.value.eficienciaMediaTurma ?? 0),
    },
    {
      label: "Funcionários Produzindo",
      icon: "👥",
      value: producao.value.quantidadePessoas ?? rankingOrdenado.value.length,
      colorClass: "",
    },
    {
      label: "OPs em Produção",
      icon: "🧵",
      value: quantidadeOPs.value,
      colorClass: "",
    },
  ];
});

/* ================= API (lógica reaproveitada da tela anterior) ================= */
async function carregarDados() {
  try {
    carregando.value = true;
    semDados.value = false;

    const token = useAuthStore().pegar_token;

    const response = await api.get("/producao/equipe", {
      headers: { Authorization: token },
      params: { filtro: new Date().toISOString().split("T")[0] },
    });

    const dados = response.data?.producao?.producaoDia;

    if (!dados || !dados.funcionarios?.length) {
      semDados.value = true;
      producao.value = null;
    } else {
      producao.value = dados;
      ultimaAtualizacao.value = new Date();
    }
  } finally {
    carregando.value = false;
  }
}

async function carregarMeta() {
  const token = useAuthStore().pegar_token;
  const res = await api.get("/meta-diaria", {
    headers: { Authorization: token },
  });
  meta.value = res.data?.metaDiaria || null;
}

/* ================= LIFECYCLE ================= */
onMounted(() => {
  carregarDados();
  carregarMeta();

  intervaloRelogio = setInterval(() => {
    agora.value = new Date();
  }, 1000);

  intervaloModo = setInterval(proximoModo, DURACAO_MODO_MS);

  const cnpj = useAuthStore().pegar_usuario?.cnpj;

  socket.on("connect", () => (socketConectado.value = true));
  socket.on("disconnect", () => (socketConectado.value = false));

  socket.on(`nova_atualizacao_${cnpj}`, () => {
    carregarDados();
    carregarMeta();
  });
});

onUnmounted(() => {
  clearInterval(intervaloRelogio);
  clearInterval(intervaloModo);
  socket.off("connect");
  socket.off("disconnect");
  socket.disconnect();
});
</script>

<style scoped>
/* ======================================================================
   TOKENS — identidade LinhaTex + linguagem de painel industrial (andon)
   ====================================================================== */
.tv-container {
  --bg: #070d0a;
  --surface: #0e1b15;
  --surface-elevated: #142821;
  --border: #1f3d31;

  --brand-deep: #0d3927;
  --brand-green: #22c55e;
  --gold: #eab308;
  --silver: #9fb3ac;
  --bronze: #c2793d;

  --text-primary: #f4f7f5;
  --text-muted: #8ba396;

  --status-alta: #22c55e;
  --status-media: #eab308;
  --status-baixa: #ef4444;

  --badge-referencia: #38bdf8;
  --badge-ficha: #94a3b8;

  --font-display: "Rajdhani", "Arial Narrow", sans-serif;
  --font-body: "Inter", Arial, sans-serif;
  --font-mono: "JetBrains Mono", "Courier New", monospace;

  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at top left, #0c1712 0%, var(--bg) 55%);
  color: var(--text-primary);
  font-family: var(--font-body);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap");

/* ======================================================================
   ANDON BAR — sinaleiro de status geral, no topo da tela
   ====================================================================== */
.andon-bar {
  height: 6px;
  width: 100%;
  flex-shrink: 0;
  transition: background 0.6s ease;
}
.andon-alta { background: linear-gradient(90deg, var(--status-alta), #16a34a); }
.andon-media { background: linear-gradient(90deg, var(--status-media), #ca8a04); }
.andon-baixa { background: linear-gradient(90deg, var(--status-baixa), #b91c1c); animation: andon-pulso 1.4s infinite; }

@keyframes andon-pulso {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ======================================================================
   ESTADOS (carregando / vazio)
   ====================================================================== */
.estado-tela {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  text-align: center;
  background: var(--bg);
}
.estado-tela h1 { font-family: var(--font-display); font-size: 2.4rem; font-weight: 600; }
.estado-tela p { color: var(--text-muted); font-size: 1.2rem; }
.estado-logo { height: 90px; opacity: 0.9; }
.estado-logo.grande { height: 220px; }

/* ======================================================================
   CABEÇALHO
   ====================================================================== */
.tv-header {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 22px 40px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.header-brand { display: flex; align-items: center; gap: 16px; }
.brand-logo { height: 56px; }
.brand-text { display: flex; flex-direction: column; }
.brand-title { font-family: var(--font-display); font-size: 1.6rem; font-weight: 700; letter-spacing: 0.02em; }
.brand-sub { font-size: 0.95rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }

.header-center { display: flex; flex-direction: column; align-items: center; }
.clock { font-family: var(--font-mono); font-size: 2.6rem; font-weight: 700; line-height: 1; letter-spacing: 0.03em; }
.date { font-size: 1rem; color: var(--text-muted); text-transform: capitalize; margin-top: 4px; }

.header-status { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.status-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 600;
}
.chip-on { background: rgba(34, 197, 94, 0.12); color: var(--status-alta); border: 1px solid rgba(34,197,94,0.35); }
.chip-off { background: rgba(239, 68, 68, 0.12); color: var(--status-baixa); border: 1px solid rgba(239,68,68,0.35); }
.pulse-dot {
  width: 9px; height: 9px; border-radius: 50%; background: currentColor;
  box-shadow: 0 0 0 rgba(34,197,94,0.5);
  animation: pulse-dot 1.8s infinite;
}
@keyframes pulse-dot {
  0% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
  70% { box-shadow: 0 0 0 8px transparent; opacity: 0.6; }
  100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
}
.last-update { font-size: 0.85rem; color: var(--text-muted); font-family: var(--font-mono); }

/* ======================================================================
   KPIs
   ====================================================================== */
.kpi-grid {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  padding: 20px 40px;
}
.kpi-card {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.25);
}
.kpi-icon { font-size: 1.3rem; opacity: 0.85; }
.kpi-value { font-family: var(--font-display); font-size: 2.1rem; font-weight: 700; color: var(--text-primary); }
.kpi-value.faixa-alta { color: var(--status-alta); }
.kpi-value.faixa-media { color: var(--status-media); }
.kpi-value.faixa-baixa { color: var(--status-baixa); }
.kpi-label { font-size: 0.85rem; color: var(--text-muted); text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }

/* ======================================================================
   PALCO PRINCIPAL
   ====================================================================== */
.stage { flex: 1; padding: 0 40px 10px; overflow: hidden; display: flex; }
.stage-panel { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.panel-header { display: flex; align-items: baseline; gap: 14px; margin-bottom: 14px; }
.panel-header h2 { font-family: var(--font-display); font-size: 1.7rem; font-weight: 700; }
.panel-sub { color: var(--text-muted); font-size: 1rem; }

/* transição entre modos */
.stage-fade-enter-active, .stage-fade-leave-active { transition: opacity 0.5s ease, transform 0.5s ease; }
.stage-fade-enter-from { opacity: 0; transform: translateY(14px); }
.stage-fade-leave-to { opacity: 0; transform: translateY(-14px); }

/* ---------- RANKING ---------- */
.ranking-list { flex: 1; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
.ranking-row {
  display: grid;
  grid-template-columns: 56px 64px 1fr 130px 120px 190px;
  align-items: center;
  gap: 18px;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-left: 5px solid var(--border);
  border-radius: 14px;
  padding: 12px 20px;
}
.ranking-row.faixa-alta { border-left-color: var(--status-alta); }
.ranking-row.faixa-media { border-left-color: var(--status-media); }
.ranking-row.faixa-baixa { border-left-color: var(--status-baixa); }

.rk-pos { font-family: var(--font-mono); font-size: 1.4rem; font-weight: 700; color: var(--text-muted); text-align: center; }
.rk-avatar { width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); }
.rk-info { display: flex; flex-direction: column; min-width: 0; }
.rk-nome { font-size: 1.15rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rk-etapa { font-size: 0.85rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.rk-producao { display: flex; flex-direction: column; align-items: center; }
.rk-producao-valor { font-family: var(--font-mono); font-size: 1.3rem; font-weight: 700; }
.rk-producao-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }

.rk-eficiencia { font-family: var(--font-mono); font-size: 1.6rem; font-weight: 700; text-align: center; }
.rk-eficiencia.faixa-alta { color: var(--status-alta); }
.rk-eficiencia.faixa-media { color: var(--status-media); }
.rk-eficiencia.faixa-baixa { color: var(--status-baixa); }

.rk-tempo-badge {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 8px;
  text-align: center;
  white-space: nowrap;
}
.badge-referencia { background: rgba(56, 189, 248, 0.14); color: var(--badge-referencia); border: 1px solid rgba(56,189,248,0.35); }
.badge-ficha { background: rgba(148, 163, 184, 0.14); color: var(--badge-ficha); border: 1px solid rgba(148,163,184,0.35); }

/* ---------- PÓDIO ---------- */
.podio {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 40px;
  padding-bottom: 10px;
}
.podio-lugar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 260px;
}
.podio-medalha { font-size: 2.2rem; }
.podio-avatar { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid var(--border); }
.avatar-grande { width: 130px; height: 130px; border: 4px solid var(--gold); }
.podio-nome { font-size: 1.25rem; font-weight: 700; text-align: center; }
.podio-eficiencia { font-family: var(--font-mono); font-size: 1.8rem; font-weight: 700; }
.podio-producao { font-size: 0.95rem; color: var(--text-muted); }

.podio-base {
  width: 100%;
  border-radius: 12px 12px 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10px;
  font-family: var(--font-display);
  font-weight: 700;
  color: rgba(0,0,0,0.55);
}
.base-1 { height: 150px; background: linear-gradient(180deg, var(--gold), #b8860b); font-size: 3rem; }
.base-2 { height: 105px; background: linear-gradient(180deg, var(--silver), #6b7f78); font-size: 2.4rem; }
.base-3 { height: 75px; background: linear-gradient(180deg, var(--bronze), #8a4f24); font-size: 2.2rem; color: rgba(255,255,255,0.75); }

.lugar-1 { order: 2; }
.lugar-2 { order: 1; }
.lugar-3 { order: 3; }

/* ---------- TABELA ---------- */
.tabela-wrap { flex: 1; overflow-y: auto; border-radius: 14px; border: 1px solid var(--border); }
.tabela-completa { width: 100%; border-collapse: collapse; font-size: 1rem; }
.tabela-completa thead th {
  position: sticky; top: 0;
  background: var(--surface-elevated);
  text-align: left;
  padding: 14px 18px;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}
.tabela-completa tbody tr { border-left: 4px solid transparent; }
.tabela-completa tbody tr.faixa-alta { border-left-color: var(--status-alta); }
.tabela-completa tbody tr.faixa-media { border-left-color: var(--status-media); }
.tabela-completa tbody tr.faixa-baixa { border-left-color: var(--status-baixa); }
.tabela-completa td { padding: 12px 18px; border-bottom: 1px solid var(--border); }
.funcionario-cell { display: flex; align-items: center; gap: 12px; }
.avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; }
.col-eficiencia { font-family: var(--font-mono); font-weight: 700; font-size: 1.15rem; }
.col-eficiencia.faixa-alta { color: var(--status-alta); }
.col-eficiencia.faixa-media { color: var(--status-media); }
.col-eficiencia.faixa-baixa { color: var(--status-baixa); }

/* ---------- INDICADORES GRANDES ---------- */
.indicadores-grande-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 22px;
}
.indicador-grande {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.ind-icon { font-size: 2rem; }
.ind-value { font-family: var(--font-display); font-size: 3.4rem; font-weight: 700; }
.ind-value.faixa-alta { color: var(--status-alta); }
.ind-value.faixa-media { color: var(--status-media); }
.ind-value.faixa-baixa { color: var(--status-baixa); }
.ind-label { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.9rem; }

.indicador-meta { padding: 0 30px; }
.progresso-container-grande { width: 100%; height: 22px; background: rgba(255,255,255,0.08); border-radius: 11px; overflow: hidden; margin: 10px 0; }
.progresso-bar-grande { height: 100%; background: linear-gradient(90deg, var(--brand-green), var(--status-alta)); transition: width 0.6s ease; }
.ind-value-media { font-size: 2.2rem; }

/* ======================================================================
   RODAPÉ — indicador de modo ativo
   ====================================================================== */
.mode-dots { flex-shrink: 0; display: flex; justify-content: center; gap: 10px; padding: 12px 0 18px; }
.dot { width: 9px; height: 9px; border-radius: 50%; background: var(--border); transition: all 0.4s ease; }
.dot.active { background: var(--brand-green); width: 28px; border-radius: 5px; }
</style>