<template>
  <div class="d-flex flex-column flex-xl-row">
    <Sidebar />
    <main class="content-wrapper flex-grow-1">
      <carregandoTela v-if="loading" />
      <div v-else class="peca-page">
<!-- 
        <div class="page-header">
          <div class="header-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            Cadastrar nova peça
          </div>
        </div> -->

        <!-- Stepper -->
        <div class="stepper-card">
          <div
            v-for="(s, i) in steps"
            :key="i"
            class="step-item"
            :class="{ active: etapa === i + 1, done: etapa > i + 1 }"
          >
            <div class="step-num">
              <svg v-if="etapa > i + 1" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              <span v-else>{{ i + 1 }}</span>
            </div>
            <div class="step-info">
              <span class="step-label">{{ s.label }}</span>
              <span class="step-sublabel">{{ s.sub }}</span>
            </div>
            <div v-if="i < steps.length - 1" class="step-divider"></div>
          </div>
        </div>

        <!-- ───────── ETAPA 1 ───────── -->
        <transition name="slide-fade">
          <div v-if="etapa === 1" class="form-card" key="etapa1">
            <div class="card-header-row">
              <div class="card-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div>
                <h2 class="card-title">Informações Básicas</h2>
                <p class="card-subtitle">Dados gerais da peça a ser cadastrada</p>
              </div>
              <button class="planilha-btn" @click="cadastrarPecaPorPlanilha">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                Cadastrar por planilha
              </button>
            </div>

            <div class="form-grid">
              <div class="field full">
                <label>Descrição da peça</label>
                <div class="input-wrap">
                  <svg class="input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                  <input v-model="novaPeca.descricao" type="text" placeholder="Ex: Peça de corte modelo A3" required />
                </div>
              </div>

              <div class="field">
                <label>Quantidade</label>
                <div class="input-wrap">
                  <svg class="input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  <input v-model="novaPeca.quantidade_pecas" type="number" placeholder="Ex: 50" min="0" required />
                </div>
              </div>

              <div class="field">
                <label>Valor da peça (R$)</label>
                <div class="input-wrap">
                  <svg class="input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  <input v-model="novaPeca.valor_peca" type="number" placeholder="4,00" min="0" step="0.01" required />
                </div>
              </div>

              <div class="field">
                <label>Data de entrega</label>
                <div class="input-wrap">
                  <svg class="input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <input v-model="novaPeca.data_entrega" type="date" required />
                </div>
              </div>

              <div class="field">
                <label>Pedido por</label>
                <div class="input-wrap">
                  <svg class="input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input v-model="novaPeca.pedido_por" type="text" placeholder="Ex: Guararapes" />
                </div>
              </div>

              <div class="field">
                <label>Tempo padrão (min)</label>
                <div class="input-wrap">
                  <svg class="input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <input v-model="novaPeca.tempo_padrao" type="number" placeholder="Ex: 5" min="0" />
                </div>
              </div>
            </div>

            <div class="actions-row">
              <div></div>
              <button class="btn-next" @click="proximaEtapa">
                Próximo
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </div>
        </transition>

        <!-- ───────── ETAPA 2 ───────── -->
        <transition name="slide-fade">
          <div v-if="etapa === 2" class="form-card" key="etapa2">
            <div class="card-header-row">
              <div class="card-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M4.93 4.93l1.41 1.41M18.66 18.66l1.41 1.41M2 12h2M20 12h2M12 2v2M12 20v2"/></svg>
              </div>
              <div>
                <h2 class="card-title">Processo de Produção</h2>
                <p class="card-subtitle">Selecione e organize as etapas da linha de produção</p>
              </div>
            </div>

            <p class="section-hint">Clique nas etapas abaixo para adicioná-las à linha de produção</p>
            <div class="chips-grid">
              <div
                v-for="etapaItem in locaisPredefinidos"
                :key="etapaItem.id"
                class="etapa-chip"
                :class="{ 'chip-added': novaPeca.producao.includes(etapaItem.descricao) }"
                draggable="true"
                @dragstart="onDragStart(etapaItem.descricao)"
                @click="adicionarEtapa(etapaItem.descricao)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {{ etapaItem.descricao }}
              </div>
            </div>

            <div
              class="pipeline-area"
              @dragover.prevent
              @drop="onDrop($event)"
            >
              <div class="pipeline-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                Linha de produção
              </div>

              <div class="pipeline-flow" v-if="novaPeca.producao.length > 0">
                <template v-for="(local, index) in novaPeca.producao" :key="index">
                  <div
                    class="pipeline-node"
                    draggable="true"
                    @dragstart="onDragStart(local, index)"
                    @dragover.prevent
                    @dragenter="dragEnter(index)"
                  >
                    <span>{{ local }}</span>
                    <button class="remove-node" @click.stop="removerLocal(index)">✕</button>
                  </div>
                  <span v-if="index < novaPeca.producao.length - 1" class="arrow-sep">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </span>
                </template>
              </div>
              <p v-else class="pipeline-empty">Adicione etapas acima para montar a linha de produção</p>
            </div>

            <GraficoTempoPadrao
              :tempoPeca="novaPeca.tempo_padrao"
              :etapasSelecionadas="novaPeca.producao"
              :etapasDefinidas="locaisPredefinidos"
            />

            <div class="actions-row">
              <button class="btn-back" @click="etapa--">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Voltar
              </button>
              <button class="btn-next" @click="proximaEtapa">
                Próximo
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </div>
        </transition>

        <!-- ───────── ETAPA 3 ───────── -->
        <transition name="slide-fade">
          <div v-if="etapa === 3" class="form-card" key="etapa3">
            <div class="card-header-row">
              <div class="card-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h2 class="card-title">Revisão e Cadastro</h2>
                <p class="card-subtitle">Confirme os dados antes de cadastrar a peça</p>
              </div>
            </div>

            <!-- Grid de informações -->
            <div class="review-grid">
              <div
                v-for="(info, index) in reviewItems"
                :key="index"
                class="review-item"
                :class="{ 'review-full': info.full }"
              >
                <div class="review-icon-wrap">
                  <component :is="'span'" v-html="info.icon"></component>
                </div>
                <div class="review-content">
                  <span class="review-label">{{ info.label }}</span>
                  <span class="review-value" :class="{ 'review-processo': info.full }">
                    {{ info.value || '—' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Profissionais indicados -->
            <div class="prof-section">
              <div class="prof-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                Profissionais indicados por etapa
              </div>

              <div v-if="novaPeca.producao.length === 0" class="prof-empty">
                Nenhuma etapa de produção selecionada
              </div>
              <div v-else class="prof-list">
                <div
                  v-for="etapaNome in novaPeca.producao"
                  :key="etapaNome"
                  class="prof-row"
                >
                  <div class="prof-avatar">
                    {{ getInitials(getMelhorFuncionario(etapaNome)?.nome) }}
                  </div>
                  <div class="prof-info">
                    <span class="prof-name" v-if="getMelhorFuncionario(etapaNome)">
                      {{ getMelhorFuncionario(etapaNome).nome }}
                    </span>
                    <span class="prof-name vazio" v-else>Nenhum profissional indicado</span>
                    <span class="prof-role">{{ etapaNome }}</span>
                  </div>
                  <span class="prof-badge" v-if="getMelhorFuncionario(etapaNome)">
                    {{ getMelhorFuncionario(etapaNome).eficiencia }}% eficiência
                  </span>
                </div>
              </div>
            </div>

            <div class="actions-row">
              <button class="btn-back" @click="etapa--">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Voltar
              </button>
              <button class="btn-success" @click="adicionarPeca">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Cadastrar Peça
              </button>
            </div>
          </div>
        </transition>

      </div>
    </main>
  </div>
</template>

<script>
import Sidebar from "@/components/Sidebar.vue";
//import TituloSubtitulo from "@/components/TituloSubtitulo.vue";
import router from "@/router";
import { useAuthStore } from "@/store/store";
import Swal from "sweetalert2";
import api from "@/Axios";
import carregandoTela from "@/components/carregandoTela.vue";
import GraficoTempoPadrao from "@/components/GraficoTempoPadrao.vue";

export default {
  name: "CadastrarPeca",
  components: { Sidebar, carregandoTela, GraficoTempoPadrao },

  setup() {
    const store = useAuthStore();
    return { store };
  },

  data() {
    return {
      etapa: 1,
      steps: [
        { label: "Informações Básicas", sub: "Dados gerais" },
        { label: "Processo de Produção", sub: "Etapas e linha" },
        { label: "Revisão e Cadastro", sub: "Confirmar dados" },
      ],
      novaPeca: {
        descricao: "",
        quantidade_pecas: null,
        pedido_por: "",
        data_entrega: null,
        producao: [],
        valor_peca: null,
        tempo_padrao: null,
      },
      locaisPredefinidos: [],
      draggedItem: null,
      draggedIndex: null,
      targetIndex: null,
      novaEtapa: "",
      loading: false,
      insightIA: null,
    };
  },

  computed: {
    reviewItems() {
      const p = this.novaPeca;
      const fmtDate = (v) => {
        if (!v) return "";
        const [y, m, d] = v.split("T")[0].split("-");
        return `${d}/${m}/${y}`;
      };
      return [
        {
          icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
          label: "Descrição",
          value: p.descricao,
        },
        {
          icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
          label: "Quantidade",
          value: p.quantidade_pecas ? `${p.quantidade_pecas} unidades` : "",
        },
        {
          icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
          label: "Pedido por",
          value: p.pedido_por,
        },
        {
          icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
          label: "Tempo Padrão",
          value: p.tempo_padrao ? `${p.tempo_padrao} min` : "",
        },
        {
          icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
          label: "Valor da Peça",
          value: p.valor_peca ? `R$ ${parseFloat(p.valor_peca).toFixed(2)}` : "",
        },
        {
          icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
          label: "Data de Entrega",
          value: fmtDate(p.data_entrega),
        },
        {
          icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M4.93 4.93l1.41 1.41M18.66 18.66l1.41 1.41"/></svg>`,
          label: "Processo de Produção",
          value: p.producao.length ? p.producao.join(" → ") : "",
          full: true,
        },
      ];
    },
  },

  methods: {
    verificarAutenticacao() {
      const token = this.store.pegar_token;
      const usuario = this.store.pegar_usuario;
      if (!token || !usuario) router.push("/");
    },

    resetForm() {
      this.etapa = 1;
      this.novaPeca = {
        descricao: "",
        quantidade_pecas: null,
        pedido_por: "",
        data_entrega: null,
        producao: [],
        valor_peca: null,
        tempo_padrao: null,
      };
      this.novaEtapa = "";
    },

    proximaEtapa() {
      this.etapa++;
    },

    getInitials(nome) {
      if (!nome) return "?";
      return nome
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    },

    getMelhorFuncionario(etapaNome) {
      if (!this.insightIA?.melhores_por_etapa) return null;
      const indicado = this.insightIA.melhores_por_etapa[etapaNome];
      if (!indicado) return null;
      return {
        nome: indicado.profissional,
        eficiencia: indicado.eficienciaMedia,
        foto: this.getFotoProfissional(indicado.profissional),
      };
    },

    getFotoProfissional(nome) {
      const funcionario = this.store.funcionarios?.find((f) => f.nome === nome);
      return funcionario?.foto || "/avatar.png";
    },

    async cadastrarPecaPorPlanilha() {
      const { value: file } = await Swal.fire({
        title: "Upload de Planilha",
        text: "Selecione um arquivo Excel (.xlsx) para cadastrar a peça.",
        input: "file",
        inputAttributes: { accept: ".xlsx", "aria-label": "Selecione um arquivo Excel" },
        showCancelButton: true,
        confirmButtonText: "Enviar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#1e8a52",
      });

      if (file) {
        const formData = new FormData();
        formData.append("arquivo", file);

        try {
          Swal.fire({
            title: "Enviando planilha...",
            text: "Por favor, aguarde",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading(),
          });

          const token = this.store.pegar_token;
          const response = await api.post("/pecas/upload", formData, {
            headers: { Authorization: `${token}`, "Content-Type": "multipart/form-data" },
          });

          console.log("Resposta do upload:", response.data);
          Swal.close();
          Swal.fire({ icon: "success", title: "Sucesso!", text: "Peça cadastrada com sucesso!", confirmButtonColor: "#1e8a52" });
          router.push("/dashboard");
        } catch (error) {
          Swal.close();
          Swal.fire({ icon: "error", title: "Erro", text: "Não foi possível cadastrar pelo arquivo.", confirmButtonColor: "#1e8a52" });
        }
      }
    },

    async getEtpas() {
      const token = this.store.pegar_token;
      const etapas = await api.get("/etapas/estabelecimento", {
        headers: { Authorization: `${token}` },
      });
      this.locaisPredefinidos = etapas.data.etapa;
    },

    async buscarIndicacoesIA() {
      try {
        const token = this.store.pegar_token;
        const response = await api.get("/indicar-profissionais", {
          timeout: 60000,
          headers: { Authorization: token },
        });
        if (response.data?.insight) this.insightIA = response.data.insight;
      } catch (error) {
        console.error("Erro ao buscar indicações da IA:", error);
      }
    },

    async adicionarPeca() {
      if (!this.novaPeca.descricao) {
        Swal.fire({ icon: "warning", title: "Atenção", text: "Preencha ao menos a descrição da peça.", confirmButtonColor: "#1e8a52" });
        return;
      }

      try {
        this.loading = true;
        const token = this.store.pegar_token;
        const response = await api.post(
          "/adicionar/peca",
          {
            peca: {
              descricao: this.novaPeca.descricao,
              quantidade_pecas: this.novaPeca.quantidade_pecas,
              pedido_por: this.novaPeca.pedido_por,
              data_entrega: this.novaPeca.data_entrega,
              etapas: this.novaPeca.producao,
              tempo_padrao: this.novaPeca.tempo_padrao,
              valor_peca: this.novaPeca.valor_peca,
            },
          },
          { headers: { Authorization: `${token}` } }
        );

        if (response.status === 201) {
          Swal.fire({
            icon: "success",
            title: "Peça cadastrada!",
            text: "Sua peça foi adicionada com sucesso.",
            timer: 2200,
            timerProgressBar: true,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({ icon: "error", title: "Erro ao adicionar", text: "Tente novamente mais tarde.", confirmButtonColor: "#1e8a52" });
        }

        this.resetForm();
        this.loading = false;
        router.push("/dashboard");
      } catch (error) {
        this.resetForm();
        this.loading = false;
        Swal.fire({ icon: "error", title: "Erro", text: "Não foi possível cadastrar a peça. Tente novamente.", confirmButtonColor: "#1e8a52" });
      }
    },

    removerLocal(index) {
      this.novaPeca.producao.splice(index, 1);
    },

    onDragStart(local, index) {
      this.draggedItem = local;
      this.draggedIndex = index;
    },

    dragEnter(index) {
      this.targetIndex = index;
    },

    onDrop() {
      if (this.draggedItem !== null && this.targetIndex !== null) {
        this.novaPeca.producao.splice(this.draggedIndex, 1);
        this.novaPeca.producao.splice(this.targetIndex, 0, this.draggedItem);
      }
      this.draggedItem = null;
      this.draggedIndex = null;
      this.targetIndex = null;
    },

    adicionarEtapa(local) {
      if (!this.novaPeca.producao.includes(local)) {
        this.novaPeca.producao.push(local);
      }
    },
  },

  mounted() {
    this.verificarAutenticacao();
    this.getEtpas();
    this.buscarIndicacoesIA();
  },
};
</script>
<style scoped>

/* ── Layout ── */
.content-wrapper {
  padding-left: 220px;
  min-height: 100vh;
  width: 100%;
}

.peca-page {
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

/* ── Header ── */
.page-header {
  margin-bottom: 1.75rem;
}

.header-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #a8d8b8;
  color: #0a3d20;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 100px;
  margin-bottom: 10px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: #052e14;
  line-height: 1.2;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #2d6644;
  margin: 4px 0 0;
}

/* ── Stepper ── */
.stepper-card {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid rgba(10, 80, 40, 0.2);
  border-radius: 16px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  gap: 0;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.step-divider {
  flex: 1;
  height: 1px;
  background: rgba(10, 80, 40, 0.15);
  margin: 0 12px;
}

.step-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(10, 80, 40, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Syne", sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #4a7a5c;
  background: #fff;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.step-item.active .step-num {
  background: #0e6632;
  border-color: #0e6632;
  color: #fff;
  box-shadow: 0 4px 12px rgba(14, 102, 50, 0.35);
}

.step-item.done .step-num {
  background: #b8dfc8;
  border-color: #1a8a46;
  color: #0a3d20;
}

.step-info { min-width: 0; }

.step-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #4a7a5c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s;
}

.step-sublabel {
  display: block;
  font-size: 13px;
  color: #7aaa8c;
}

.step-item.active .step-label { color: #0a3d20; }
.step-item.done .step-label  { color: #0e6632; }

/* ── Form Card ── */
.form-card {
  background: #ffffff;
  border: 1px solid rgba(10, 80, 40, 0.15);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 16px rgba(10, 80, 40, 0.08);
}

.card-header-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 1.75rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid rgba(10, 80, 40, 0.12);
  flex-wrap: wrap;
}

.card-icon-wrap {
  width: 44px;
  height: 44px;
  background: #d0edda;
  border: 1px solid rgba(10, 80, 40, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0e6632;
  flex-shrink: 0;
}

.card-title {
  font-family: "Syne", sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: #052e14;
  margin: 0;
}

.card-subtitle {
  font-size: 12px;
  color: #4a7a5c;
  margin: 2px 0 0;
}

/* ── Planilha button ── */
.planilha-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  padding: 8px 16px;
  border: 1.5px dashed rgba(14, 102, 50, 0.5);
  background: transparent;
  border-radius: 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #0e6632;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  white-space: nowrap;
}

.planilha-btn:hover {
  background: #d0edda;
  border-color: #0e6632;
}

/* ── Form grid ── */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field { display: flex; flex-direction: column; gap: 6px; }
.field.full { grid-column: 1 / -1; }

label {
  font-size: 14px;
  display: flex;
  font-weight: 500;
  color: #2d6644;
  letter-spacing: 0.02em;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 13px;
  color: #1a8a46;
  pointer-events: none;
  flex-shrink: 0;
}

.input-wrap input {
  width: 100%;
  height: 46px;
  background: #eef6f1;
  border: 1.5px solid rgba(10, 80, 40, 0.2);
  border-radius: 10px;
  padding: 0 14px 0 40px;
  font-family: "DM Sans", sans-serif;
  font-size: 14px;
  color: #0f1f16;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.input-wrap input:focus {
  border-color: #1a8a46;
  box-shadow: 0 0 0 3px rgba(26, 138, 70, 0.14);
  background: #fff;
}

.input-wrap input::placeholder { color: #90bb9e; }

/* ── Etapa 2 chips ── */
.section-hint {
  font-size: 13px;
  color: #4a7a5c;
  margin-bottom: 0.75rem;
}

.chips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 1.25rem;
}

.etapa-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 15px;
  background: #d0edda;
  border: 1.5px dashed rgba(14, 102, 50, 0.55);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  color: #0a3d20;
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
}

.etapa-chip:hover {
  background: #b8dfc8;
  border-style: solid;
  border-color: #0e6632;
  transform: scale(1.04);
}

.etapa-chip.chip-added {
  background: #b8dfc8;
  border-style: solid;
  border-color: #1a8a46;
  color: #0a3d20;
  opacity: 0.6;
}

/* ── Pipeline ── */
.pipeline-area {
  background: linear-gradient(135deg, #d0edda 0%, #fff 100%);
  border: 1.5px dashed rgba(14, 102, 50, 0.35);
  border-radius: 14px;
  padding: 1.25rem;
  min-height: 88px;
  margin-bottom: 1rem;
}

.pipeline-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #2d6644;
  margin-bottom: 0.75rem;
}

.pipeline-flow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.pipeline-empty {
  font-size: 13px;
  color: #7aaa8c;
  font-style: italic;
  margin: 0;
}

.pipeline-node {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 8px 14px;
  background: #0e6632;
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: grab;
  animation: popIn 0.2s ease;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.82); }
  to   { opacity: 1; transform: scale(1); }
}

.remove-node {
  background: rgba(255, 255, 255, 0.18);
  border: none;
  color: #fff;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  transition: background 0.15s;
}

.remove-node:hover { background: rgba(255, 255, 255, 0.35); }

.arrow-sep {
  display: flex;
  align-items: center;
  color: #1a8a46;
}

/* ── Review grid ── */
.review-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.review-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #eef6f1;
  border-radius: 12px;
  border-left: 3px solid #1a8a46;
}

.review-item.review-full { grid-column: 1 / -1; }

.review-icon-wrap {
  color: #0e6632;
  flex-shrink: 0;
  margin-top: 1px;
}

.review-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.review-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #4a7a5c;
  font-weight: 500;
}

