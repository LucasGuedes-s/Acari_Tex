<template>
  <div class="tv-container">

    <!-- 🔄 CARREGANDO -->
    <div v-if="carregando" class="estado">
      <img src="@/assets/Logofundo.png" class="logo" />
      <h1>Carregando produção...</h1>
    </div>

    <!-- ⚠️ SEM DADOS -->
    <div v-else-if="semDados" class="estado vazio">
      <img src="@/assets/Logofundo.png" class="logo grande" />
      <h1>Nenhuma produção registrada</h1>
    </div>

    <!-- ✅ COM DADOS -->
    <template v-else>
      <!-- ESQUERDA -->
      <section class="left">
        <div class="header">
          <img src="@/assets/Logofundo.png" class="logo-header"/>
          <h1>{{ producao.descricaoPeca }}</h1>
        </div>

        <div class="metric">
          <span class="value">{{ producao.totalPecas }}</span>
          <span class="label">Peças Produzidas</span>
        </div>

        <div class="metric" v-if="meta">
          <span class="value">
            {{ producao.totalPecas }} / {{ meta.meta_diaria }}
          </span>
          <span class="label">Meta do Dia</span>
        </div>

        <div v-if="meta" class="progresso-container">
          <div class="progresso-bar" :style="{ width: porcentagemMeta + '%' }"></div>
        </div>

        <div v-if="meta" class="progresso-label">
          {{ porcentagemMeta }}%
        </div>

        <div class="metric">
          <span class="value" :class="corEficiencia(producao.eficienciaMediaTurma)">
            {{ producao.eficienciaMediaTurma }}
          </span>
          <span class="label">Eficiência Média</span>
        </div>

        <div class="metric small">
          {{ producao.quantidadePessoas }} pessoas na produção
        </div>
      </section>

      <!-- DIREITA -->
      <section class="right">

        <!-- TABELA -->
        <div v-if="modo === 'tabela'">
          <h2>Eficiência Individual</h2>

          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Eficiência</th>
                <th>Peças</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in producao.funcionarios" :key="f.funcionario">
                
                <td class="funcionario-cell">
                  <img :src="f.foto || 'https://via.placeholder.com/40'" class="avatar" />
                  <span>{{ f.nome }}</span>
                </td>

                <td :class="corEficiencia(f.eficiencia_pessoal)">
                  {{ f.eficiencia_pessoal }}
                </td>

                <td>{{ f.total_pecas }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- RANKING TOP 3 -->
        <div v-else>
          <h2>Top 3 Eficiência</h2>

          <div class="ranking">
            <div 
              v-for="(f, index) in top3" 
              :key="f.funcionario"
              class="ranking-item"
            >
              <div class="posicao">#{{ index + 1 }}</div>

              <img :src="f.foto" class="ranking-avatar" />

              <div class="info">
                <span class="nome">{{ f.nome }}</span>
                <span class="eficiencia" :class="corEficiencia(f.eficiencia_pessoal)">
                  {{ f.eficiencia_pessoal }}
                </span>
              </div>
            </div>
          </div>
        </div>

      </section>
    </template>
  </div>
</template>
<script setup>
import { ref, onMounted, computed } from "vue";
import { io } from "socket.io-client";
import api from "@/Axios";
import { useAuthStore } from "@/store/store";

/* ================= SOCKET ================= */
const socket = io("https://acari-tex.onrender.com");

/* ================= ESTADOS ================= */
const carregando = ref(true);
const semDados = ref(false);

const producao = ref(null);
const meta = ref(null);
const modo = ref("tabela");

/* ================= HELPERS ================= */
function toNumberPercent(valor) {
  return Number(String(valor).replace("%", "")) || 0;
}

function corEficiencia(valor) {
  const v = toNumberPercent(valor);
  if (v >= 80) return "verde-escuro";
  if (v >= 60) return "verde-claro";
  return "cinza";
}

/* ================= META ================= */
const porcentagemMeta = computed(() => {
  if (!meta.value || !producao.value) return 0;
  return Math.min(100, Math.round(
    (producao.value.totalPecas / meta.value.meta_diaria) * 100
  ));
});

/* ================= TOP 3 ================= */
const top3 = computed(() => {
  if (!producao.value?.funcionarios) return [];

  return [...producao.value.funcionarios]
    .sort((a, b) =>
      toNumberPercent(b.eficiencia_pessoal) -
      toNumberPercent(a.eficiencia_pessoal)
    )
    .slice(0, 3);
});

/* ================= API ================= */
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

  setInterval(() => {
    modo.value = modo.value === "tabela" ? "ranking" : "tabela";
  }, 5 * 60 * 1000);

  const cnpj = useAuthStore().pegar_usuario?.cnpj;

  socket.on(`nova_atualizacao_${cnpj}`, () => {
    carregarDados();
    carregarMeta();
  });
});
</script>
<style scoped>

/* ================= CORES ================= */
:root {
  --verde-escuro: #0d3927;
  --verde-claro: #22c55e;
  --cinza: #999;
}

.tv-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  font-family: Arial;
}

/* ESQUERDA */
.left {
  width: 50%;
  background: #0d3927;
  color: white;
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* DIREITA */
.right {
  width: 50%;
  padding: 40px;
}

/* METRICAS */
.metric .value {
  font-size: 4rem;
  font-weight: bold;
}

.metric.small {
  font-size: 1.4rem;
}

/* PROGRESSO */
.progresso-container {
  width: 100%;
  height: 20px;
  background: #ffffff33;
  border-radius: 10px;
}

.progresso-bar {
  height: 100%;
  background: #22c55e;
}

/* TABELA */
.funcionario-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 35px;
  height: 35px;
  border-radius: 50%;
}

/* RANKING */
.ranking {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.posicao {
  font-size: 2rem;
  font-weight: bold;
}

.ranking-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
}


/* ================= ESTADOS ================= */
.estado {
  width: 100%;
  height: 100%;
  background: var(--verde-escuro);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  text-align: center;
}

.estado p {
  font-size: 1.5rem;
  opacity: 0.9;
}

.logo {
  height: 80px;
}

.logo.grande {
  width: 300px;
  height: 300px;
}

/* ================= ESQUERDA ================= */
.left {
  width: 50%;
  background: var(--verde-escuro);
  color: white;
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo-header {
  width: 100px;
  height: 100px;
}

/* ================= MÉTRICAS ================= */
.metric {
  display: flex;
  flex-direction: column;
}

.metric .value {
  font-size: 4rem;
  font-weight: bold;
}

.metric .label {
  font-size: 1.2rem;
  opacity: 0.8;
}

.metric.small {
  font-size: 1.5rem;
}

/* ================= PROGRESSO ================= */
.progresso-container {
  width: 100%;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  overflow: hidden;
}

.progresso-bar {
  height: 100%;
  background: var(--verde-claro);
  transition: width 0.5s ease;
}

.progresso-label {
  font-size: 1.3rem;
}

/* ================= DIREITA ================= */
.right {
  width: 50%;
  background: white;
  padding: 40px;
  overflow: hidden;
}

h1 {
  font-size: 2.2rem;
}

h2 {
  font-size: 1.8rem;
  margin-bottom: 20px;
  color: var(--verde-escuro);
}

/* ================= TABELA ================= */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1rem;
}

th, td {
  padding: 12px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

/* ================= CORES DINÂMICAS ================= */
.verde-escuro {
  color: #0d3927;
}

.verde-claro {
  color: #22c55e;
}

.cinza {
  color: #999;
}

</style>