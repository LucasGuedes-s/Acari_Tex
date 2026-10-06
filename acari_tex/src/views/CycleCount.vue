<template>
  <div class="d-flex flex-column flex-xl-row">
    <SidebarNav style="z-index: 1" />

    <main class="content-wrapper flex-grow-1">
      <div v-if="loadingInicial" class="d-flex justify-content-center align-items-center min-vh-100">
        <CarregandoTela />
      </div>

      <div v-else class="container-fluid my-4 mt-md-0 mt-3">
        <!-- Cabeçalho -->
        <TituloSubtitulo
          titulo="CycleCount"
          subtitulo="Monitoramento da produção por visão computacional"
        />

        <div class="cc-acoes">
          <button class="botao-acao" @click="abrirModalNovaSessao">
            <i class="bi bi-plus-lg"></i> Nova sessão
          </button>
          <button class="botao-acao botao-secundario" :disabled="atualizando" @click="atualizarTudo">
            <span v-if="atualizando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <i v-else class="bi bi-arrow-clockwise"></i>
            {{ atualizando ? 'Atualizando...' : 'Atualizar' }}
          </button>
        </div>

        <!-- Cards de resumo -->
        <div class="row g-3 mb-4">
          <div class="col-6 col-lg-3">
            <div class="cc-resumo-card">
              <span class="cc-resumo-valor">{{ sessoesAtivas.length }}</span>
              <span class="cc-resumo-label">Sessões ativas</span>
            </div>
          </div>
          <div class="col-6 col-lg-3">
            <div class="cc-resumo-card">
              <span class="cc-resumo-valor">{{ estacoesMonitoradas }}</span>
              <span class="cc-resumo-label">Estações monitoradas</span>
            </div>
          </div>
          <div class="col-6 col-lg-3">
            <div class="cc-resumo-card">
              <span class="cc-resumo-valor">{{ eventosHoje }}</span>
              <span class="cc-resumo-label">Eventos recebidos</span>
            </div>
          </div>
          <div class="col-6 col-lg-3">
            <div class="cc-resumo-card">
              <span class="cc-integracao" :class="classeIntegracao">
                <span class="cc-dot"></span> {{ labelIntegracao }}
              </span>
              <span class="cc-resumo-label">Integração</span>
            </div>
          </div>
        </div>

        <!-- Sessões em andamento -->
        <section class="mb-4">
          <h4 class="cc-secao-titulo">Sessões em andamento</h4>

          <div v-if="carregandoSessoes" class="text-center py-4">
            <div class="spinner-border text-success" role="status">
              <span class="visually-hidden">Carregando...</span>
            </div>
          </div>

          <div v-else-if="sessoesAtivas.length === 0" class="cc-vazio">
            Nenhuma sessão ativa. Crie uma sessão para começar a monitorar uma estação.
          </div>

          <div v-else class="row g-3">
            <div v-for="sessao in sessoesAtivas" :key="sessao.id" class="col-12 col-md-6 col-xl-4">
              <CycleCountSessionCard
                :sessao="sessao"
                :nome-funcionario="nomeFuncionario(sessao.operator_id)"
                @ver-detalhes="abrirDetalhes"
                @encerrar="confirmarEncerramento"
              />
            </div>
          </div>
        </section>

        <!-- Detalhes da sessão selecionada -->
        <section v-if="sessaoSelecionada" class="mb-4">
          <div class="cc-detalhes">
            <div class="cc-detalhes-header">
              <h4 class="cc-secao-titulo mb-0">Detalhes da sessão</h4>
              <button class="cc-btn-fechar" @click="fecharDetalhes">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <div class="cc-detalhes-grid">
              <div class="cc-info">
                <span class="cc-info-label">Sessão</span>
                <span class="cc-info-valor cc-mono">{{ sessaoSelecionada.id }}</span>
              </div>
              <div class="cc-info">
                <span class="cc-info-label">Estação</span>
                <span class="cc-info-valor">{{ sessaoSelecionada.station_id }}</span>
              </div>
              <div class="cc-info">
                <span class="cc-info-label">Funcionário</span>
                <span class="cc-info-valor">
                  {{ nomeFuncionario(sessaoSelecionada.operator_id) || sessaoSelecionada.operator_id }}
                </span>
              </div>
              <div class="cc-info">
                <span class="cc-info-label">OP</span>
                <span class="cc-info-valor">{{ sessaoSelecionada.op_id ?? '-' }}</span>
              </div>
              <div class="cc-info">
                <span class="cc-info-label">Operação</span>
                <span class="cc-info-valor">{{ sessaoSelecionada.operation || '-' }}</span>
              </div>
              <div class="cc-info">
                <span class="cc-info-label">Status</span>
                <span class="cc-badge-estado" :class="sessaoSelecionada.ativa ? 'cc-estado-confirmado' : 'cc-estado-outro'">
                  {{ sessaoSelecionada.status }}
                </span>
              </div>
              <div class="cc-info">
                <span class="cc-info-label">Iniciada em</span>
                <span class="cc-info-valor">{{ formatarDataHora(sessaoSelecionada.started_at) }}</span>
              </div>
            </div>

            <div class="mt-3">
              <CycleCountHealth
                :key="`health-${sessaoSelecionada.id}`"
                :station-id="sessaoSelecionada.station_id"
                :token="token"
              />
            </div>

            <div class="mt-3" v-if="sessaoSelecionada.id">
              <CycleCountEvents
                :key="`eventos-${sessaoSelecionada.id}`"
                :session-id="sessaoSelecionada.id"
                :token="token"
              />
            </div>

            <div class="mt-3 d-flex gap-2 flex-wrap" v-if="sessaoSelecionada.ativa">
              <button class="botao-acao botao-improdutivo" @click="confirmarEncerramento(sessaoSelecionada)">
                <i class="bi bi-stop-circle"></i> Encerrar sessão
              </button>
            </div>
          </div>
        </section>

        <!-- Histórico de sessões -->
        <section class="mb-4">
          <h4 class="cc-secao-titulo">Histórico de sessões</h4>

          <div class="cc-filtros">
            <input
              v-model.trim="filtros.estacao"
              type="text"
              class="cc-filtro-input"
              placeholder="Estação"
            />
            <input
              v-model.trim="filtros.funcionario"
              type="text"
              class="cc-filtro-input"
              placeholder="Funcionário"
            />
            <input
              v-model.number="filtros.op"
              type="number"
              class="cc-filtro-input cc-filtro-num"
              placeholder="OP"
            />
            <select v-model="filtros.status" class="cc-filtro-input">
              <option value="">Status: todos</option>
              <option value="ativa">Ativa</option>
              <option value="encerrada">Encerrada</option>
            </select>
            <input v-model="filtros.dataInicio" type="date" class="cc-filtro-input" />
            <input v-model="filtros.dataFim" type="date" class="cc-filtro-input" />
          </div>

          <div v-if="carregandoSessoes" class="text-center py-4">
            <div class="spinner-border text-success" role="status">
              <span class="visually-hidden">Carregando...</span>
            </div>
          </div>

          <div v-else-if="sessoesFiltradas.length === 0" class="cc-vazio">
            Nenhuma sessão encontrada com os filtros atuais.
          </div>

          <div v-else class="table-responsive cc-tabela-wrap">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Estação</th>
                  <th>Funcionário</th>
                  <th>OP</th>
                  <th>Operação</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="sessao in sessoesFiltradas"
                  :key="sessao.id"
                  class="cc-linha-clicavel"
                  @click="abrirDetalhes(sessao)"
                >
                  <td class="cc-mono">{{ sessao.station_id }}</td>
                  <td>{{ nomeFuncionario(sessao.operator_id) || sessao.operator_id }}</td>
                  <td>#{{ sessao.op_id ?? '-' }}</td>
                  <td>{{ sessao.operation || '-' }}</td>
                  <td>{{ formatarDataHora(sessao.started_at) }}</td>
                  <td>{{ formatarDataHora(sessao.closed_at) }}</td>
                  <td>
                    <span class="cc-badge-estado" :class="sessao.ativa ? 'cc-estado-confirmado' : 'cc-estado-outro'">
                      {{ sessao.ativa ? 'Ativa' : 'Encerrada' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- Modal nova sessão -->
      <CycleCountSessionModal
        v-if="modalAberto"
        :funcionarios="funcionarios"
        :ops="ops"
        :etapas-estabelecimento="etapas"
        :token="token"
        @fechar="modalAberto = false"
        @criada="aoCriarSessao"
      />
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import TituloSubtitulo from '@/components/TituloSubtitulo.vue';
import CarregandoTela from '@/components/carregandoTela.vue';
import CycleCountSessionCard from '@/components/cyclecount/CycleCountSessionCard.vue';
import CycleCountSessionModal from '@/components/cyclecount/CycleCountSessionModal.vue';
import CycleCountHealth from '@/components/cyclecount/CycleCountHealth.vue';
import CycleCountEvents from '@/components/cyclecount/CycleCountEvents.vue';

import api from '@/Axios';
import { useAuthStore } from '@/store/store';
import Swal from 'sweetalert2';
import router from '@/router';
import {
  listarSessoes,
  buscarSessaoPorEstacao,
  encerrarSessao,
  listarEventos,
  buscarHealth,
  extrairLista,
  normalizarSessao,
  normalizarEvento,
  normalizarHealthGeral,
} from '@/services/cycleCountService';

export default {
  name: 'CycleCountView',

  components: {
    SidebarNav,
    TituloSubtitulo,
    CarregandoTela,
    CycleCountSessionCard,
    CycleCountSessionModal,
    CycleCountHealth,
    CycleCountEvents,
  },

  data() {
    return {
      store: useAuthStore(),
      loadingInicial: true,
      atualizando: false,
      carregandoSessoes: false,

      sessoes: [],
      funcionarios: [],
      ops: [],
      etapas: [],

      healthGeral: null,
      eventosHoje: 0,

      sessaoSelecionada: null,
      modalAberto: false,

      filtros: {
        estacao: '',
        funcionario: '',
        op: '',
        status: '',
        dataInicio: '',
        dataFim: '',
      },

      timerAtualizacao: null,
    };
  },

  computed: {
    token() {
      return this.store.pegar_token;
    },

    sessoesAtivas() {
      return this.sessoes.filter((s) => s.ativa);
    },

    estacoesMonitoradas() {
      return new Set(this.sessoesAtivas.map((s) => s.station_id)).size;
    },

    classeIntegracao() {
      const estado = this.healthGeral || 'offline';
      return `cc-integracao-${estado}`;
    },

    labelIntegracao() {
      const labels = { online: 'Online', atencao: 'Atenção', offline: 'Offline' };
      return labels[this.healthGeral || 'offline'];
    },

    sessoesFiltradas() {
      const { estacao, funcionario, op, status, dataInicio, dataFim } = this.filtros;
      return this.sessoes.filter((s) => {
        if (estacao && !String(s.station_id).toLowerCase().includes(estacao.toLowerCase())) return false;
        if (funcionario) {
          const nome = (this.nomeFuncionario(s.operator_id) || s.operator_id || '').toLowerCase();
          if (!nome.includes(funcionario.toLowerCase())) return false;
        }
        if (op !== '' && op !== null && Number(s.op_id) !== Number(op)) return false;
        if (status === 'ativa' && !s.ativa) return false;
        if (status === 'encerrada' && s.ativa) return false;
        if (dataInicio && s.started_at && new Date(s.started_at) < new Date(`${dataInicio}T00:00:00`)) return false;
        if (dataFim && s.started_at && new Date(s.started_at) > new Date(`${dataFim}T23:59:59`)) return false;
        return true;
      });
    },
  },

  mounted() {
    this.verificarAutenticacao();
    this.inicializar();
  },

  beforeUnmount() {
    if (this.timerAtualizacao) clearInterval(this.timerAtualizacao);
  },

  methods: {
    verificarAutenticacao() {
      if (!this.token || !this.store.pegar_usuario) router.push('/');
    },

    async inicializar() {
      this.loadingInicial = true;
      await Promise.all([
        this.carregarSessoes(),
        this.carregarHealth(),
        this.carregarFuncionarios(),
        this.carregarOps(),
        this.carregarEtapas(),
        this.contarEventosHoje(),
      ]);
      this.loadingInicial = false;

      // Atualização automática a cada 30s (sessões + health + eventos de hoje)
      this.timerAtualizacao = setInterval(() => {
        this.carregarSessoes();
        this.carregarHealth();
        this.contarEventosHoje();
      }, 30000);
    },

    async atualizarTudo() {
      this.atualizando = true;
      await Promise.all([
        this.carregarSessoes(),
        this.carregarHealth(),
        this.contarEventosHoje(),
      ]);
      if (this.sessaoSelecionada) this.abrirDetalhes(this.sessaoSelecionada);
      this.atualizando = false;
    },

    async carregarSessoes() {
      this.carregandoSessoes = true;
      try {
        const { data } = await listarSessoes(this.token);
        this.sessoes = extrairLista(data, 'sessions', 'sessoes', 'data', 'items')
          .map(normalizarSessao);
      } catch (err) {
        console.error('Erro ao carregar sessões CycleCount:', err);
        if (!this.sessoes.length) this.sessoes = [];
      } finally {
        this.carregandoSessoes = false;
      }
    },

    async carregarHealth() {
      try {
        const { data } = await buscarHealth();
        this.healthGeral = normalizarHealthGeral(data);
      } catch (err) {
        console.error('Erro ao consultar health CycleCount:', err);
        this.healthGeral = 'offline';
      }
    },

    async contarEventosHoje() {
      try {
        // Consulta o total de eventos; o back-end limita a resposta, então
        // usamos apenas a contagem exibida — sem inventar dados.
        const { data } = await listarEventos({ limit: 1 }, this.token);
        const total = data.total ?? data.count ?? data.totalEvents;
        if (total !== undefined && total !== null) {
          this.eventosHoje = Number(total);
        } else {
          // Sem total disponível: conta os eventos do dia na primeira página.
          const resp = await listarEventos({ limit: 200 }, this.token);
          const eventos = extrairLista(resp.data, 'events', 'eventos', 'data', 'items')
            .map(normalizarEvento);
          const hoje = new Date().toDateString();
          this.eventosHoje = eventos.filter(
            (e) => e.timestamp && new Date(e.timestamp).toDateString() === hoje
          ).length;
        }
      } catch (err) {
        console.error('Erro ao contar eventos de hoje:', err);
      }
    },

    async carregarFuncionarios() {
      try {
        const { data } = await api.get('/Funcionarios', {
          headers: { Authorization: this.token },
        });
        this.funcionarios = (data.funcionarios || []).map((f) => ({
          nome: f.nome,
          email: f.email ? String(f.email).toLowerCase().trim() : '',
        }));
      } catch (err) {
        console.error('Erro ao carregar funcionários:', err);
      }
    },

    async carregarOps() {
      try {
        const { data } = await api.get('/pecas', {
          headers: { Authorization: this.token },
        });
        const peca = data.peca || {};
        const todas = [
          ...(peca.em_progresso || []),
          ...(peca.nao_iniciado || []),
        ];
        const vistas = new Set();
        this.ops = todas.filter((p) => {
          if (!p.id_da_op || vistas.has(p.id_da_op)) return false;
          vistas.add(p.id_da_op);
          return true;
        });
      } catch (err) {
        console.error('Erro ao carregar OPs:', err);
      }
    },

    async carregarEtapas() {
      try {
        const { data } = await api.get('/etapas/estabelecimento', {
          headers: { Authorization: this.token },
        });
        this.etapas = data.etapa || [];
      } catch (err) {
        console.error('Erro ao carregar etapas:', err);
      }
    },

    nomeFuncionario(email) {
      if (!email) return '';
      const f = this.funcionarios.find(
        (x) => (x.email || '').toLowerCase() === String(email).toLowerCase()
      );
      return f?.nome || '';
    },

    formatarDataHora(data) {
      if (!data) return '-';
      const d = new Date(data);
      if (isNaN(d.getTime())) return String(data);
      return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    },

    abrirModalNovaSessao() {
      this.modalAberto = true;
    },

    async aoCriarSessao({ station_id }) {
      this.modalAberto = false;
      await Promise.all([
        this.carregarSessoes(),
        this.carregarHealth(),
      ]);

      // Mostra a sessão recém-criada e consulta o health da estação.
      const nova = this.sessoes.find(
        (s) => s.ativa && s.station_id === station_id
      );
      if (nova) this.abrirDetalhes(nova);
    },

    async abrirDetalhes(sessao) {
      try {
        // Busca a sessão ativa da estação para garantir dados atualizados.
        const { data } = await buscarSessaoPorEstacao(sessao.station_id, this.token);
        const detalhada = data?.session || data?.sessao || data;
        if (detalhada && (detalhada.session_id || detalhada.id)) {
          const normalizada = normalizarSessao(detalhada);
          // Só usa a resposta se for a mesma sessão clicada.
          if (normalizada.id === sessao.id) {
            const idx = this.sessoes.findIndex((s) => s.id === sessao.id);
            if (idx !== -1) this.sessoes.splice(idx, 1, normalizada);
            this.sessaoSelecionada = normalizada;
            return;
          }
        }
      } catch {
        // 404 = sem sessão ativa para a estação; segue com os dados locais.
      }
      this.sessaoSelecionada = sessao;
    },

    fecharDetalhes() {
      this.sessaoSelecionada = null;
    },

    async confirmarEncerramento(sessao) {
      const resultado = await Swal.fire({
        title: 'Encerrar sessão?',
        text: 'A estação deixará de registrar eventos nesta sessão. Os eventos já registrados serão preservados.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#b32d00',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Encerrar sessão',
        cancelButtonText: 'Cancelar',
      });

      if (!resultado.isConfirmed) return;

      try {
        await encerrarSessao(sessao.station_id, this.token);
        Swal.fire({
          icon: 'success',
          title: 'Sessão encerrada com sucesso.',
          timer: 1800,
          showConfirmButton: false,
        });
        this.sessaoSelecionada = null;
        await this.carregarSessoes();
      } catch (err) {
        console.error('Erro ao encerrar sessão:', err);
        Swal.fire({
          icon: 'error',
          title: 'Erro ao encerrar',
          text: err?.response?.data?.message || 'Não foi possível encerrar a sessão.',
          confirmButtonColor: '#0e6632',
        });
      }
    },
  },
};
</script>

<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
}

@media (max-width: 1025px) {
  .content-wrapper {
    padding-left: 0;
  }
}

.cc-acoes {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.botao-acao {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #14532d;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: 0.2s;
}

.botao-acao:hover:not(:disabled) {
  background: #06642a;
}

.botao-acao:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.botao-secundario {
  background: #ffffff;
  color: #14532d;
  border: 1px solid #d1d5db;
}

.botao-secundario:hover:not(:disabled) {
  background: #f3f4f6;
}

.botao-improdutivo {
  background: #b32d00 !important;
}

.botao-improdutivo:hover {
  background: #7a1f00 !important;
}

/* Resumo */
.cc-resumo-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
  height: 100%;
}

.cc-resumo-valor {
  font-size: 28px;
  font-weight: 800;
  color: #14532d;
  line-height: 1.1;
}

.cc-resumo-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6b7280;
  font-weight: 600;
}