.review-value {
  font-size: 14px;
  font-weight: 500;
  color: #0f1f16;
  word-break: break-word;
}

.review-processo { color: #0e6632; }

/* ── Profissionais ── */
.prof-section {
  background: #eef6f1;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}

.prof-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #0a3d20;
  margin-bottom: 0.75rem;
}

.prof-empty {
  font-size: 13px;
  color: #7aaa8c;
  font-style: italic;
}

.prof-list { display: flex; flex-direction: column; gap: 8px; }

.prof-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 10px;
  padding: 10px 14px;
  border: 1px solid rgba(10, 80, 40, 0.12);
}

.prof-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #b8dfc8;
  border: 2px solid #1a8a46;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #0a3d20;
  flex-shrink: 0;
}

.prof-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
}

.prof-name { font-size: 14px; font-weight: 500; color: #0f1f16; }
.prof-name.vazio { color: #7aaa8c; font-style: italic; }
.prof-role { font-size: 12px; color: #4a7a5c; }

.prof-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 10px;
  background: #b8dfc8;
  color: #0a3d20;
  border-radius: 100px;
  white-space: nowrap;
}

/* ── Actions ── */
.actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.75rem;
  gap: 10px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1.5px solid rgba(14, 102, 50, 0.35);
  background: transparent;
  border-radius: 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #2d6644;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #d0edda;
  border-color: #0e6632;
}

.btn-next {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 26px;
  background: #0e6632;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(14, 102, 50, 0.32);
  transition: all 0.2s;
}

.btn-next:hover {
  background: #0a4d26;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(14, 102, 50, 0.38);
}

.btn-success {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 30px;
  background: #0e6632;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(14, 102, 50, 0.32);
  transition: all 0.2s;
}

.btn-success:hover {
  background: #0a4d26;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(14, 102, 50, 0.38);
}

/* ── Transition ── */
.slide-fade-enter-active { transition: all 0.3s ease; }
.slide-fade-leave-active { transition: all 0.2s ease; }
.slide-fade-enter-from   { opacity: 0; transform: translateX(20px); }
.slide-fade-leave-to     { opacity: 0; transform: translateX(-20px); }

/* ── Responsivo ── */
@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0;
  }

  .peca-page {
    padding: 1.25rem 1rem 2rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .field.full { grid-column: 1; }

  .review-grid {
    grid-template-columns: 1fr;
  }

  .review-item.review-full { grid-column: 1; }

  .stepper-card {
    padding: 0.75rem 1rem;
  }

  .step-label, .step-sublabel { display: none; }

  .card-header-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .planilha-btn { margin-left: 0; }

  .form-card { padding: 1.25rem; }
}

@media (max-width: 480px) {
  .page-title { font-size: 22px; }
  .actions-row { flex-direction: column-reverse; }
  .btn-back, .btn-next, .btn-success { width: 100%; justify-content: center; }
}
</style>
