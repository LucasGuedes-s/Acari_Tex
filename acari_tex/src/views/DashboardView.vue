<template>
  <div class="d-flex flex-column flex-xl-row">
    <SidebarNav style="z-index: 1" />

    <main class="content-wrapper flex-grow-1">
      <div v-if="loading">
        <CarregandoTela />
      </div>

      <div v-else class="container-fluid my-4 mt-md-0 mt-3">

        <section class="row justify-content-center text-center" @click="irPara()">
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-kanban" title="Não iniciadas" :count="pecasNaoIniciadas" class="bg-light-pink" />
          </div>
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-graph-up-arrow" title="Em andamento" :count="pecasEmProgresso"
              class="bg-light-blue" />
          </div>
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-truck" title="Aguardando coleta" :count="pecasColeta" class="bg-green" />
          </div>
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-check-circle" title="Concluídas" :count="pecasConcluidas" class="bg-light-green" />
          </div>

          <DashboardCard class="d-none d-md-block bg-light-pink" icon="bi-kanban" title="Não iniciadas"
            :count="pecasNaoIniciadas" />
          <DashboardCard class="d-none d-md-block bg-light-blue" icon="bi-graph-up-arrow" title="Em andamento"
            :count="pecasEmProgresso" />
          <DashboardCard class="d-none d-md-block bg-green" icon="bi-truck" title="Aguardando coleta"
            :count="pecasColeta" />
          <DashboardCard class="d-none d-md-block bg-light-green" icon="bi-check-circle" title="Concluídas"
            :count="pecasConcluidas" />
        </section>

        <ConteinersDashboard />

        <div>
          <div class="acoes-container">

            <div class="filtro-container">
              <label class="filtro-label">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 14.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 019 17v-2.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                <select v-model="filtro" @change="atualizarFiltro">
                  <option value="hoje">Hoje</option>
                  <option value="ontem">Ontem</option>
                  <option value="antesDeOntem">Antes de Ontem</option>
                </select>
              </label>
            </div>

            <button class="botao-acao" @click="exportarPDF">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M6 2a2 2 0 00-2 2v16c0 1.1.9 2 2 2h6v-2H6V4h12v5h2V4a2 2 0 00-2-2H6zm7 14v2h5v2h2v-2h2v-2h-2v-2h-2v2h-5z" />
              </svg>
              Exportar PDF
            </button>

            <!-- <button class="botao-acao" @click="exportarExcel">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4h16v16H4V4zm4 12l3-4 3 4m-6-8l3 4 3-4" />
              </svg>
              Exportar Excel
            </button>-->

            <button class="botao-acao botao-improdutivo" @click="abrirModalImprodutivo">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-9-9 9 9 0 019 9z" />
              </svg>
              Tempo improdutivo
            </button>
          </div>

          <div>
            <GraficoEtapas class="mb-4" />
            <GradicoProducaoPorEtapa class="mb-4" />
            <GraficoProducaoTotal :filtro="filtro" v-if="producao?.producao?.producaoDia?.funcionarios?.length"
              :producaoDados="producao" class="mb-4" />
            <GraficoProducaoIndividual :filtro="filtro" v-if="producao?.producao?.producaoDia?.funcionarios?.length"
              :producaoDados="producao" class="mb-4" />
            <ProducaoPorPeca v-if="producao?.producao?.producaoDia?.funcionarios?.length" class="mb-4" />
            <GraficoProducaoPecas class="mb-4" />

            <GraficosIntercorrencias :porClassificacao="porClassificacao" :porNotas="porNotas"
              :linhaTemporal="linhaTemporal" :porFuncionario="porFuncionario" />
          </div>

        </div>
        <!-- MODAL TEMPO IMPRODUTIVO -->
        <div v-if="modalImprodutivoAberto" class="modal-overlay">
          <div class="modal-content">

            <h2 class="modal-title">Registrar Tempo Improdutivo</h2>

            <div class="modal-body">

              <label class="modal-label">Descrição*</label>
              <textarea v-model="formIntercorrencia.descricao" class="modal-input" rows="3"></textarea>

              <label class="modal-label">Tempo de Perda (minutos)*</label>
              <input type="number" v-model="formIntercorrencia.tempo_perda" class="modal-input" />

              <label class="modal-label">Data da Ocorrência*</label>
              <input type="datetime-local" v-model="formIntercorrencia.data_ocorrencia" class="modal-input" />

              <label class="modal-label">Notas*</label>
              <select v-model="formIntercorrencia.notas" class="modal-input">
                <option disabled value="">Selecione</option>
                <option v-for="motivo in motivosDeParada" :key="motivo" :value="motivo">
                  {{ motivo }}
                </option>
              </select>

              <label class="modal-label">Classificação*</label>
              <select v-model="formIntercorrencia.classificacao" class="modal-input">
                <option disabled value="">Selecione</option>
                <option>Planejada</option>
                <option>Não planejada</option>
                <option>Técnica</option>
                <option>Pessoal</option>
              </select>

            </div>

            <div class="modal-footer">
              <button class="btn-cancelar" @click="fecharModalImprodutivo">Cancelar</button>
              <button class="btn-salvar" @click="salvarIntercorrencia">Salvar</button>
            </div>

          </div>
        </div>


      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import DashboardCard from '@/components/DashboardCard.vue';
