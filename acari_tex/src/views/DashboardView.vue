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
        <div class="row justify-content-center" v-if="loading === false">
          <GraficoProducaoTotal class="mb-4" />
          <Producao class="mb-4"  />

          <GraficoProducaoMes class="mb-4" />
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import DashboardCard from '@/components/DashboardCard.vue';
import Producao from '@/components/Producao.vue';
import GraficoProducaoTotal from '@/components/GraficoProducaoTotal.vue';
import { useAuthStore } from '@/store/store';
import { Chart, registerables } from 'chart.js';
import api from '@/Axios'
Chart.register(...registerables);
import { io } from 'socket.io-client';
import CarregandoTela from '@/components/carregandoTela.vue';
import GraficoProducaoMes from '@/components/GraficoProducaoMes.vue';
import router from '@/router';
import Swal from 'sweetalert2';
import ConteinersDashboard from '@/components/ConteinersDashboard.vue';

export default {
  name: 'DashboardHome',
  components: { GraficoProducaoMes, SidebarNav, DashboardCard, Producao, GraficoProducaoTotal, CarregandoTela, ConteinersDashboard },
  setup() {
    const store = useAuthStore();
    return { store };
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
@media (min-width: 768px) and (max-width: 1024px) {

  .content-wrapper {
    padding-left: 0px; 
  }

}
</style>