.cc-integracao {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 18px;
  font-weight: 800;
}

.cc-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.cc-integracao-online {
  color: #0a8a38;
}

.cc-integracao-atencao {
  color: #b45309;
}

.cc-integracao-offline {
  color: #b91c1c;
}

.cc-dot {
  animation: pulsar 1.6s infinite ease-in-out;
}

@keyframes pulsar {
  0% { opacity: 1; }
  50% { opacity: 0.35; }
  100% { opacity: 1; }
}

/* Seções */
.cc-secao-titulo {
  font-size: 17px;
  font-weight: 700;
  color: #14532d;
  margin-bottom: 12px;
}

.cc-vazio {
  background: #f8fafc;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

/* Detalhes */
.cc-detalhes {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
}

.cc-detalhes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.cc-btn-fechar {
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  cursor: pointer;
}

.cc-btn-fechar:hover {
  background: #e2e8f0;
}

.cc-detalhes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px 18px;
}

.cc-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cc-info-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  font-weight: 600;
}

.cc-info-valor {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cc-mono {
  font-family: monospace;
}

.cc-badge-estado {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
}

.cc-estado-confirmado {
  background: #dcfce7;
  color: #166534;
}

.cc-estado-outro {
  background: #f1f5f9;
  color: #475569;
}

/* Filtros e tabela */
.cc-filtros {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.cc-filtro-input {
  padding: 8px 12px;
  border: 1px solid #d6d6d6;
  border-radius: 10px;
  font-size: 14px;
  background: #fdfdfd;
  min-width: 130px;
}

.cc-filtro-num {
  min-width: 90px;
}

.cc-filtro-input:focus {
  border-color: #0a8a38;
  outline: none;
  box-shadow: 0 0 0 3px rgba(10, 138, 56, 0.15);
}

.cc-tabela-wrap {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 6px 14px;
}

.table {
  font-size: 13px;
}

.table th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  font-weight: 700;
  border-bottom: 1px solid #e5e7eb;
}

.table td {
  color: #374151;
}

.cc-linha-clicavel {
  cursor: pointer;
}
</style>
