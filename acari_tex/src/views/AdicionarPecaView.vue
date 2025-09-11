<template>
  <div class="d-flex flex-column flex-md-row">
    <Sidebar />
    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid">
        <div class="row justify-content-center mt-2">
          <div class="form col-12">
            <TituloSubtitulo titulo="Cadastro de Nova Peça" subtitulo="Preencha as informações abaixo" />

            <!-- Etapa 1 -->
            <div v-if="etapa === 1" class="section etapa1-section">
              <h3 class="section-title mb-4">1 - Informações Básicas</h3>

              <div class="row g-3">
                <div class="col-md-6">
                  <label for="descricao" class="form-label">Descrição da Peça</label>
                  <input v-model="novaPeca.descricao" id="descricao" type="text" class="form-control"
                    placeholder="Digite a descrição da peça" required />
                </div>

                <div class="col-md-6">
                  <label for="quantidade" class="form-label">Quantidade</label>
                  <input v-model="novaPeca.quantidade_pecas" id="quantidade" type="number" class="form-control"
                    placeholder="Ex: 50" required />
                </div>

                <div class="col-md-6">
                  <label for="data" class="form-label">Data de Entrega</label>
                  <input v-model="novaPeca.data_entrega" id="data" type="date" class="form-control" required />
                </div>

                <div class="col-md-6">
                  <label for="fornecedor" class="form-label">Pedido por</label>
                  <select v-model="novaPeca.pedido_por" id="fornecedor" class="form-select">
                    <option value="" disabled>Selecione o fornecedor</option>
                    <option v-for="fornecedor in fornecedoresRecentes" :key="fornecedor">{{ fornecedor }}</option>
                  </select>
                </div>
              </div>

              <div class="d-flex justify-content-end mt-4">
                <button @click="proximaEtapa" class="btn btn-success btn-lg">
                  Próximo <i class="bi bi-arrow-right"></i>
                </button>
              </div>
            </div>

            <!-- Etapa 2 -->
            <div v-if="etapa === 2" class="section animate-fade">
              <div class="nova-etapa mb-4 d-flex justify-content-between align-items-center">
                <h3 class="section-title">2 - Processo de Produção</h3>
                <section class="d-flex align-items-center gap-2">
                  <input v-model="novaEtapa" type="text" class="form-control etapa-input"
                    placeholder="Nome da nova etapa" @keyup.enter="adicionarNovaEtapa"
                    style="width: 220px; padding: 6px 10px; font-size: 0.9rem;" />
                  <button class="btn btn-success" style="width: 120px; padding: 6px 10px; font-size: 0.9rem;"
                    @click="adicionarNovaEtapa">Adicionar</button>
                </section>
              </div>

              <!-- Etapas disponíveis -->
              <div class="mb-4">
                <div class="etapas-disponiveis">
                  <div v-for="local in locaisPredefinidos" :key="local" class="etapa-card" draggable="true"
                    @dragstart="onDragStart(local)" @click="adicionarEtapa(local)">
                    {{ local }}
                  </div>
                </div>
              </div>

              <!-- Linha de produção -->
              <div class="linha-producao" @dragover.prevent @drop="onDrop($event)">
                <h5 class="drag-title">Linha de Produção</h5>
                <div class="pipeline">
                  <transition-group name="fade-list" tag="div" class="pipeline-inner">
                    <template v-for="(local, index) in novaPeca.producao" :key="index">
                      <div class="etapa-pipeline" draggable="true" @dragstart="onDragStart(local, index)"
                        @dragover.prevent @dragenter="dragEnter(index)">
                        <span class="etapa-nome">{{ local }}</span>
                        <a class="remove-btn" @click="removerLocal(index)">✕</a>
                      </div>
                      <span v-if="index < novaPeca.producao.length - 1" class="seta">➜</span>
                    </template>
                  </transition-group>
                </div>
              </div>

              <!-- Navegação -->
              <div class="d-flex gap-2 mt-3 justify-content-between">
                <button @click="etapa--" class="btn btn-secondary btn-block"
                  style="background-color: #90a4ae; color: white;">
                  <i class="bi bi-arrow-left"></i>
                </button>
                <button @click="proximaEtapa" class="btn btn-primary btn-block">
                  <i class="bi bi-arrow-right"></i>
                </button>
              </div>
            </div>
            <!-- Etapa 3 -->
            <div v-if="etapa === 3" class="section etapa3-section">
              <h3 class="section-title mb-4">3 - Revisão e Cadastro</h3>

              <div class="row g-3">
                <div class="col-md-6">
                  <div class="info-card">
                    <i class="bi bi-card-text info-icon"></i>
                    <div>
                      <span class="info-label">Descrição</span>
                      <p class="info-value">{{ novaPeca.descricao }}</p>
                    </div>
                  </div>
                </div>

                <div class="col-md-6">
                  <div class="info-card">
                    <i class="bi bi-hash info-icon"></i>
                    <div>
                      <span class="info-label">Quantidade</span>
                      <p class="info-value">{{ novaPeca.quantidade_pecas }}</p>
                    </div>
                  </div>
                </div>

                <div class="col-md-6">
                  <div class="info-card">
                    <i class="bi bi-person-badge info-icon"></i>
                    <div>
                      <span class="info-label">Pedido por</span>
                      <p class="info-value">{{ novaPeca.pedido_por }}</p>
                    </div>
                  </div>
                </div>

                <div class="col-md-6">
                  <div class="info-card">
                    <i class="bi bi-calendar-check info-icon"></i>
                    <div>
                      <span class="info-label">Data de Entrega</span>
                      <p class="info-value">{{ novaPeca.data_entrega }}</p>
                    </div>
                  </div>
                </div>

                <div class="col-12">
                  <div class="info-card">
                    <i class="bi bi-gear info-icon"></i>
                    <div>
                      <span class="info-label">Processo de Produção</span>
                      <p class="info-value">{{ novaPeca.producao.join(' → ') }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Botões -->
              <div class="d-flex justify-content-between mt-4">
                <button @click="etapa--" class="btn btn-secondary btn-lg">
                  <i class="bi bi-arrow-left"></i> Voltar
                </button>
                <button @click="adicionarPeca" class="btn btn-success btn-lg">
                  <i class="bi bi-check-lg"></i> Cadastrar Peça
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import Sidebar from "@/components/Sidebar.vue";
import TituloSubtitulo from "@/components/TituloSubtitulo.vue";
import router from "@/router";
import { useAuthStore } from "@/store/store";
import Swal from "sweetalert2";
import api from '@/Axios'

export default {
  components: { Sidebar, TituloSubtitulo },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      etapa: 1,
      novaPeca: {
        descricao: "",
        quantidade_pecas: null,
        pedido_por: "",
        data_entrega: null,
        producao: [],
      },
      fornecedoresRecentes: ["Fornecedor A", "Fornecedor B", "Fornecedor C"],
      locaisPredefinidos: ["Máquina Reta", "Zig-Zag", "Fechadeira", "Braço Livre", "Overloque", "Galoneira", "Travete", "Caseadeira", "Interloque", "Limpeza"],
      draggedItem: null,
      draggedIndex: null,
      targetIndex: null,
      novaEtapa: "",
    };
  },
  methods: {
    proximaEtapa() { this.etapa++; },
    async adicionarPeca() {
      try {
        const token = this.store.pegar_token;
        const response = await api.post("/adicionar/peca", {
          peca: {
            descricao: this.novaPeca.descricao,
            quantidade_pecas: this.novaPeca.quantidade_pecas,
            pedido_por: this.novaPeca.pedido_por,
            data_entrega: this.novaPeca.data_entrega,
            etapas: this.novaPeca.producao
          }
        }, { headers: { Authorization: `${token}` } });

        if (response.status === 201) {
          Swal.fire({
            icon: "success",
            title: "Nova peça adicionada com sucesso!",
            text: "Sua peça foi adicionada",
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
          });
        }
          else {
            Swal.fire({
              icon: "error",
              title: "Erro ao adicionar peça",
              text: "Tente novamente mais tarde.",
              timer: 2000,
              timerProgressBar: true,
              showConfirmButton: false,
            });
          }
          this.etapa = 1;
          this.novaPeca = { descricao: "", quantidade_pecas: null, pedido_por: "", producao: [] };
          router.push("/dashboard");
      } catch (error) {
        console.error("Erro ao cadastrar a peça:", error);
        alert("Erro ao cadastrar a peça. Tente novamente.");
      }
    },
    removerLocal(index) { this.novaPeca.producao.splice(index, 1); },
    onDragStart(local, index) { this.draggedItem = local; this.draggedIndex = index; },
    dragEnter(index) { this.targetIndex = index; },
    onDrop() {
      if (this.draggedItem !== null && this.targetIndex !== null) {
        this.novaPeca.producao.splice(this.draggedIndex, 1); // remove do lugar antigo
        this.novaPeca.producao.splice(this.targetIndex, 0, this.draggedItem); // insere no alvo
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
    adicionarNovaEtapa() {
      if (this.novaEtapa.trim() !== "" && !this.locaisPredefinidos.includes(this.novaEtapa)) {
        this.locaisPredefinidos.push(this.novaEtapa);
        this.novaEtapa = "";
      }
    }
  }
};
</script>

<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
}

