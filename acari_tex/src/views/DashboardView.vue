<template>
  <div class="d-flex flex-column flex-xl-row">
    <SidebarNav style="z-index: 1" />
    <main  class="content-wrapper flex-grow-1">
      <div v-if="loading">
         <CarregandoTela />
      </div>
      <div v-if="loading === false" class="container-fluid my-4 mt-md-0 mt-3">
        <section class="row justify-content-center text-center" @click="irPara()" >
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
          <div class="filtro-container">
            <label class="filtro-label">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 14.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 019 17v-2.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              <select v-model="filtro" @change="atualizarFiltro">
                <option value="hoje">Hoje</option>
                <option value="ontem">Ontem</option>
                <option value="antesDeOntem">Antes de Ontem</option>
              </select>
            </label>
          </div>

          <div v-if="loading === false">
            <GraficoProducaoTotal :filtro="filtro" class="mb-4" />
            <GraficoProducaoIndividual :filtro="filtro" class="mb-4" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref } from 'vue';

import SidebarNav from '@/components/Sidebar.vue';
import DashboardCard from '@/components/DashboardCard.vue';
//import Producao from '@/components/Producao.vue';
import GraficoProducaoTotal from '@/components/GraficoProducaoTotal.vue';
import { useAuthStore } from '@/store/store';
import { Chart, registerables } from 'chart.js';
import api from '@/Axios'
Chart.register(...registerables);
import { io } from 'socket.io-client';
import CarregandoTela from '@/components/carregandoTela.vue';
//import GraficoProducaoMes from '@/components/GraficoProducaoMes.vue';
import router from '@/router';
import Swal from 'sweetalert2';
import ConteinersDashboard from '@/components/ConteinersDashboard.vue';
import GraficoProducaoIndividual from '@/components/GraficoProducaoIndividual.vue';

export default {
  name: 'DashboardHome',
  components: {  SidebarNav, DashboardCard, GraficoProducaoTotal, CarregandoTela, ConteinersDashboard, GraficoProducaoIndividual },
  setup() {
    const store = useAuthStore();
    const filtro = ref('hoje'); // padrão
    return { store, filtro };

  },
  data() {
    return {
      loading: true,
      pecas: {
        finalizado: [],
        em_progresso: [],
        nao_iniciado: [],
        coleta: [],
      },
      
    };
  },
  computed: {
    pecasNaoIniciadas() {
      return this.pecas?.nao_iniciado?.length || 0;
    },
    pecasEmProgresso() {
      return this.pecas?.em_progresso?.length || 0;
    },
    pecasConcluidas() {
      return this.pecas?.finalizado?.length || 0;
    },
    pecasColeta() {
      return this.pecas?.coleta?.length || 0;
    }
  },
  mounted() {
    this.verificarAutenticacao();
    this.fetchData();
    this.socket = io('https://acari-tex.onrender.com'); // Conecta ao servidor Socket.IO
    this.socket.on('nova_peca', () => {
      this.fetchData(); 
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
  methods: {
    verificarAutenticacao() {
      const token = this.store.pegar_token;
      const usuario = this.store.pegar_usuario;

      if (!token || !usuario) {
        console.warn('Usuário não autenticado. Redirecionando...');
        router.push('/');
      }
    },
    async irPara(){
      router.push('/Producao')
    },
    async fetchData() {
      this.loading = true;
      try {
        const token = this.store.pegar_token;
        const response = await api.get("/pecas", {
          headers: { Authorization: `${token}` },
        });
        this.pecas = response.data.peca;
        this.loading = false;
      } catch (error) {
        console.error("Erro ao buscar os dados:", error);
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
  box-shadow: 0 3px 10px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: transform 0.2s;
}

.filtro-label:hover {
  transform: translateY(-2px);
}

.filtro-label .icon {
  width: 20px;
  height: 20px;
  color: #4B5563; /* cinza escuro */
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
