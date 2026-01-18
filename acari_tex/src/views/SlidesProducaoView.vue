<template>
  <div class="tv-container">

    <!-- 🔄 CARREGANDO -->
    <div v-if="carregando" class="estado">
      <img src="@/assets/Logofundo.png" class="logo" />
      <h1>Carregando produção...</h1>
    </div>

    <!-- ⚠️ SEM DADOS -->
    <div v-else-if="semDados" class="estado vazio">
      <img src="@/assets/Logofundo.png" class="logo" style="width: 400px; height: 400px;" />
      <h1>Nenhuma produção registrada</h1>
      <p>Aguardando início da produção</p>
    </div>

    <!-- ✅ COM DADOS -->
    <template v-else>

      <!-- ESQUERDA -->
      <section class="left">
        <div class="header">
            <img src="@/assets/Logofundo.png" style="width: 200px; height: 200px; display: flex;"/>

            <h1>{{ producao.descricaoPeca }}</h1>
        </div>
        <div class="metric">
          <span class="value">{{ producao.totalPecas }}</span>
          <span class="label">Peças Produzidas</span>
        </div>

        <div class="metric">
          <span
            class="value"
            :class="corEficiencia(producao.eficienciaMediaTurma)"
          >
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

        <!-- 📋 TABELA -->
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
              <tr
                v-for="f in producao.funcionarios"
                :key="f.funcionario"
              >
                <td>{{ f.nome }}</td>
                <td :class="corEficiencia(f.eficiencia_pessoal)">
                  {{ f.eficiencia_pessoal }}
                </td>
                <td>{{ f.total_pecas }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 📊 GRÁFICO -->
        <div v-else>
          <h2>Gráfico de Eficiência</h2>
          <canvas ref="chartRef"></canvas>
        </div>

      </section>

    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { io } from "socket.io-client";
import { Chart } from "chart.js/auto";
import api from "@/Axios";
import { useAuthStore } from "@/store/store";

/* ================= SOCKET ================= */
const socket = io("https://acari-tex.onrender.com", {
  transports: ["websocket"],
});

/* ================= ESTADOS ================= */
const carregando = ref(true);
const semDados = ref(false);

const producao = ref(null);
const modo = ref("tabela"); // tabela | grafico
let intervaloModo = null;

/* ================= GRÁFICO ================= */
const chartRef = ref(null);
let chartInstance = null;

function toNumberPercent(valor) {
  return Number(String(valor).replace("%", "")) || 0;
}

function corEficiencia(valor) {
  const v = toNumberPercent(valor);
  if (v >= 80) return "verde-escuro";
  if (v >= 60) return "verde-claro";
  return "cinza";
}

function montarGrafico() {
  if (!chartRef.value || !producao.value) return;

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(chartRef.value, {
    type: "bar",
    data: {
      labels: producao.value.funcionarios.map(f => f.nome),
      datasets: [
        {
          label: "Eficiência (%)",
          data: producao.value.funcionarios.map(f =>
            toNumberPercent(f.eficiencia_pessoal)
          ),
          backgroundColor: "#266c44",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 120,
        },
      },
    },
  });
}

/* ================= API ================= */
async function carregarDados() {
  try {
    carregando.value = true;
    semDados.value = false;

    const store = useAuthStore();
    const token = store.pegar_token;

    const response = await api.get("/producao/equipe", {
      headers: { Authorization: token },
      params: { filtro: "hoje" },
    });

    const dados = response.data?.producao?.producaoDia;

    if (!dados || !dados.funcionarios?.length) {
      producao.value = null;
      semDados.value = true;
    } else {
      producao.value = dados;
    }
  } catch (err) {
    console.error("Erro ao carregar produção:", err);
    producao.value = null;
    semDados.value = true;
  } finally {
    carregando.value = false;
  }
}

/* ================= WATCHERS ================= */
watch(modo, (novo) => {
  if (novo === "grafico") {
    setTimeout(montarGrafico, 200);
  }
});

/* ================= LIFECYCLE ================= */
onMounted(() => {
  carregarDados();

  // 🔁 alterna TABELA ↔ GRÁFICO a cada 5 minutos
  intervaloModo = setInterval(() => {
    modo.value = modo.value === "tabela" ? "grafico" : "tabela";
  }, 5 * 60 * 1000);

  const store = useAuthStore();
  const cnpj = store.pegar_usuario?.cnpj || "desconhecido";
  socket.on(`nova_atualizacao_${cnpj}`, carregarDados);
});

onUnmounted(() => {
  if (intervaloModo) {
    clearInterval(intervaloModo);
  }
});
</script>

<style scoped>
:root {
  --verde-escuro: #0d3927;
  --verde-claro: #266c44;
  --cinza: #dedede;
}

.header{
    display: flex;
    align-items: center;
    justify-content: center;
}
/* ================= GERAL ================= */
.tv-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  font-family: Arial, Helvetica, sans-serif;
}

/* ================= ESTADOS ================= */
.estado {
  width: 100vw;
  height: 100vh;
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
  font-size: 1.8rem;
  opacity: 0.9;
}

/* ================= ESQUERDA ================= */
.left {
  width: 50%;
  background: var(--verde-escuro);
  color: white;
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.logo {
  height: 70px;
}

.metric .value {
  font-size: 4.5rem;
  font-weight: bold;
}

.metric.small {
  font-size: 1.8rem;
}

/* ================= DIREITA ================= */
.right {
  width: 50%;
  background: white;
  padding: 40px;
}

h1 {
  font-size: 2.5rem;
}

h2 {
  font-size: 2.2rem;
  margin-bottom: 20px;
  color: var(--verde-escuro);
}

/* ================= TABELA ================= */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1.1rem;
}

th, td {
  padding: 14px;
  border-bottom: 1px solid #ccc;
  text-align: left;
}

/* ================= CORES ================= */
.verde-escuro {
  color: #0d3927;
}

.verde-claro {
  color: #266c44;
}

.cinza {
  color: #999;
}
</style>
