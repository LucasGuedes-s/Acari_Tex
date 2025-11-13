<template>
  <div class="detalhes-producao-page">
    <SidebarNav />
    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid py-4">
        <TituloSubtitulo 
          titulo="📊 Estatísticas da Peça"
          subtitulo="Veja todos os detalhes e dados da produção desta peça" 
        />

        <div v-if="pecaDetalhes" class="card p-4 shadow-sm border-0 rounded-3">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            <h4 class="mb-3 fw-bold">{{ pecaDetalhes.descricao }}</h4>

            <div class="d-flex gap-2">
              <button class="btn btn-dark">Estornar produção</button>
              <button class="bot btn btn-secondary" @click="exportarPDF">Exportar PDF</button>
              <button class="bot btn btn-success" @click="exportarPlanilha">Exportar excel</button>
            </div>
          </div>

          <!-- Infos gerais -->
          <div class="row g-4">
            <div class="col-md-6">
              <div class="info-box p-3 rounded shadow-sm bg-light">
                <p>
                  <strong>Status:</strong>
                  <span :class="['badge', badgeClass(pecaDetalhes.status)]">
                    {{ traduzStatus(pecaDetalhes.status) }}
                  </span>
                </p>
                <p><strong>Quantidade Total:</strong> {{ pecaDetalhes.quantidade_pecas }}</p>
                <p><strong>Total Produzido:</strong> {{ pecaDetalhes.totalProduzido }}</p>
              </div>
            </div>

            <div class="col-md-6">
              <div class="info-box p-3 rounded shadow-sm bg-light">
                <p><strong>Pedido por:</strong> {{ pecaDetalhes.pedido_por }}</p>
                <p><strong>Data do pedido:</strong> {{ formatarData(pecaDetalhes.data_do_pedido) }}</p>
                <p><strong>Data de entrega:</strong> {{ formatarData(pecaDetalhes.data_de_entrega) }}</p>
              </div>
            </div>
          </div>

          <!-- Gráficos -->
          <div class="row mt-5 g-4" v-if="pecaDetalhes.totalProduzido > 0">
            <div class="col-12">
              <div class="card p-3 shadow-sm border-0">
                <h5 class="mb-3">👷 Produção por Funcionário</h5>
                <GChart 
                  ref="chartFuncionariosRef"
                  v-if="graficoFuncionarios.length > 1" 
                  type="BarChart" 
                  :data="graficoFuncionarios"
                  :options="{ title: 'Funcionários', legend: { position: 'none' } }"
                  style="width: 100%; height: 500px;" 
                />
              </div>
            </div>

            <div class="col-12">
              <div class="card p-3 shadow-sm border-0">
                <h5 class="mb-3">⚙️ Produção por Etapa</h5>
                <GChart 
                  ref="chartEtapasRef"
                  v-if="graficoEtapas.length > 1" 
                  type="BarChart" 
                  :data="graficoEtapas" 
                  :options="{ 
                    title: 'Etapas', 
                    isStacked: true, 
                    hAxis: { title: 'Quantidade' }, 
                    vAxis: { title: 'Etapas' } 
                  }"
                  style="width: 100%; height: 500px;" 
                />
              </div>
            </div>
          </div>

          <!-- Detalhamento da Produção -->
          <div class="mt-5" v-if="pecaDetalhes.totalProduzido > 0">
            <h5 class="mb-3">Detalhamento da Produção por Etapa</h5>
            <div class="table-responsive">
              <table class="table table-striped table-hover table-bordered align-middle">
                <thead class="table-dark">
                  <tr>
                    <th>Etapa</th>
                    <th>Funcionário</th>
                    <th>Quantidade</th>
                    <th>Data</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="(registros, etapa) in pecaDetalhes.producaoPorEtapa" :key="etapa">
                    <tr v-for="(registro, idx) in registros" :key="etapa + '-' + idx">
                      <td>{{ etapa }}</td>
                      <td>{{ registro.funcionario }}</td>
                      <td>{{ registro.quantidade }}</td>
                      <td>{{ formatarData(registro.data_inicio) }}</td>
                      <td>{{ registro.hora_registro }}</td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from "@/components/Sidebar.vue";
import TituloSubtitulo from "@/components/TituloSubtitulo.vue";
import { GChart } from "vue-google-charts";
import { useAuthStore } from "@/store/store";
import api from "@/Axios";
import { exportarProducaoPDF } from "@/utils/functions/GerarPDFPeca";
import { exportarProducaoExcel } from "@/utils/functions/GerarExcel";

