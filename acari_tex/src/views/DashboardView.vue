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
            <DashboardCard icon="bi-graph-up-arrow" title="Em andamento" :count="pecasEmProgresso" class="bg-light-blue" />
          </div>
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-truck" title="Aguardando coleta" :count="pecasColeta" class="bg-green" />
          </div>
          <div class="d-block d-md-none col-6 mb-3">
            <DashboardCard icon="bi-check-circle" title="Concluídas" :count="pecasConcluidas" class="bg-light-green" />
          </div>

          <DashboardCard class="d-none d-md-block bg-light-pink" icon="bi-kanban" title="Não iniciadas" :count="pecasNaoIniciadas" />
          <DashboardCard class="d-none d-md-block bg-light-blue" icon="bi-graph-up-arrow" title="Em andamento" :count="pecasEmProgresso" />
          <DashboardCard class="d-none d-md-block bg-green" icon="bi-truck" title="Aguardando coleta" :count="pecasColeta" />
          <DashboardCard class="d-none d-md-block bg-light-green" icon="bi-check-circle" title="Concluídas" :count="pecasConcluidas" />
        </section>

        <ConteinersDashboard />

        <div>
          <div class="acoes-container">

            <div class="filtro-container">
              <label class="filtro-label">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <path d="M6 2a2 2 0 00-2 2v16c0 1.1.9 2 2 2h6v-2H6V4h12v5h2V4a2 2 0 00-2-2H6zm7 14v2h5v2h2v-2h2v-2h-2v-2h-2v2h-5z"/>
              </svg>
              Exportar PDF
            </button>

            <button class="botao-acao" @click="exportarExcel">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4h16v16H4V4zm4 12l3-4 3 4m-6-8l3 4 3-4" />
              </svg>
              Exportar Excel
            </button>

            <button class="botao-acao botao-improdutivo" @click="abrirModalImprodutivo">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 8v4l3 3m6-3a9 9 0 11-9-9 9 9 0 019 9z" />
              </svg>
              Tempo improdutivo
            </button>
          </div>

          <div>
            <GraficoProducaoTotal :filtro="filtro" :producaoDados="producao" class="mb-4" />
            <GraficoProducaoIndividual :filtro="filtro" :producaoDados="producao" class="mb-4" />
            <ProducaoPorPeca class="mb-4" />
            <GraficoProducaoPecas class="mb-4" />
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
import ConteinersDashboard from '@/components/ConteinersDashboard.vue';
import CarregandoTela from '@/components/carregandoTela.vue';

import { useAuthStore } from '@/store/store';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import api from '@/Axios';
import router from '@/router';

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
  },

  data() {
    return {
      filtro: 'hoje',
      loading: true,
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

    irPara() {
      router.push('/Producao');
    },

    atualizarFiltro() {
      this.producaoPecas();
    },

    async fetchData() {
      this.loading = true;
      try {
        const token = this.store.pegar_token;
        const response = await api.get('/pecas', {
          headers: { Authorization: token },
        });

        this.pecas = response.data.peca;
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
      } catch (err) {
        console.error('Erro ao buscar produção:', err);
        this.producao = { producaoDia: { funcionarios: [] } };
      }
      this.loading = false;
    },
  }
};
</script>

<style scoped>
/* Estilos não foram alterados, apenas incluídos para completude */
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
  background: #0A8A38; /* Verde escuro */
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
  background: #b32d00 !important; /* Vermelho queimado */
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

@media (min-width: 768px) and (max-width: 1024px) {
  .content-wrapper {
    padding-left: 0px;
  }
}
</style>