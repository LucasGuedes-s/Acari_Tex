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
          <h4 class="mb-3 fw-bold">{{ pecaDetalhes.descricao }}</h4>

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
          <div class="row mt-5 g-4">
            <!-- Produção por Funcionário -->
            <div class="col-12">
              <div class="card p-3 shadow-sm border-0">
                <h5 class="mb-3">👷 Produção por Funcionário</h5>
                <GChart 
                  v-if="graficoFuncionarios.length > 1"
                  type="BarChart"
                  :data="graficoFuncionarios"
                  :options="{ title: 'Funcionários', legend: { position: 'none' } }"
                  style="width: 100%; height: 500px;" 
                />
              </div>
            </div>

            <!-- Produção por Etapa -->
            <div class="col-12">
              <div class="card p-3 shadow-sm border-0">
                <h5 class="mb-3">⚙️ Produção por Etapa</h5>
                <GChart 
                  v-if="graficoEtapas.length > 1"
                  type="BarChart"
                  :data="graficoEtapas"
                  :options="{
                    title: 'Etapas',
                    isStacked: true,
                    hAxis: { title: 'Quantidade' },
                    vAxis: { title: 'Etapas' },
                  }"
                  style="width: 100%; height: 500px;"
                />
              </div>
            </div>
          </div>

          <!-- Produção por Etapa (detalhado) -->
          <div class="mt-5">
            <h5 class="mb-3">Detalhamento da Produção por Etapa</h5>
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
    </main>
  </div>
</template>

<script>
import SidebarNav from "@/components/Sidebar.vue";
import TituloSubtitulo from "@/components/TituloSubtitulo.vue";
import { GChart } from "vue-google-charts";
import { useAuthStore } from "@/store/store";
import api from "@/Axios";

export default {
  name: "DetalhesProducao",
  components: { SidebarNav, TituloSubtitulo, GChart },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      pecaDetalhes: null,
      graficoTotal: [["Status", "Quantidade"]],
      graficoFuncionarios: [["Funcionário", "Quantidade"]],
      graficoEtapas: [["Etapa", "Produzido", "Faltando"]],
    };
  },
  methods: {
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
      return new Date(dataStr).toLocaleDateString("pt-BR");
    },
    async buscarEstatisticas() {
      const token = this.store.pegar_token;
      const { data } = await api.get(
        `/estatisticas/${this.$route.params.id}`,
        { headers: { Authorization: `${token}` } }
      );

      this.pecaDetalhes = data.estatisticas;

      // Gráfico total
      this.graficoTotal = [
        ["Status", "Quantidade"],
        ["Produzido", this.pecaDetalhes.totalProduzido],
        ["Saldo", this.pecaDetalhes.saldo],
      ];

      // Gráfico por funcionário
      const funcionarios = {};
      Object.values(this.pecaDetalhes.producaoPorEtapa).forEach((registros) => {
        registros.forEach((r) => {
          if (!funcionarios[r.funcionario]) funcionarios[r.funcionario] = 0;
          funcionarios[r.funcionario] += r.quantidade;
        });
      });
      this.graficoFuncionarios = [
        ["Funcionário", "Quantidade"],
        ...Object.entries(funcionarios),
      ];

      // Gráfico por etapa
      const etapas = [];
      Object.entries(this.pecaDetalhes.producaoPorEtapa).forEach(([etapa, registros]) => {
        const totalEtapa = registros.reduce((sum, r) => sum + (r.quantidade || 0), 0);
        etapas.push([etapa, totalEtapa, this.pecaDetalhes.quantidade_pecas - totalEtapa]);
      });
      this.graficoEtapas = [["Etapa", "Produzido", "Faltando"], ...etapas];
    },
  },
  mounted() {
    this.buscarEstatisticas();
  },
};
</script>

<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
}

.info-box {
  background: #f9f9f9;
  border-left: 5px solid #198754;
  justify-items: left;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0px;
  }
}
</style>