export default {
  name: "DetalhesProducao",
  components: { SidebarNav, TituloSubtitulo, GChart },
  data() {
    return {
      pecaDetalhes: null,
      graficoFuncionarios: [["Funcionário", "Quantidade"]],
      graficoEtapas: [["Etapa", "Produzido", "Faltando"]],
    };
  },
  methods: {
    async buscarEstatisticas() {
      const store = useAuthStore();
      const token = store.pegar_token;
      const { data } = await api.get(`/estatisticas/${this.$route.params.id}`, {
        headers: { Authorization: token },
      });
      console.log("Estatísticas da peça:", data.estatisticas);
      this.pecaDetalhes = data.estatisticas;

      // Gráfico por funcionário
      const funcionarios = {};
      Object.values(this.pecaDetalhes.producaoPorEtapa).forEach((registros) => {
        registros.forEach((r) => {
          if (!funcionarios[r.funcionario]) funcionarios[r.funcionario] = 0;
          funcionarios[r.funcionario] += r.quantidade;
        });
      });
      this.graficoFuncionarios = [["Funcionário", "Quantidade"], ...Object.entries(funcionarios)];

      // Gráfico por etapa
      const etapas = [];
      Object.entries(this.pecaDetalhes.producaoPorEtapa).forEach(([etapa, registros]) => {
        const totalEtapa = registros.reduce((sum, r) => sum + (r.quantidade || 0), 0);
        etapas.push([etapa, totalEtapa, this.pecaDetalhes.quantidade_pecas - totalEtapa]);
      });
      this.graficoEtapas = [["Etapa", "Produzido", "Faltando"], ...etapas];
    },
    badgeClass(status) {
      return {
        nao_iniciado: "bg-secondary",
        em_progresso: "bg-warning text-dark",
        coleta: "bg-info text-dark",
        finalizado: "bg-success",
      }[status] || "bg-dark";
    },
    traduzStatus(status) {
      const mapa = {
        nao_iniciado: "Não iniciada",
        em_progresso: "Em andamento",
        coleta: "Aguardando coleta",
        finalizado: "Finalizada",
      };
      return mapa[status] || status;
    },
    formatarData(dataStr) {
      if (!dataStr) return "-";
      const data = new Date(dataStr);
      return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);
    },
    async exportarPDF() {
      if (!this.pecaDetalhes) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("Exportando PDF da peça:", this.pecaDetalhes);
      await exportarProducaoPDF(
        this.pecaDetalhes
      );
    },
    async exportarPlanilha() {
      if (!this.pecaDetalhes) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("Exportando PDF da peça:", this.pecaDetalhes);
      await exportarProducaoExcel(
        this.pecaDetalhes
      );
    },
  },
  mounted() {
    this.buscarEstatisticas();
  },
};
</script>
<style scoped>
.bot {
  background-color: var(--verde-escuro);
}

.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
}

.info-box {
  background: #f9f9f9;
  border-left: 5px solid var(--verde-escuro);
  justify-items: left;
}

.modal-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 10px;
}

.modal-container.registro {
  background: #fff;
  border-radius: 12px;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: fadeInUp 0.3s ease;
  overflow: hidden;
  font-family: 'Montserrat', sans-serif;
}

.modal-header.registro {
  background: linear-gradient(90deg, #145a32, #2e7d32);
  color: #fff;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 1.2rem;
}

.modal-close {
  width: 24px;
  height: 24px;
  cursor: pointer;
  transition: transform 0.2s;
}

.modal-close:hover {
  transform: rotate(90deg);
}

.modal-body.registro {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal-info.registro .info-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-info.registro label {
  font-weight: 600;
  color: #555;
  display: flex;
}

.modal-info.registro .input-field,
.modal-info.registro .input-select {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 0.95rem;
  font-family: 'Montserrat', sans-serif;
  transition: 0.2s;
}

.modal-info.registro .input-field:focus,
.modal-info.registro .input-select:focus {
  outline: none;
  border-color: #2e7d32;
  box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.2);
}

.modal-footer.registro {
  padding: 15px 20px;
  background: #f7f7f7;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-footer.registro .btn {
  min-width: 100px;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: 0.2s;
}

.modal-footer.registro .btn-success {
  background-color: var(--verde-escuro);
  color: white;
  border: none;
}

.modal-footer.registro .btn-success:hover {
  background-color: var(--verde-claro);
}

.modal-footer.registro .btn-secondary {
  background-color: #ccc;
  color: #333;
  border: none;
}

.modal-footer.registro .btn-secondary:hover {
  background-color: #b3b3b3;
}

@media (max-width: 768px) {
  .modal-container.registro {
    padding: 10px 0;
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
