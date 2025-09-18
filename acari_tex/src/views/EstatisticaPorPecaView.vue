<template>
  <div class="detalhes-producao-page">
    <SidebarNav />
    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid py-4">
        <TituloSubtitulo titulo="📊 Estatísticas da Peça"
          subtitulo="Veja todos os detalhes e dados da produção desta peça" />

        <div v-if="pecaDetalhes" class="card p-4 shadow-sm border-0 rounded-3">
          <div
            class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            <h4 class="mb-3 fw-bold">{{ pecaDetalhes.descricao }}</h4>
            <button class="btn btn-secondary mb-4" @click="showModalEstorno = true">Estornar produção</button>
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
                <GChart v-if="graficoFuncionarios.length > 1" type="BarChart" :data="graficoFuncionarios"
                  :options="{ title: 'Funcionários', legend: { position: 'none' } }"
                  style="width: 100%; height: 500px;" />
              </div>
            </div>

            <div class="col-12">
              <div class="card p-3 shadow-sm border-0">
                <h5 class="mb-3">⚙️ Produção por Etapa</h5>
                <GChart v-if="graficoEtapas.length > 1" type="BarChart" :data="graficoEtapas" :options="{
                  title: 'Etapas',
                  isStacked: true,
                  hAxis: { title: 'Quantidade' },
                  vAxis: { title: 'Etapas' },
                }" style="width: 100%; height: 500px;" />
              </div>
            </div>
          </div>

          <div class="mt-5">
            <h5 class="mb-3">Detalhamento da Produção por Etapa</h5>

            <!-- wrapper para responsividade -->
            <div class="table-responsive" v-if="pecaDetalhes.totalProduzido > 0">
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

      <!-- Modal de estorno -->
      <div v-if="showModalEstorno" class="modal-background">
        <div class="modal-container registro">
          <div class="modal-header registro">
            <h2>Estornar Produção</h2>
            <img class="modal-close" @click="showModalEstorno = false" src="@/assets/close.png" alt="Fechar" />
          </div>

          <div class="modal-body registro">
            <div class="modal-info registro">
              <div class="info-row">
                <label class="label">Etapa</label>
                <select v-model="etapaSelecionada" class="input-select">
                  <option v-for="etapa in etapas" :key="etapa" :value="etapa.id_da_funcao">
                    {{ etapa.descricao }}
                  </option>
                </select>
              </div>

              <div class="info-row">
                <label class="label">Quantidade a estornar</label>
                <input type="number" v-model.number="quantidadeEstorno" class="input-field" min="1"
                  :max="quantidadeMaxima" />
              </div>
            </div>
          </div>

          <div class="modal-footer registro">
            <button class="btn btn-secondary" @click="showModalEstorno = false">Cancelar</button>
            <button class="btn btn-success" @click="confirmarEstorno">Estornar</button>
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
import Swal from "sweetalert2";

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
      showModalEstorno: false,
      etapaSelecionada: null,
      quantidadeEstorno: 1,
      etapas: [],
    };
  },
  computed: {
    quantidadeMaxima() {
      if (!this.pecaDetalhes || !this.pecaDetalhes.etapas) return 0;

      const etapa = this.pecaDetalhes.etapas.find(
        (e) => e.etapa.id_da_funcao === this.etapaSelecionada
      );

      if (!etapa) return 0;

      const registrosEtapa = this.pecaDetalhes.producaoPorEtapa?.[etapa.etapa.descricao] || [];
      const totalNaEtapa = registrosEtapa.reduce((sum, r) => sum + (r.quantidade || 0), 0);

      return totalNaEtapa;
    },
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
      const data = new Date(dataStr);
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "UTC",
      }).format(data);
    },
    async confirmarEstorno() {
      if (!this.etapaSelecionada || this.quantidadeEstorno < 1) {
        Swal.fire({
          icon: "error",
          title: "Erro",
          text: "Selecione uma etapa válida e uma quantidade maior que zero.",
        });
        return;
      }

      try {
        const token = this.store.pegar_token;
        await api.post(
          "/voltar/peca",
          {
            id_da_op: this.pecaDetalhes.id_da_op,
            id_da_funcao: this.etapaSelecionada,
            quantidade: this.quantidadeEstorno,
          },
          { headers: { Authorization: token } }
        );

        Swal.fire({
          icon: "success",
          title: "Produção estornada com sucesso!",
          showConfirmButton: false,
          timer: 1500,
        });
        this.showModalEstorno = false;
        this.buscarEstatisticas();
      } catch (err) {
        console.error("Erro ao estornar produção:", err);
        Swal.fire({
          icon: "error",
          title: "Erro ao estornar produção",
          text: err.response?.data?.mensagem || "Tente novamente mais tarde.",
        });
        this.showModalEstorno = false;
        this.buscarEstatisticas();
      }
    },
    async buscarEstatisticas() {
      const token = this.store.pegar_token;
      const { data } = await api.get(
        `/estatisticas/${this.$route.params.id}`,
        { headers: { Authorization: token } }
      );

      this.pecaDetalhes = data.estatisticas;
      this.etapas = this.pecaDetalhes.pecasEtapas || [];
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
.btn {
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
</style>
