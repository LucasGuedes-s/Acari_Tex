<template>
  <div class="detalhes-page">
    <SidebarNav />
    <main class="content-wrapper">

      <!-- ── Loading ── -->
      <div v-if="!pecaDetalhes" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Carregando estatísticas...</p>
      </div>

      <div v-else class="page-body">

        <!-- ── Page Header ── -->
        <div class="page-header">
          <div class="header-left">
            <div class="header-tag">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Estatísticas de Produção
            </div>
            <h1 class="page-title">{{ pecaDetalhes.descricao }}</h1>
            <div class="header-meta">
              <span class="status-badge" :class="badgeClass(pecaDetalhes.status)">
                {{ traduzStatus(pecaDetalhes.status) }}
              </span>
              <span class="meta-sep">·</span>
              <span class="meta-text">Pedido por <strong>{{ pecaDetalhes.pedido_por || '—' }}</strong></span>
              <span class="meta-sep">·</span>
              <span class="meta-text">Entrega <strong>{{ formatarData(pecaDetalhes.data_de_entrega) }}</strong></span>
            </div>
          </div>

          <div class="header-actions">
            <button class="btn-outline" @click="abrirModalNovaEtapa">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nova Etapa
            </button>
            <button class="btn-outline" @click="exportarPDF">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              PDF
            </button>
            <button class="btn-primary" @click="exportarPlanilha">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              Excel
            </button>
          </div>
        </div>

        <!-- ── KPI Cards ── -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon kpi-icon--blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </div>
            <div>
              <p class="kpi-label">Quantidade Total</p>
              <p class="kpi-value">{{ pecaDetalhes.quantidade_pecas }}</p>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon kpi-icon--green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <p class="kpi-label">Peças Concluídas</p>
              <p class="kpi-value">{{ pecaDetalhes.totalConcluido }}</p>
              <p class="kpi-sub">{{ pecaDetalhes.percentualConcluido }} do total</p>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon kpi-icon--amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <p class="kpi-label">Restante</p>
              <p class="kpi-value">{{ Math.max(0, pecaDetalhes.quantidade_pecas - pecaDetalhes.totalConcluido) }}</p>
            </div>
          </div>

          <div class="kpi-card kpi-card--highlight">
            <div class="kpi-icon kpi-icon--teal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div>
              <p class="kpi-label">Eficiência da Peça</p>
              <p class="kpi-value kpi-value--efficiency">{{ pecaDetalhes.eficienciaPeca }}</p>
              <p class="kpi-sub">média: {{ pecaDetalhes.mediaEficiencia }}</p>
            </div>
          </div>
        </div>

        <!-- ── Progresso geral ── -->
        <div class="progress-card">
          <div class="progress-header">
            <div class="progress-header-left">
              <span class="progress-label">Progresso geral da produção</span>
              <span class="progress-sub">{{ pecaDetalhes.totalConcluido }} de {{ pecaDetalhes.quantidade_pecas }} peças concluídas</span>
            </div>
            <span class="progress-pct">{{ progressoPct }}%</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" :style="{ width: progressoPct + '%' }"></div>
          </div>
        </div>

        <!-- ── Eficiência por Funcionário ── -->
        <div class="section-card" v-if="pecaDetalhes.eficienciaPorFuncionario && pecaDetalhes.eficienciaPorFuncionario.length > 0">
          <div class="section-header">
            <div class="section-title-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              <h3>Eficiência por Funcionário</h3>
            </div>
          </div>

          <div class="eficiencia-list">
            <div
              v-for="(func, idx) in pecaDetalhes.eficienciaPorFuncionario"
              :key="idx"
              class="eficiencia-row"
            >
              <div class="eficiencia-avatar">
                {{ getInitials(func.nome) }}
              </div>
              <div class="eficiencia-info">
                <div class="eficiencia-top">
                  <span class="eficiencia-nome">{{ func.nome }}</span>
                  <span class="eficiencia-pct" :class="getEficienciaClass(func.eficiencia_individual)">
                    {{ func.eficiencia_individual }}
                  </span>
                </div>
                <div class="eficiencia-bar-track">
                  <div
                    class="eficiencia-bar-fill"
                    :class="getEficienciaClass(func.eficiencia_individual)"
                    :style="{ width: func.eficiencia_individual }"
                  ></div>
                </div>
                <div class="eficiencia-bottom">
                  <span class="eficiencia-email">{{ func.email }}</span>
                  <span class="eficiencia-tempo">{{ func.tempo_padrao_produzido }} min produzidos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Etapas da Peça ── -->
        <div class="section-card">
          <div class="section-header">
            <div class="section-title-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M4.93 4.93l1.41 1.41M18.66 18.66l1.41 1.41M2 12h2M20 12h2M12 2v2M12 20v2"/></svg>
              <h3>Etapas da Peça</h3>
            </div>
            <button class="btn-add-etapa" @click="abrirModalNovaEtapa">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Adicionar etapa
            </button>
          </div>

          <!-- pipeline vindo de pecasEtapas -->
          <div class="etapas-pipeline" v-if="pecaDetalhes.pecasEtapas && pecaDetalhes.pecasEtapas.length > 0">
            <template v-for="(etapa, idx) in pecaDetalhes.pecasEtapas" :key="idx">
              <div class="etapa-node" :class="getEtapaStatusByNome(etapa.descricao || etapa.etapa)">
                <div class="etapa-node-header">
                  <span class="etapa-index">{{ idx + 1 }}</span>
                  <span class="etapa-name">{{ etapa.descricao || etapa.etapa }}</span>
                  <span class="etapa-status-dot" :class="getEtapaStatusByNome(etapa.descricao || etapa.etapa)"></span>
                </div>
                <div class="etapa-node-info">
                  <span v-if="etapa.tempo_padrao">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {{ etapa.tempo_padrao }} min
                  </span>
                  <span>{{ getLiquidoEtapa(etapa.descricao || etapa.etapa) }} concluídos</span>
                </div>
              </div>
              <div v-if="idx < pecaDetalhes.pecasEtapas.length - 1" class="etapa-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </div>
            </template>
          </div>

          <!-- fallback: etapas vindas de somaPorEtapa -->
          <div class="etapas-pipeline" v-else-if="pecaDetalhes.somaPorEtapa">
            <template v-for="(soma, etapaNome, idx) in pecaDetalhes.somaPorEtapa" :key="etapaNome">
              <div class="etapa-node" :class="getEtapaStatusByLiquido(soma.liquido)">
                <div class="etapa-node-header">
                  <span class="etapa-index">{{ idx + 1 }}</span>
                  <span class="etapa-name">{{ etapaNome }}</span>
                  <span class="etapa-status-dot" :class="getEtapaStatusByLiquido(soma.liquido)"></span>
                </div>
                <div class="etapa-node-info">
                  <span>{{ soma.liquido }} concluídos</span>
                  <span v-if="soma.estornos > 0" class="etapa-estorno">{{ soma.estornos }} estornos</span>
                </div>
              </div>
              <div v-if="idx < Object.keys(pecaDetalhes.somaPorEtapa).length - 1" class="etapa-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </div>
            </template>
          </div>

          <p v-else class="empty-hint">Nenhuma etapa cadastrada para esta peça.</p>
        </div>

        <!-- ── Soma por Etapa (tabela resumo) ── -->
        <div class="section-card" v-if="pecaDetalhes.somaPorEtapa">
          <div class="section-header">
            <div class="section-title-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
              <h3>Resumo por Etapa</h3>
            </div>
          </div>
          <div class="table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>Etapa</th>
                  <th>Produzidos</th>
                  <th>Estornos</th>
                  <th>Líquido</th>
                  <th>Progresso</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(soma, etapaNome) in pecaDetalhes.somaPorEtapa" :key="etapaNome">
                  <td><span class="etapa-pill">{{ etapaNome }}</span></td>
                  <td><strong class="txt-green">{{ soma.positivos }}</strong></td>
                  <td>
                    <span v-if="soma.estornos > 0" class="txt-red">-{{ soma.estornos }}</span>
                    <span v-else class="txt-muted">—</span>
                  </td>
                  <td><strong>{{ soma.liquido }}</strong></td>
                  <td>
                    <div class="mini-bar-track">
                      <div
                        class="mini-bar-fill"
                        :style="{ width: Math.min(100, (soma.liquido / pecaDetalhes.quantidade_pecas) * 100) + '%' }"
                      ></div>
                    </div>
                    <span class="mini-pct">{{ Math.round((soma.liquido / pecaDetalhes.quantidade_pecas) * 100) }}%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── Gráficos ── -->
        <div class="charts-grid" v-if="graficoFuncionarios.length > 1 || graficoEtapas.length > 1">
          <div class="section-card" v-if="graficoFuncionarios.length > 1">
            <div class="section-header">
              <div class="section-title-row">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <h3>Produção por Funcionário</h3>
              </div>
            </div>
            <GChart
              ref="chartFuncionariosRef"
              type="BarChart"
              :data="graficoFuncionarios"
              :options="chartOptsFuncionarios"
              style="width: 100%; height: 320px;"
            />
          </div>

          <div class="section-card" v-if="graficoEtapas.length > 1">
            <div class="section-header">
              <div class="section-title-row">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M4.93 4.93l1.41 1.41M18.66 18.66l1.41 1.41"/></svg>
                <h3>Produção por Etapa</h3>
              </div>
            </div>
            <GChart
              ref="chartEtapasRef"
              type="BarChart"
              :data="graficoEtapas"
              :options="chartOptsEtapas"
              style="width: 100%; height: 320px;"
            />
          </div>
        </div>

        <!-- ── Tabela detalhamento ── -->
        <div class="section-card" v-if="pecaDetalhes.producaoPorEtapa">
          <div class="section-header">
            <div class="section-title-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              <h3>Detalhamento por Etapa</h3>
            </div>
          </div>

          <div class="table-wrap">
            <table class="detail-table">
              <thead>
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
                    <td><span class="etapa-pill">{{ etapa }}</span></td>
                    <td>{{ registro.funcionario }}</td>
                    <td><strong>{{ registro.quantidade }}</strong></td>
                    <td>{{ formatarData(registro.data_inicio) }}</td>
                    <td class="hora-cell">{{ registro.hora_registro }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

      </div><!-- /page-body -->

      <!-- ══════════ MODAL NOVA ETAPA ══════════ -->
      <transition name="modal-fade">
        <div v-if="modalNovaEtapa" class="modal-backdrop" @click.self="fecharModal">
          <div class="modal-box">
            <div class="modal-header">
              <div class="modal-header-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M4.93 4.93l1.41 1.41M18.66 18.66l1.41 1.41"/></svg>
              </div>
              <div>
                <h4>Nova Etapa de Produção</h4>
                <p>Adicione uma nova etapa a esta peça</p>
              </div>
              <button class="modal-close" @click="fecharModal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="modal-body">
              <div class="modal-field">
                <label>Descrição da etapa</label>
                <div class="modal-input-wrap">
                  <svg class="modal-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                  <input
                    v-model="novaEtapa.descricao"
                    type="text"
                    placeholder="Ex: Costura, Revisão, Acabamento..."
                    @keyup.enter="salvarNovaEtapa"
                  />
                </div>
              </div>

              <div class="modal-field">
                <label>Tempo padrão (min)</label>
                <div class="modal-input-wrap">
                  <svg class="modal-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <input
                    v-model.number="novaEtapa.tempo_padrao"
                    type="number"
                    placeholder="Ex: 5"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-outline" @click="fecharModal">Cancelar</button>
              <button class="btn-primary" @click="salvarNovaEtapa" :disabled="salvandoEtapa">
                <svg v-if="!salvandoEtapa" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <div v-else class="btn-spinner"></div>
                {{ salvandoEtapa ? 'Salvando...' : 'Adicionar Etapa' }}
              </button>
            </div>
          </div>
        </div>
      </transition>

    </main>
  </div>
</template>

<script>
import SidebarNav from "@/components/Sidebar.vue";
import { GChart } from "vue-google-charts";
import { useAuthStore } from "@/store/store";
import api from "@/Axios";
import Swal from "sweetalert2";
import { exportarProducaoPDF } from "@/utils/functions/GerarPDFPeca";
import { exportarProducaoExcel } from "@/utils/functions/GerarExcel";

export default {
  name: "DetalhesProducao",
  components: { SidebarNav, GChart },

  data() {
    return {
      pecaDetalhes: null,
      graficoFuncionarios: [["Funcionário", "Quantidade"]],
      graficoEtapas: [["Etapa", "Produzido", "Faltando"]],

      modalNovaEtapa: false,
      salvandoEtapa: false,
      novaEtapa: { descricao: "", tempo_padrao: null },

      chartOptsFuncionarios: {
        legend: { position: "none" },
        colors: ["#0e6632"],
        bar: { groupWidth: "55%" },
        chartArea: { width: "75%", height: "80%" },
        hAxis: { textStyle: { color: "#4a7a5c" }, gridlines: { color: "#eef6f1" } },
        vAxis: { textStyle: { color: "#2d6644" } },
        backgroundColor: "transparent",
      },

      chartOptsEtapas: {
        isStacked: true,
        legend: { position: "bottom", textStyle: { color: "#4a7a5c" } },
        colors: ["#0e6632", "#d0edda"],
        bar: { groupWidth: "55%" },
        chartArea: { width: "75%", height: "75%" },
        hAxis: { textStyle: { color: "#4a7a5c" }, gridlines: { color: "#eef6f1" } },
        vAxis: { textStyle: { color: "#2d6644" } },
        backgroundColor: "transparent",
      },
    };
  },

  computed: {
    // Usa totalConcluido (peças que passaram por todas as etapas) para o progresso
    progressoPct() {
      if (!this.pecaDetalhes?.quantidade_pecas) return 0;
      return Math.min(
        100,
        Math.round((this.pecaDetalhes.totalConcluido / this.pecaDetalhes.quantidade_pecas) * 100)
      );
    },
  },

  methods: {
    async buscarEstatisticas() {
      try {
        const store = useAuthStore();
        const token = store.pegar_token;
        const { data } = await api.get(`/estatisticas/${this.$route.params.id}`, {
          headers: { Authorization: token },
        });
        this.pecaDetalhes = data.estatisticas;
        this.montarGraficos();
      } catch (err) {
        Swal.fire({ icon: "error", title: "Erro", text: "Não foi possível carregar as estatísticas.", confirmButtonColor: "#0e6632" });
      }
    },

    montarGraficos() {
      if (!this.pecaDetalhes) return;

      // Gráfico por funcionário — usa tempo_padrao_produzido como métrica
      if (this.pecaDetalhes.eficienciaPorFuncionario?.length) {
        this.graficoFuncionarios = [
          ["Funcionário", "Tempo produzido (min)"],
          ...this.pecaDetalhes.eficienciaPorFuncionario.map((f) => [f.nome, f.tempo_padrao_produzido]),
        ];
      }

      // Gráfico por etapa — usa somaPorEtapa (liquido vs faltando)
      if (this.pecaDetalhes.somaPorEtapa) {
        const etapas = Object.entries(this.pecaDetalhes.somaPorEtapa).map(([etapa, soma]) => [
          etapa,
          soma.liquido,
          Math.max(0, this.pecaDetalhes.quantidade_pecas - soma.liquido),
        ]);
        this.graficoEtapas = [["Etapa", "Produzido", "Faltando"], ...etapas];
      }
    },

    // Busca liquido na somaPorEtapa pelo nome da etapa (match parcial pois nome pode ter " (X min)")
    getLiquidoEtapa(nomeEtapa) {
      if (!this.pecaDetalhes?.somaPorEtapa) return 0;
      const key = Object.keys(this.pecaDetalhes.somaPorEtapa).find(
        (k) => k.toLowerCase().includes(nomeEtapa.toLowerCase()) || nomeEtapa.toLowerCase().includes(k.toLowerCase())
      );
      return key ? this.pecaDetalhes.somaPorEtapa[key].liquido : 0;
    },

    getEtapaStatusByNome(nomeEtapa) {
      const liquido = this.getLiquidoEtapa(nomeEtapa);
      return this.getEtapaStatusByLiquido(liquido);
    },

    getEtapaStatusByLiquido(liquido) {
      if (liquido >= this.pecaDetalhes.quantidade_pecas) return "etapa-node--done";
      if (liquido > 0) return "etapa-node--progress";
      return "etapa-node--pending";
    },

    getInitials(nome) {
      if (!nome) return "?";
      return nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    },

    // Retorna classe CSS baseada no valor de eficiência (ex: "64.17%")
    getEficienciaClass(pct) {
      const val = parseFloat(pct);
      if (val >= 70) return "eficiencia--alta";
      if (val >= 40) return "eficiencia--media";
      return "eficiencia--baixa";
    },

    abrirModalNovaEtapa() {
      this.novaEtapa = { descricao: "", tempo_padrao: null };
      this.modalNovaEtapa = true;
    },

    fecharModal() {
      this.modalNovaEtapa = false;
    },

    async salvarNovaEtapa() {
      if (!this.novaEtapa.descricao.trim()) {
        Swal.fire({ icon: "warning", title: "Atenção", text: "Informe a descrição da etapa.", confirmButtonColor: "#0e6632" });
        return;
      }
      this.salvandoEtapa = true;
      try {
        const store = useAuthStore();
        const token = store.pegar_token;
        
        await api.post(
          "/nova/etapa",
          {
            descricao: this.novaEtapa.descricao,
            id_da_op:  parseInt(this.$route.params.id),
            tempo_padrao: this.novaEtapa.tempo_padrao || 0,
          },
          { headers: { Authorization: token } }
        );
        this.fecharModal();
        Swal.fire({
          icon: "success",
          title: "Etapa adicionada!",
          text: `A etapa "${this.novaEtapa.descricao}" foi cadastrada com sucesso.`,
          timer: 2200,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        await this.buscarEstatisticas();
      } catch (err) {
        Swal.fire({ icon: "error", title: "Erro", text: "Não foi possível adicionar a etapa.", confirmButtonColor: "#0e6632" });
      } finally {
        this.salvandoEtapa = false;
      }
    },

    badgeClass(status) {
      return { nao_iniciado: "badge--gray", em_progresso: "badge--amber", coleta: "badge--blue", finalizado: "badge--green" }[status] || "badge--gray";
    },

    traduzStatus(status) {
      return { nao_iniciado: "Não iniciada", em_progresso: "Em andamento", coleta: "Aguardando coleta", finalizado: "Finalizada" }[status] || status;
    },

    formatarData(dataStr) {
      if (!dataStr) return "—";
      return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(dataStr));
    },

    async exportarPDF() {
      if (!this.pecaDetalhes) return;
      await exportarProducaoPDF(this.pecaDetalhes);
    },

    async exportarPlanilha() {
      if (!this.pecaDetalhes) return;
      await exportarProducaoExcel(this.pecaDetalhes);
    },
  },

  mounted() {
    this.buscarEstatisticas();
  },
};
</script>

<style scoped>

.detalhes-page {
  display: flex;
  min-height: 100vh;
}

.content-wrapper {
  flex: 1;
  padding-left: 220px;
  min-height: 100vh;
}

.page-body {
  margin: 0 auto;
  padding: 2rem 1.75rem 3rem;
}

/* ── Loading ── */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: 16px;
  color: #4a7a5c;
  font-size: 14px;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #b8dfc8;
  border-top-color: #0e6632;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Page Header ── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
}

.header-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #a8d8b8;
  color: #0a3d20;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 100px;
  margin-bottom: 8px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #052e14;
  margin: 0 0 10px;
  line-height: 1.2;
}

