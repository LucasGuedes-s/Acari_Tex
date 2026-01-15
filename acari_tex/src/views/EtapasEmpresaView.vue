<template>
  <div class="etapas-page">
    <SidebarNav />
    <carregandoTela v-if="loading" />

    <main v-else class="content-wrapper flex-grow-1">
      <div class="container-fluid py-4">
        <TituloSubtitulo titulo="⚙️ Etapas" subtitulo="Gerencie as etapas de produção cadastradas" />
        <div
            class="d-flex flex-column flex-md-row justify-content-md-end align-items-stretch align-items-md-center gap-2 mb-3"
>
          <button class="btn btn-outline-success mb-4" @click="abrirModalGrupo">
            ➕ Novo Grupo
          </button>

          <button class="btn btn-success d-flex align-items-center gap-2 mb-4" @click="abrirModalNovaEtapa">
            <i class="bi bi-plus-circle"></i> Nova Etapa
          </button>
          <select v-model="filtroGrupo" class="form-select mb-4" style="max-width: 250px;">
            <option value="">📂 Todos os grupos</option>
            <option v-for="grupo in gruposDisponiveis" :key="grupo" :value="grupo">
              {{ grupo }}
            </option>
          </select>
        </div>
        <div v-if="etapas.length === 0" class="text-center text-muted py-3">
          Nenhuma etapa cadastrada ainda.
        </div>
        <div v-else class="row g-3">
          <div v-for="etapa in etapasFiltradasPorGrupo" :key="etapa.id_da_funcao" class="col-12 col-md-6">
            <div class="card shadow-sm border-0 h-100 etapa-card">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h5 class="fw-bold mb-1">{{ etapa.descricao }}</h5>
                    <p class="text-muted mb-0">
                      ⏱
                      {{
                        etapa.tempo_padrao
                          ? etapa.tempo_padrao + " min"
                          : "Sem tempo padrão"
                      }}
                    </p>

                    <span v-if="etapa.grupoEtapa" class="badge bg-light text-dark mt-1">
                      📦 {{ etapa.grupoEtapa.nome }}
                    </span>
                  </div>

                  <div class="d-flex gap-2 align-items-center">
                    <button class="btn-icon time" title="Tempo Padrão" @click="abrirModalEditar(etapa)">
                      <i class="bi bi-clock"></i>
                    </button>

                    <button class="btn-icon edit" title="Editar" @click="abrirModalEditar(etapa)">
                      <i class="bi bi-pencil"></i>
                    </button>

                    <button class="btn-icon delete" title="Excluir" @click="confirmarExclusao(etapa.id_da_funcao)">
                      <i class="bi bi-trash3"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal fade modal-nova-etapa" id="modalNovaEtapa" tabindex="-1" aria-labelledby="modalNovaEtapaLabel"
          aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0 rounded-4">
              <div class="modal-header bg-white border-0 pb-0">
                <div>
                  <h5 class="modal-title fw-bold fs-5 text-dark">
                    🆕 Nova Etapa
                  </h5>
                  <p class="text-muted mb-0 small">
                    Preencha os dados para cadastrar uma nova etapa
                  </p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
              </div>

              <div class="modal-body pt-3">
                <div class="mb-3">
                  <label class="form-label fw-semibold small">Descrição</label>
                  <input v-model="novaEtapa.descricao" type="text" class="form-control form-control-sm"
                    placeholder="Ex: Costura de bolso" />
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold small">Tempo Padrão (min)</label>
                  <input v-model.number="novaEtapa.tempo_padrao" type="number" class="form-control form-control-sm"
                    placeholder="Ex: 25" />
                </div>
              </div>

              <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn btn-light border me-2" data-bs-dismiss="modal">
                  Cancelar
                </button>
                <button type="button" class="btn btn-success" @click="salvarNovaEtapa">
                  Cadastrar Etapa
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal fade" id="modalEditarEtapa" tabindex="-1" aria-labelledby="modalEditarEtapaLabel"
          aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0 rounded-4">
              <div class="modal-header bg-white border-0 pb-0">
                <div>
                  <h5 class="modal-title fw-bold fs-4 text-dark">✏️ Editar Etapa</h5>
                  <p class="text-muted mb-0" style="font-size: 0.9rem">
                    Atualize os dados ou ajuste o tempo padrão
                  </p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
              </div>

              <div class="modal-body pt-3">
                <div class="mb-3">
                  <label class="form-label fw-semibold">Descrição</label>
                  <input v-model="etapaEdicao.descricao" type="text" class="form-control form-control-lg"
                    placeholder="Ex: Costura de bolso" />
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold">Tempo Padrão (min)</label>
                  <input v-model.number="etapaEdicao.tempo_padrao" type="number" class="form-control form-control-lg"
                    placeholder="Ex: 25" />
                </div>
              </div>

              <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn btn-outline-success d-flex align-items-center gap-2"
                  @click="abrirCronometro">
                  <i class="bi bi-stopwatch"></i> Cronometrar
                </button>
                <button type="button" class="btn btn-light border me-2" data-bs-dismiss="modal">
                  Cancelar
                </button>
                <button type="button" class="btn btn-success" @click="salvarEdicao">
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- MODAL CRONÔMETRO -->
        <div class="modal fade" id="modalCronometro" tabindex="-1" aria-labelledby="modalCronometroLabel"
          aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content rounded-4 shadow-lg border-0">
              <div class="modal-header bg-white border-0 pb-0">
                <h5 class="modal-title fw-bold fs-4 text-dark">⏱ Cronômetro</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"
                  @click="pararCronometro"></button>
              </div>
              <div class="modal-body text-center">
                <h1 class="display-4 fw-bold my-3 text-success">
                  {{ formatarTempo(tempo) }}
                </h1>
                <div class="d-flex justify-content-center gap-3">
                  <button class="btn btn-outline-success px-4" @click="iniciarCronometro" v-if="!rodando">
                    Iniciar
                  </button>
                  <button class="btn btn-outline-danger px-4" @click="pararCronometro" v-if="rodando">
                    Parar
                  </button>
                  <button class="btn btn-success px-4" @click="usarTempo" v-if="!rodando && tempo > 0">
                    Usar Tempo
                  </button>
                </div>
              </div>
              <div class="modal-footer border-0">
                <button type="button" class="btn btn-light border" data-bs-dismiss="modal" @click="pararCronometro">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal fade" id="modalGrupoEtapas" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content shadow-lg border-0 rounded-4">
            <div class="modal-header bg-white border-0 pb-0">
              <div>
                <h5 class="modal-title fw-bold fs-5">📦 Novo Grupo de Etapas</h5>
                <p class="text-muted small mb-0">
                  Agrupe etapas semelhantes
                </p>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div class="modal-body pt-3">
              <div class="mb-3">
                <label class="form-label fw-semibold small">Nome do Grupo</label>
                <input v-model="novoGrupo.nome" type="text" class="form-control form-control-sm"
                  placeholder="Ex: Pregar Bolso Relógio" />
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold small">Descrição</label>
                <textarea v-model="novoGrupo.descricao" class="form-control form-control-sm" rows="3"
                  placeholder="Descrição opcional"></textarea>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold small">
                Etapas deste grupo
              </label>
              <div class="border rounded-3 p-2" style="max-height: 200px; overflow-y: auto;">
                <div v-for="etapa in etapas" :key="etapa.id_da_funcao" class="form-check">
                  <input class="form-check-input" type="checkbox" :id="`etapa-${etapa.id_da_funcao}`"
                    :checked="novoGrupo.etapasSelecionadas.includes(etapa.id_da_funcao)"
                    @change="toggleEtapa(etapa.id_da_funcao)" />

                  <label class="form-check-label" :for="`etapa-${etapa.id_da_funcao}`">
                    {{ etapa.descricao }}
                  </label>
                </div>
              </div>

            </div>


            <div class="modal-footer border-0 pt-0">
              <button class="btn btn-light border" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button class="btn btn-success" @click="salvarGrupoEtapas">
                Criar Grupo
              </button>
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<script>
import SidebarNav from "@/components/Sidebar.vue";
import carregandoTela from "@/components/carregandoTela.vue";
import { useAuthStore } from "@/store/store";
import api from "@/Axios";
import Swal from "sweetalert2";
import { Modal } from "bootstrap";
import TituloSubtitulo from "@/components/TituloSubtitulo.vue";