import GraficoProducaoTotal from '@/components/GraficoProducaoTotal.vue';
import GraficoProducaoIndividual from '@/components/GraficoProducaoIndividual.vue';
import ProducaoPorPeca from '@/components/ProducaoPorPeca.vue';
import GraficoProducaoPecas from '@/components/GraficoProducaoPecas.vue';
import GraficosIntercorrencias from '@/components/GraficosIntercorrencias.vue';
import GradicoProducaoPorEtapa from '@/components/GraficoProducaoPorEtapa.vue';
import GraficoEtapas from '@/components/GraficoEtapas.vue';

import ConteinersDashboard from '@/components/ConteinersDashboard.vue';
import CarregandoTela from '@/components/carregandoTela.vue';

import { useAuthStore } from '@/store/store';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import api from '@/Axios';
import router from '@/router';
import { gerarPdfOPs } from '@/utils/functions/PDFDashboard';

export default {
  name: 'DashboardHome',
  components: {
    SidebarNav,
    DashboardCard,
    GraficoProducaoTotal,
    GraficoProducaoIndividual,
    ProducaoPorPeca,
    GraficoProducaoPecas,
    ConteinersDashboard,
    CarregandoTela,
    GraficosIntercorrencias,
    GradicoProducaoPorEtapa,
    GraficoEtapas,
  },
  data() {
    return {
      motivosDeParada: [
        "Espera de mecânico",
        "Troca de linha",
        "Quebra de agulha",
        "Falta de matéria-prima",
        "Máquina desregulada",
        "Troca de operador",
        "Ajuste de tensão",
        "Quebra de linha",
        "Limpeza da máquina",
        "Setup / troca de modelo",
        "Parada para inspeção",
        "Falta de energia",
        "Pano enganchado",
        "Superaquecimento",
        "Problema no motor",
        "Troca de agulha",
        "Lubrificação",
        "Parada por segurança",
        "Falha no compressor",
        "Parada administrativa",
      ],
      formIntercorrencia: {
        descricao: '',
        tempo_perda: '',
        data_ocorrencia: '',
        notas: '',
        classificacao: '',
      },
      intercorrencias: [],
      filtro: 'hoje',
      loading: true,
      modalImprodutivoAberto: false,
      producao: { producaoDia: { funcionarios: [] } },
      pecas: {
        finalizado: [],
        em_progresso: [],
        nao_iniciado: [],
        coleta: [],
      },
      socket: null,
      store: useAuthStore(),
    };
  },

  computed: {
    pecasNaoIniciadas() { return this.pecas.nao_iniciado.length; },
    pecasEmProgresso() { return this.pecas.em_progresso.length; },
    pecasConcluidas() { return this.pecas.finalizado.length; },
    pecasColeta() { return this.pecas.coleta.length; },
  },

  mounted() {
    this.verificarAutenticacao();
    this.producaoPecas();
    this.fetchData();
    this.getIntercorrencias();
    this.socket = io('https://acari-tex.onrender.com');

    this.socket.on('nova_peca', () => {
      this.fetchData();
      this.producaoPecas();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Gráficos atualizados, nova produção registrada',
        showConfirmButton: false,
        timer: 8000,
        timerProgressBar: true,
      });
    });
  },

  beforeUnmount() {
    if (this.socket) this.socket.disconnect();
  },

  methods: {
    verificarAutenticacao() {
      const token = this.store.pegar_token;
      const usuario = this.store.pegar_usuario;

      if (!token || !usuario) router.push('/');
    },
    async exportarPDF() {
      const statusOptions = {
        em_progresso: "Em progresso",
        finalizado: "Finalizadas",
        coleta: "Em coleta",
        nao_iniciado: "Não iniciadas"
      };

      // 1️⃣ Escolher status
      const { value: status } = await Swal.fire({
        title: "Selecionar status das peças",
        input: "select",
        inputOptions: statusOptions,
        inputPlaceholder: "Selecione o status",
        showCancelButton: true,
        confirmButtonColor: "#0d3927",
        cancelButtonText: "Cancelar",
        confirmButtonText: "Continuar"
      });

      if (!status) return;

      const pecas = this.pecas[status] || [];

      if (!pecas.length) {
        Swal.fire("Nenhuma peça encontrada", "", "info");
        return;
      }

      // 2️⃣ Montar lista de checkboxes
      const html = pecas
        .map(
          peca => `
      <div style="text-align:left;margin-bottom:8px">
        <label>
          <input type="checkbox" value="${peca.id_da_op}" class="swal-peca">
          <strong>${peca.descricao}</strong>
          <small style="display:block;color:#666">
            OP #${peca.id_da_op} · ${peca.quantidade_pecas} peças
          </small>
        </label>
      </div>
    `
        )
        .join("");

      // 3️⃣ Selecionar peças
      const { isConfirmed } = await Swal.fire({
        title: "Selecionar peças para o PDF",
        html,
        width: 600,
        confirmButtonColor: "#0d3927",
        confirmButtonText: "Gerar PDF",
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        preConfirm: () => {
          const selecionadas = [
            ...document.querySelectorAll(".swal-peca:checked")
          ].map(el => Number(el.value));

          if (!selecionadas.length) {
            Swal.showValidationMessage("Selecione ao menos uma peça");
          }

          return selecionadas;
        }
      });

      if (!isConfirmed) return;

      const idsSelecionados = [
        ...document.querySelectorAll(".swal-peca:checked")
      ].map(el => Number(el.value));

      const pecasSelecionadas = pecas.filter(peca =>
        idsSelecionados.includes(peca.id_da_op)
      );

      gerarPdfOPs(pecasSelecionadas);

    },
    irPara() {
      router.push('/Producao');
    },

    atualizarFiltro() {
      this.producaoPecas();
    },
    abrirModalImprodutivo() {
      this.modalImprodutivoAberto = true;
      this.formIntercorrencia = {
        descricao: '',
        tempo_perda: '',
        data_ocorrencia: '',
        notas: '',
      };
      this.producaoPecas();
      this.fetchData();
      this.getIntercorrencias();
    },
    fecharModalImprodutivo() {
      this.modalImprodutivoAberto = false;
      this.formIntercorrencia = {
        descricao: '',
        tempo_perda: '',
        data_ocorrencia: '',
        notas: '',
      };

    },
    processarDados() {
      const porClassificacao = {};
      const porNotas = {};
      const linhaTemporal = {};
      const porFuncionario = {};

      this.intercorrencias.forEach(item => {
        // Classificação
        porClassificacao[item.classificacao] =
          (porClassificacao[item.classificacao] || 0) + item.tempo_perda;

        // Notas / Motivo
        porNotas[item.notas] =
          (porNotas[item.notas] || 0) + item.tempo_perda;

        // Linha temporal (dia)
        const dia = new Date(item.data_ocorrencia)
          .toISOString()
          .split("T")[0];

        linhaTemporal[dia] =
          (linhaTemporal[dia] || 0) + item.tempo_perda;

        // Por Funcionário
        if (item.registradaPor) {
          porFuncionario[item.registradaPor] =
            (porFuncionario[item.registradaPor] || 0) + item.tempo_perda;
        }
      });

      this.porClassificacao = porClassificacao;
      this.porNotas = porNotas;
      this.linhaTemporal = linhaTemporal;
      this.porFuncionario = porFuncionario;
    },
    async salvarIntercorrencia() {
      if (
        !this.formIntercorrencia.descricao ||
        !this.formIntercorrencia.tempo_perda ||
        !this.formIntercorrencia.data_ocorrencia ||
        !this.formIntercorrencia.notas ||
        !this.formIntercorrencia.classificacao
      ) {
        Swal.fire('Erro', 'Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
      }

      try {
        const token = this.store.pegar_token;
        await api.post('/intercorrencias', this.formIntercorrencia, {
          headers: { Authorization: token },
        });

        Swal.fire('Sucesso', 'Intercorrência registrada com sucesso!', 'success');
        this.fecharModalImprodutivo();
      } catch (err) {
        this.fecharModalImprodutivo();
        console.error('Erro ao salvar intercorrência:', err);
        Swal.fire('Erro', 'Ocorreu um erro ao registrar a intercorrência.', 'error');
      }
    },
    async fetchData() {
      this.loading = true;
      try {
        const token = this.store.pegar_token;
        const response = await api.get('/pecas', {
          headers: { Authorization: token },
        });
        this.pecas = response.data.peca;
        //console.log('Peças carregadas:', this.pecas);
      } catch (err) {
        console.error('Erro ao buscar peças:', err);
      }
      this.loading = false;
    },

    async producaoPecas() {
      this.loading = true;
      try {
        const token = this.store.pegar_token;
        const res = await api.get('/producao/equipe', {
          headers: { Authorization: token },
          params: { filtro: this.filtro },
        });
        this.producao = res.data;
        //console.log('Produção carregada:', this.producao);
      } catch (err) {
        console.error('Erro ao buscar produção:', err);
        this.producao = { producaoDia: { funcionarios: [] } };
      }
      this.loading = false;
    },
    async getIntercorrencias() {
      try {
        const token = this.store.pegar_token;
        const response = await api.get('/intercorrencias', {
          headers: { Authorization: token },
        });
        this.intercorrencias = response.data.intercorrencias;
        this.processarDados();
        //console.log('Intercorrências carregadas:', this.intercorrencias);
      } catch (err) {
        console.error('Erro ao buscar intercorrências:', err);
        return [];
      }
    },
  }
};
</script>