.section {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.section-title {
  font-size: 1.5rem;
  color: #616161;
  font-weight: 600;
  margin-top: 5px;
  display: flex;
}

/* Input + botão nova etapa */
.nova-etapa .etapa-input {
  max-width: 300px;
}

/* Etapas disponíveis */
.etapas-disponiveis {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.etapa-card {
  background: #e3f2fd;
  border: 2px dashed #1565c0;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.etapa-card:hover {
  background: #bbdefb;
  transform: scale(1.05);
}

/* Linha de produção */
.linha-producao {
  background: #f4f6f8;
  padding: 20px;
  border-radius: 12px;
  border: 2px dashed #90a4ae;
  margin-top: 20px;
  overflow-x: auto;
  /* adiciona rolagem se passar do limite */
}

.pipeline {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.pipeline-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.etapa-pipeline {
  background: #2e7d32;
  color: white;
  padding: 10px 16px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: grab;
  flex-shrink: 0;
}

.seta {
  font-size: 1.4rem;
  color: #555;
  flex-shrink: 0;
}

.remove-btn {
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: right;
  text-decoration: none;
  color: #dc3545;
  width: 22px;
  height: 22px;
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1;
}

.etapa1-section {
  
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

.etapa1-section .form-label {
  font-weight: 600;
  color: #555;
  display: flex;
}

.etapa1-section .form-control,
.etapa1-section .form-select {
  border-radius: 8px;
  padding: 10px;
  font-size: 0.95rem;
  transition: 0.2s;
}
.etapa3-section {
  background: #f7f7f7; 
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 6px 12px rgba(0,0,0,0.1);
}

.info-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 20px;
  border-radius: 10px;
  background: white;
  border-left: 5px solid #2e7d32;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  transition: transform 0.2s ease;
}

.info-card:hover {
  transform: translateY(-2px);
}

.info-icon {
  font-size: 1.8rem;
  color: #2e7d32;
}

.info-label {
  font-weight: 600;
  color: #555;
  display: flex;
}

.info-value {
  margin: 0;
  font-size: 1rem;
  color: #333;
  display: flex;
}
.container-fluid, .content-wrapper, main {
  overflow-x: hidden;
}

.linha-producao {
  overflow-x: auto; 
  -webkit-overflow-scrolling: touch;
}

.pipeline-inner, .etapas-disponiveis {
  display: flex;
  flex-wrap: nowrap; 
  gap: 12px;
}

@media (max-width: 767px) {
  .nova-etapa section {
    flex-direction: column;
    gap: 10px;
  }

  .nova-etapa .etapa-input,
  .nova-etapa button,
  .btn-lg {
    width: 100% !important;
  }

  .d-flex.gap-2.mt-3.justify-content-between {
    flex-direction: column;
    gap: 10px;
  }

  .linha-producao {
    padding: 15px;
    max-width: 100%;
  }
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

  /* Input + botão em coluna */
  .nova-etapa section {
    flex-direction: column;
    width: 100%;
  }

  .nova-etapa .etapa-input,
  .nova-etapa button {
    width: 100% !important;
    font-size: 1rem;
  }

  /* Etapas disponíveis em grid */
  .etapas-disponiveis {
    display: grid;
    grid-template-columns: 1fr 1fr; /* 2 colunas */
    gap: 10px;
  }

  .etapa-card {
    font-size: 0.9rem;
    padding: 8px 10px;
    text-align: center;
  }

  /* Pipeline rolável no mobile */
  .pipeline {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 10px;
    -webkit-overflow-scrolling: touch;
  }

  .etapa-pipeline {
    font-size: 0.85rem;
    padding: 8px 10px;
    min-width: 120px; /* garante espaço mesmo em rolagem */
  }

  .seta {
    font-size: 1rem;
  }
}
</style>