export default {
  name: "EtapasView",
  components: { SidebarNav, carregandoTela, TituloSubtitulo },
  data() {
    return {
      grupos: [],
      novoGrupo: {
        nome: "",
        descricao: "",
        etapasSelecionadas: [],
      },
      modalGrupo: null,
      etapas: [],
      filtroGrupo: "",
      etapaEdicao: { id_da_funcao: null, descricao: "", tempo_padrao: null },
      novaEtapa: { descricao: "", tempo_padrao: null },
      modalNova: null,
      modalEditar: null,
      modalCronometro: null,
      tempo: 0,
      rodando: false,
      intervalo: null,
      loading: true,
    };
  },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  computed: {
    gruposDisponiveis() {
      const grupos = this.etapas
        .map(etapa => etapa.grupoEtapa?.nome)
        .filter(Boolean);

      return [...new Set(grupos)];
    },

    etapasFiltradasPorGrupo() {
      if (!this.filtroGrupo) return this.etapas;

      return this.etapas.filter(
        etapa => etapa.grupoEtapa?.nome === this.filtroGrupo
      );
    }
  },
  methods: {
    toggleEtapa(id) {
      if (!this.novoGrupo.etapasSelecionadas) {
        this.novoGrupo.etapasSelecionadas = [];
      }

      const index = this.novoGrupo.etapasSelecionadas.indexOf(id);

      if (index === -1) {
        this.novoGrupo.etapasSelecionadas.push(id);
      } else {
        this.novoGrupo.etapasSelecionadas.splice(index, 1);
      }
    },
    abrirModalGrupo() {
      const el = document.getElementById("modalGrupoEtapas");
      this.modalGrupo = new Modal(el);
      this.modalGrupo.show();
    },
    async salvarGrupoEtapas() {
      if (!this.novoGrupo.nome) {
        return Swal.fire("Aviso", "O nome do grupo é obrigatório.", "warning");
      }

      try {
        const token = this.store.pegar_token;

        await api.post(
          "/adicionar/etapa/grupo",
          this.novoGrupo,
          {
            headers: { Authorization: `${token}` },
          }
        );

        Swal.fire("Sucesso", "Grupo de etapas criado com sucesso!", "success");

        this.modalGrupo.hide();
        this.novoGrupo = { nome: "", descricao: "" };
        //this.buscarGrupos();
      } catch (error) {
        console.error("Erro ao criar grupo:", error);
        Swal.fire("Erro", "Não foi possível criar o grupo.", "error");
      }
    },
    async buscarEtapas() {
      try {
        const token = this.store.pegar_token;
        const { data } = await api.get("/etapas/estabelecimento", {
          headers: { Authorization: `${token}` },
        });
        this.etapas = data.etapa || [];
        console.log("Etapas carregadas:", this.etapas);
      } catch (error) {
        console.error("Erro ao buscar etapas:", error);
      } finally {
        this.loading = false;
      }
    },
    async buscarGrupos() {
      try {
        const token = this.store.pegar_token;
        const { data } = await api.get("/grupos/etapas", {
          headers: { Authorization: `${token}` },
        });
        this.grupos = data || [];
      } catch (error) {
        console.error("Erro ao buscar grupos:", error);
      }
    },
    abrirModalNovaEtapa() {
      if (!this.modalNova) {
        this.modalNova = new Modal(document.getElementById("modalNovaEtapa"));
      }
      this.novaEtapa = { descricao: "", tempo_padrao: null };
      this.modalNova.show();
    },
    async salvarNovaEtapa() {
      if (!this.novaEtapa.descricao) {
        return Swal.fire("Aviso", "A descrição é obrigatória.", "warning");
      }
      try {
        const token = this.store.pegar_token;
        await api.post("/adicionar/etapa", this.novaEtapa, {
          headers: { Authorization: `${token}` },
        });
        Swal.fire("Sucesso", "Etapa cadastrada com sucesso!", "success");
        this.modalNova.hide();
        this.buscarEtapas();
      } catch (error) {
        console.error("Erro ao cadastrar etapa:", error);
        Swal.fire("Erro", "Não foi possível cadastrar a etapa.", "error");
      }
    },
    abrirModalEditar(etapa) {
      this.etapaEdicao = { ...etapa };
      if (!this.modalEditar) {
        this.modalEditar = new Modal(document.getElementById("modalEditarEtapa"));
      }
      this.modalEditar.show();
    },
    async salvarEdicao() {
      try {
        const token = this.store.pegar_token;
        await api.put(
          `/etapas/${this.etapaEdicao.id_da_funcao}`,
          this.etapaEdicao,
          {
            headers: { Authorization: `${token}` },
          }
        );
        Swal.fire("Sucesso", "Etapa atualizada com sucesso!", "success");
        this.modalEditar.hide();
        this.buscarEtapas();
      } catch (error) {
        console.error("Erro ao salvar edição:", error);
        Swal.fire("Erro", "Não foi possível salvar a etapa.", "error");
      }
    },
    async confirmarExclusao(id) {
      const confirm = await Swal.fire({
        title: "Excluir Etapa?",
        text: "Esta ação não pode ser desfeita!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sim, excluir",
        cancelButtonText: "Cancelar",
      });
      if (confirm.isConfirmed) {
        try {
          const token = this.store.pegar_token;
          console.log("ID da etapa a ser excluída:", id);
          console.log("Token de autenticação:", token);
          const response = await api.delete(`/etapa/${id}`, {
            headers: { Authorization: `${token}` },
          });
          console.log("Resposta da exclusão:", response.data);
          Swal.fire("Excluída!", "A etapa foi removida com sucesso.", "success");
          this.buscarEtapas();
        } catch (error) {
          console.error("Erro ao excluir etapa:", error);
          Swal.fire("Erro", "Não foi possível excluir a etapa.", "error");
        }
      }
    },
    abrirCronometro() {
      if (!this.modalCronometro) {
        this.modalCronometro = new Modal(document.getElementById("modalCronometro"));
      }
      this.modalCronometro.show();
      this.tempo = 0;
      this.rodando = false;
      clearInterval(this.intervalo);
    },
    iniciarCronometro() {
      this.rodando = true;
      this.intervalo = setInterval(() => {
        this.tempo++;
      }, 1000);
    },
    pararCronometro() {
      this.rodando = false;
      clearInterval(this.intervalo);
    },
    usarTempo() {
      const minutos = Math.round(this.tempo / 60);
      this.etapaEdicao.tempo_padrao = minutos;
      this.modalCronometro.hide();
      Swal.fire(
        "Tempo adicionado!",
        `Tempo padrão definido como ${minutos} min.`,
        "success"
      );
    },
    formatarTempo(segundos) {
      const m = Math.floor(segundos / 60);
      const s = segundos % 60;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    },
  },
  mounted() {
    this.buscarEtapas();
    this
  },
};
</script>