<style scoped>
.d-flex {
  display: flex;
  flex-direction: row;
  height: 40vh;
}

.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
}

.row {
  margin-top: 30px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
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

.acoes-container {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.botao-acao {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #0A8A38;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: 0.2s;
}

.botao-acao:hover {
  background: #06642A;
}

.botao-improdutivo {
  background: #b32d00 !important;
}

.botao-improdutivo:hover {
  background: #7a1f00 !important;
}

.icon {
  width: 18px;
  height: 18px;
}

.filtro-container {
  margin: 20px 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.filtro-label {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s;
}

.filtro-label:hover {
  transform: translateY(-2px);
}

.filtro-label .icon {
  width: 20px;
  height: 20px;
  color: #4B5563;
  /* cinza escuro */
  margin-right: 8px;
}

.filtro-label select {
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

/* --- MODAL REFINADO --- */

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: #ffffff;
  width: 480px;
  padding: 26px 28px;
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
  animation: fadeInModal .25s ease-out;
  border: 1px solid #ececec;
}

.modal-title {
  font-size: 22px;
  margin-bottom: 18px;
  font-weight: 700;
  color: #0A8A38;
  text-align: left;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-label {
  font-weight: 600;
  font-size: 14px;
  color: #444;
  text-align: left;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d6d6d6;
  border-radius: 10px;
  font-size: 15px;
  background: #fdfdfd;
  transition: all 0.2s ease;
}

.modal-input:focus {
  border-color: #0A8A38;
  box-shadow: 0 0 0 3px rgba(10, 138, 56, 0.15);
  outline: none;
  background: white;
}

textarea.modal-input {
  resize: none;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 22px;
  gap: 12px;
}

.btn-cancelar,
.btn-salvar {
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease-out;
}

.btn-cancelar {
  background: #e4e4e4;
  color: #333;
}

.btn-cancelar:hover {
  background: #cacaca;
}

.btn-salvar {
  background: #0A8A38;
  color: white;
}

.btn-salvar:hover {
  background: #086c2c;
}

/* Animação suave */
@keyframes fadeInModal {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}



@media (min-width: 768px) and (max-width: 1024px) {
  .content-wrapper {
    padding-left: 0px;
  }
}
</style>