.header-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.meta-sep { color: #90bb9e; }
.meta-text { font-size: 13px; color: #2d6644; }

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}

.badge--gray   { background: #e0e0e0; color: #555; }
.badge--amber  { background: #fff3cd; color: #856404; }
.badge--blue   { background: #cfe2ff; color: #0a4988; }
.badge--green  { background: #b8dfc8; color: #0a3d20; }

.header-actions { display: flex; gap: 10px; flex-wrap: wrap; flex-shrink: 0; }

/* ── Buttons ── */
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border: 1.5px solid rgba(14, 102, 50, 0.35);
  background: #fff;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #0e6632;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover { background: #d0edda; border-color: #0e6632; }

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  background: #0e6632;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(14, 102, 50, 0.3);
  transition: all 0.2s;
}

.btn-primary:hover { background: #0a4d26; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

/* ── KPI Grid ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid rgba(10, 80, 40, 0.12);
  border-radius: 16px;
  padding: 1.1rem 1.25rem;
  box-shadow: 0 2px 10px rgba(10, 80, 40, 0.06);
}

.kpi-card--highlight {
  border-color: rgba(14, 102, 50, 0.3);
  background: linear-gradient(135deg, #fff 60%, #f0faf4);
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-icon--green  { background: #d0edda; color: #0e6632; }
.kpi-icon--blue   { background: #dbeafe; color: #1d4ed8; }
.kpi-icon--amber  { background: #fef3c7; color: #b45309; }
.kpi-icon--teal   { background: #ccfbf1; color: #0f766e; }

.kpi-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #4a7a5c;
  font-weight: 500;
  margin: 0 0 2px;
}

.kpi-value {
  font-family: "Syne", sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #052e14;
  margin: 0;
  line-height: 1.1;
}

.kpi-value--efficiency { color: #0e6632; font-size: 22px; }
.kpi-value--sm { font-size: 16px; }

.kpi-sub {
  font-size: 11px;
  color: #7aaa8c;
  margin: 2px 0 0;
}

/* ── Progress ── */
.progress-card {
  background: #fff;
  border: 1px solid rgba(10, 80, 40, 0.12);
  border-radius: 16px;
  padding: 1.1rem 1.5rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 2px 10px rgba(10, 80, 40, 0.06);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-header-left { display: flex; flex-direction: column; gap: 2px; }
.progress-label { font-size: 13px; font-weight: 500; color: #2d6644; }
.progress-sub   { font-size: 11px; color: #7aaa8c; }
.progress-pct   { font-family: "Syne", sans-serif; font-size: 20px; font-weight: 700; color: #0e6632; }

.progress-bar-track {
  height: 10px;
  background: #eef6f1;
  border-radius: 100px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a8a46, #0e6632);
  border-radius: 100px;
  transition: width 0.9s ease;
}

/* ── Section Card ── */
.section-card {
  background: #fff;
  border: 1px solid rgba(10, 80, 40, 0.12);
  border-radius: 20px;
  padding: 1.5rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 2px 12px rgba(10, 80, 40, 0.06);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eef6f1;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0e6632;
}

.section-title-row h3 {
  font-family: "Syne", sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #052e14;
  margin: 0;
}

.btn-add-etapa {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #d0edda;
  border: 1.5px solid rgba(14, 102, 50, 0.3);
  border-radius: 8px;
  font-family: "DM Sans", sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #0a3d20;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-etapa:hover { background: #b8dfc8; border-color: #0e6632; }

/* ── Eficiência por Funcionário ── */
.eficiencia-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.eficiencia-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.eficiencia-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #d0edda;
  border: 2px solid #1a8a46;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #0a3d20;
  flex-shrink: 0;
}

.eficiencia-info { flex: 1; min-width: 0; }

.eficiencia-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.eficiencia-nome {
  font-size: 14px;
  font-weight: 500;
  color: #052e14;
}

.eficiencia-pct {
  font-family: "Syne", sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 100px;
}

.eficiencia--alta  { background: #d0edda; color: #0a3d20; }
.eficiencia--media { background: #fef3c7; color: #856404; }
.eficiencia--baixa { background: #fee2e2; color: #991b1b; }

.eficiencia-bar-track {
  height: 6px;
  background: #eef6f1;
  border-radius: 100px;
  overflow: hidden;
  margin-bottom: 5px;
}

.eficiencia-bar-fill {
  height: 100%;
  border-radius: 100px;
  transition: width 0.8s ease;
}

.eficiencia-bar-fill.eficiencia--alta  { background: linear-gradient(90deg, #1a8a46, #0e6632); }
.eficiencia-bar-fill.eficiencia--media { background: linear-gradient(90deg, #f59e0b, #d97706); }
.eficiencia-bar-fill.eficiencia--baixa { background: linear-gradient(90deg, #f87171, #dc2626); }

.eficiencia-bottom {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #7aaa8c;
}

.eficiencia-tempo { color: #4a7a5c; font-weight: 500; }

/* ── Etapas Pipeline ── */
.etapas-pipeline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.etapa-node {
  border-radius: 12px;
  padding: 10px 14px;
  border: 1.5px solid;
  min-width: 130px;
  transition: transform 0.18s;
}

.etapa-node:hover { transform: translateY(-2px); }

.etapa-node--done     { background: #d0edda; border-color: #1a8a46; }
.etapa-node--progress { background: #fef3c7; border-color: #d97706; }
.etapa-node--pending  { background: #f5f8f6; border-color: rgba(10, 80, 40, 0.18); }

.etapa-node-header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}

.etapa-index {
  width: 20px;
  height: 20px;
  background: rgba(14, 102, 50, 0.12);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #0a3d20;
  flex-shrink: 0;
}

.etapa-node--progress .etapa-index { background: rgba(217, 119, 6, 0.15); color: #92400e; }
.etapa-node--pending .etapa-index  { background: #e4f0e8; color: #4a7a5c; }

.etapa-name { font-size: 13px; font-weight: 600; color: #052e14; flex: 1; }
.etapa-node--pending .etapa-name  { color: #4a7a5c; }
.etapa-node--progress .etapa-name { color: #78350f; }

.etapa-status-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.etapa-status-dot.etapa-node--done     { background: #0e6632; }
.etapa-status-dot.etapa-node--progress { background: #d97706; }
.etapa-status-dot.etapa-node--pending  { background: #b8dfc8; }

.etapa-node-info { display: flex; gap: 10px; font-size: 11px; color: #4a7a5c; }
.etapa-node--progress .etapa-node-info { color: #92400e; }
.etapa-node-info svg { vertical-align: middle; }
.etapa-estorno { color: #dc2626; font-weight: 500; }

.etapa-arrow { color: #90bb9e; flex-shrink: 0; }
.empty-hint  { font-size: 13px; color: #90bb9e; font-style: italic; margin: 0; }

/* ── Charts grid ── */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

/* ── Tables ── */
.table-wrap { overflow-x: auto; }

.detail-table {
  width: 100%;
  text-align: justify;
  border-collapse: collapse;
  font-size: 13px;
}

.detail-table thead tr { background: #eef6f1; }

.detail-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  color: #2d6644;
  border-bottom: 2px solid #d0edda;
}

.detail-table td {
  padding: 10px 14px;
  color: #0f1f16;
  border-bottom: 1px solid #eef6f1;
}

.detail-table tbody tr:hover { background: #f5faf7; }

.etapa-pill {
  display: inline-flex;
  padding: 3px 10px;
  background: #d0edda;
  color: #0a3d20;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}

.hora-cell  { color: #4a7a5c; font-size: 12px; }
.txt-green  { color: #0e6632; }
.txt-red    { color: #dc2626; }
.txt-muted  { color: #90bb9e; }

/* Mini progress bar inside table */
.mini-bar-track {
  height: 5px;
  background: #eef6f1;
  border-radius: 100px;
  overflow: hidden;
  width: 80px;
  display: inline-block;
  vertical-align: middle;
  margin-right: 6px;
}

.mini-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a8a46, #0e6632);
  border-radius: 100px;
  transition: width 0.6s ease;
}

.mini-pct { font-size: 11px; color: #4a7a5c; font-weight: 500; vertical-align: middle; }

/* ══════════ MODAL ══════════ */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 46, 20, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 1rem;
}

.modal-box {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(5, 46, 20, 0.25);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #eef6f1;
}

.modal-header-icon {
  width: 42px; height: 42px;
  background: #d0edda;
  border: 1px solid rgba(14, 102, 50, 0.2);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #0e6632; flex-shrink: 0;
}

.modal-header h4 {
  font-family: "Syne", sans-serif;
  font-size: 16px; font-weight: 700; color: #052e14; margin: 0;
}

.modal-header p { font-size: 12px; color: #4a7a5c; margin: 2px 0 0; }

.modal-close {
  margin-left: auto;
  background: #eef6f1; border: none; border-radius: 8px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  color: #4a7a5c; cursor: pointer; transition: background 0.2s, color 0.2s; flex-shrink: 0;
}

.modal-close:hover { background: #d0edda; color: #0e6632; }

.modal-body {
  padding: 1.5rem;
  display: flex; flex-direction: column; gap: 1rem;
}

.modal-field { display: flex; flex-direction: column; gap: 6px; }

.modal-field label {
  font-size: 12px; font-weight: 500; color: #2d6644; letter-spacing: 0.02em;
}

.modal-input-wrap {
  position: relative; display: flex; align-items: center;
}

.modal-input-icon {
  position: absolute; left: 13px; color: #1a8a46; pointer-events: none;
}

.modal-input-wrap input {
  width: 100%; height: 46px;
  background: #eef6f1;
  border: 1.5px solid rgba(10, 80, 40, 0.2);
  border-radius: 10px;
  padding: 0 14px 0 40px;
  font-family: "DM Sans", sans-serif; font-size: 14px; color: #0f1f16;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.modal-input-wrap input:focus {
  border-color: #1a8a46;
  box-shadow: 0 0 0 3px rgba(26, 138, 70, 0.14);
  background: #fff;
}

.modal-input-wrap input::placeholder { color: #90bb9e; }

.modal-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 1rem 1.5rem;
  border-top: 1px solid #eef6f1;
  background: #f9fcfa;
}

.modal-fade-enter-active { transition: all 0.25s ease; }
.modal-fade-leave-active { transition: all 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-box, .modal-fade-leave-to .modal-box { transform: scale(0.95) translateY(10px); }

.btn-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ── Responsivo ── */
@media (max-width: 1024px) {
  .charts-grid { grid-template-columns: 1fr; }
  .kpi-grid    { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 768px) {
  .content-wrapper { padding-left: 0; }
  .page-body       { padding: 1.25rem 1rem 2rem; }
  .page-header     { flex-direction: column; }
  .header-actions  { width: 100%; justify-content: flex-start; }
  .kpi-grid        { grid-template-columns: 1fr 1fr; }
  .etapas-pipeline { flex-direction: column; align-items: flex-start; }
  .etapa-arrow     { transform: rotate(90deg); }
  .eficiencia-bottom { flex-direction: column; gap: 2px; }
}

@media (max-width: 480px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .eficiencia-top { flex-direction: column; align-items: flex-start; gap: 4px; }
}
</style>