<style scoped>
.etapa-card {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  border-radius: 16px;
  padding: 10px;
}

.etapa-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.card-body {
  padding: 1.25rem 1.5rem;
}

h5.fw-bold {
  font-size: 1.15rem;
  color: #222;
}

.text-muted {
  color: #6c757d !important;
}

.btn {
  background-color: var(--verde-escuro);
  color: white;
  border-radius: 10px;
  justify-self: right;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background-color: #f1f3f5;
  color: #495057;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  transform: scale(1.1);
}

.btn-icon.edit:hover {
  background-color: #e7f3ff;
  color: #0d6efd;
}

.btn-icon.delete:hover {
  background-color: #ffe8e8;
  color: #dc3545;
}

/* MODAIS */
.modal-content {
  border-radius: 18px;
  background-color: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.modal-header,
.modal-footer {
  border: none;
}

.form-control {
  border-radius: 10px;
  padding: 10px 14px;
  border: 1px solid #dcdcdc;
  transition: border-color 0.2s ease;
}

.form-control:focus {
  border-color: var(--verde-escuro);
  box-shadow: 0 0 0 0.2rem rgba(0, 128, 96, 0.1);
}

.btn-outline-success {
  border-radius: 10px;
  border: 1px solid var(--verde-escuro);
  transition: all 0.2s ease;
}

.btn-outline-success:hover {
  background-color: var(--verde-escuro);
  color: white;
}

.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
}

label {
  display: flex;
}

/* 🔹 Fonte menor para modal de nova etapa */
.modal-nova-etapa .modal-title {
  font-size: 1rem;
}

.modal-nova-etapa .form-control-sm {
  font-size: 0.9rem;
  padding: 8px 10px;
}

.modal-nova-etapa .form-label {
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .d-flex {
    flex-direction: column;
    height: auto;
  }

  .content-wrapper {
    padding-left: 0px;
    z-index: 0;
  }
}

</style>
