<template>
  <div class="page">
    <SidebarNav />

    <main class="content-wrapper">
      <div class="chat-wrapper">

        <!-- CHAT -->
        <section class="chat-container">

          <!-- ATALHOS -->
          <div class="quick-options">
            <button @click="setPeriodo(7)">Última semana</button>
            <button @click="setPeriodo(15)">Últimos 15 dias</button>
            <button @click="setPeriodo(30)">Último mês</button>
          </div>

          <!-- MENSAGENS -->
          <div class="chat-messages" ref="chatBox">
            <div
              v-for="(msg, index) in messages"
              :key="index"
              :class="['message', msg.type]"
            >
              <div
                class="bubble"
                v-html="msg.html ? msg.html : msg.text"
              ></div>

            </div>
          </div>

          <!-- INPUT -->
          <div class="chat-input">
            <input type="date" v-model="dataInicio" />
            <input type="date" v-model="dataFim" />
            <button @click="enviarAnalise" :disabled="loading">
              {{ loading ? "Analisando..." : "Enviar" }}
            </button>
          </div>
        </section>

        <!-- PAINEL DE DADOS -->
        <section v-if="dadosIA" class="painel">

          <h3>📊 Resumo da Análise</h3>

          <div class="cards">
            <div class="card">
              <span>Eficiência da Turma</span>
              <strong>{{ dadosIA.eficienciaTurma }}%</strong>
            </div>

            <div class="card">
              <span>Funcionários</span>
              <strong>{{ dadosIA.eficienciaIndividual.length }}</strong>
            </div>

            <div class="card">
              <span>Período</span>
              <strong>{{ dadosIA.periodo }}</strong>
            </div>
          </div>

          <h3>👷 Eficiência Individual</h3>

          <table class="tabela">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Eficiência</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(f, index) in dadosIA.eficienciaIndividual"
                :key="index"
              >
                <td>{{ f.funcionario }}</td>
                <td
                  :class="{
                    acima: f.eficienciaMedia >= dadosIA.eficienciaTurma,
                    abaixo: f.eficienciaMedia < dadosIA.eficienciaTurma
                  }"
                >
                  {{ f.eficienciaMedia }}%
                </td>
              </tr>
            </tbody>
          </table>

        </section>

      </div>
    </main>
  </div>
</template>

<script>
import axios from "@/Axios";
import SidebarNav from "@/components/Sidebar.vue";
import { useAuthStore } from "@/store/store";
import { marked } from "marked";

export default {
  name: "AnaliseProducao",
  components: { SidebarNav },

  data() {
    return {
      dataInicio: "",
      dataFim: "",
      loading: false,
      dadosIA: null,
      messages: [
        {
          type: "bot",
          text: "Olá! Informe o período ou escolha uma opção rápida para análise de produção."
        }
      ]
    };
  },

  methods: {
    renderMarkdown(text) {
      return marked.parse(text);
    },
    scrollChat() {
      this.$nextTick(() => {
        const box = this.$refs.chatBox;
        if (box) {
          box.scrollTop = box.scrollHeight;
        }
      });
    },
    setPeriodo(dias) {
      const hoje = new Date();
      const inicio = new Date();
      inicio.setDate(hoje.getDate() - dias);

      this.dataInicio = inicio.toISOString().split("T")[0];
      this.dataFim = hoje.toISOString().split("T")[0];

      this.enviarAnalise();
    },

    async enviarAnalise() {
      if (!this.dataInicio || !this.dataFim) return;

      this.messages.push({
        type: "user",
        text: `Analisar produção de ${this.dataInicio} até ${this.dataFim}`
      });

      this.messages.push({
        type: "bot",
        text: "⏳ Analisando dados produtivos..."
      });

      this.loading = true;

      try {
        const store = useAuthStore();

        const response = await axios.post(
          "/analise-producao",
          {
            dataInicio: this.dataInicio,
            dataFim: this.dataFim
          },
          {
            headers: {
              Authorization: store.pegar_token
            }
          }
        );
        console.log(response.data.dadosIA.insight); 
        // TEXTO DA IA NO CHAT
        if (response.data.dadosIA.insight) {
          this.messages.push({
            type: "bot",
            text: response.data.dadosIA.insight,
            html: this.renderMarkdown(response.data.dadosIA.insight)
          });
          this.scrollChat();

        } else {
          this.messages.push({
            type: "bot",
            text: "Análise concluída, porém sem observações textuais."
          });
        }


        // DADOS ESTRUTURADOS NO PAINEL
        this.dadosIA = response.data.dadosIA;

      } catch (error) {
        this.messages.push({
          type: "bot",
          text: "❌ Erro ao gerar análise. Tente novamente."
        });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
  .bubble h1,
.bubble h2,
.bubble h3 {
  margin-top: 12px;
  margin-bottom: 6px;
  font-weight: 700;
  color: #065f46;
}

.bubble p {
  margin: 6px 0;
}

.bubble ul {
  padding-left: 18px;
  margin: 8px 0;
}

.bubble li {
  margin-bottom: 6px;
}

.bubble strong {
  color: #064e3b;
}

.bubble em {
  color: #047857;
}

.page {
  display: flex;
  height: 100vh;
  background: #f8fafc;
}

.content-wrapper {
  flex-grow: 1;
  padding-left: 220px;
  margin-left: 200px;
  padding: 16px;
}

.chat-wrapper {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 16px;
  height: 100%;
}

/* CHAT */
.chat-container {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.05);
  overflow: hidden;
}

.quick-options {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #f0fdf4;
  border-bottom: 1px solid #dcfce7;
}

.quick-options button {
  background: #085023;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  cursor: pointer;
}

.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #f8fafc;
}

.message {
  display: flex;
  margin-bottom: 12px;
}

.message.user {
  justify-content: flex-end;
}

.bubble {
  max-width: 75%;
  padding: 12px 14px;
  border-radius: 16px;
  white-space: pre-wrap;
  font-size: 0.9rem;
  word-break: break-word;
  overflow-wrap: break-word;
}

.message.bot .bubble {
  background: #dcfce7;
  color: #065f46;
  border-top-left-radius: 4px;
}

.message.user .bubble {
  background: #0a622a;
  color: white;
  border-top-right-radius: 4px;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #e5e7eb;
}

.chat-input input {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.chat-input button {
  background: #065824;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
}

/* PAINEL */
.painel {
  background: white;
  border-radius: 12px;
  padding: 16px;
  overflow-y: auto;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.card {
  background: #f0fdf4;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.tabela {
  width: 100%;
  border-collapse: collapse;
}

.tabela th,
.tabela td {
  text-align: -webkit-left;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.acima {
  color: #16a34a;
  font-weight: bold;
}

.abaixo {
  color: #dc2626;
  font-weight: bold;
}
@media (max-width: 1024px) {
  .content-wrapper {
    padding-left: 0;
    margin-left: 0;
    padding: 0px;
  }

  .chat-wrapper {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .chat-container {
    height: 55vh;
  }

  .painel {
    height: auto;
    max-height: 45vh;
  }

  .cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ===== CELULAR (até 768px) ===== */
@media (max-width: 768px) {
  .page {
    flex-direction: column;
    height: auto;
  }

  .chat-wrapper {
    display: flex;
    flex-direction: column;
    height: auto;
  }

  /* CHAT */
  .chat-container {
    height: 70vh;
    border-radius: 0;
  }

  .chat-messages {
    padding: 12px;
  }

  .bubble {
    max-width: 90%;
    font-size: 0.85rem;
  }

  /* INPUT */
  .chat-input {
    flex-direction: column;
  }

  .chat-input input,
  .chat-input button {
    width: 100%;
  }

  /* ATALHOS */
  .quick-options {
    flex-wrap: wrap;
    justify-content: center;
  }

  .quick-options button {
    flex: 1;
    font-size: 0.75rem;
  }

  /* PAINEL */
  .painel {
    border-radius: 0;
    padding: 12px;
  }

  .cards {
    grid-template-columns: 1fr;
  }

  .card {
    font-size: 0.85rem;
  }

  /* TABELA */
  .tabela th,
  .tabela td {
    font-size: 0.8rem;
    padding: 6px;
  }
}

/* ===== CELULAR MUITO PEQUENO ===== */
@media (max-width: 480px) {
  .bubble {
    font-size: 0.8rem;
    padding: 10px;
  }

  .chat-container {
    height: 75vh;
  }

  .quick-options button {
    padding: 6px;
  }
}
</style>
