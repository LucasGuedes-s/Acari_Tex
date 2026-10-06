import api from '@/Axios';

/**
 * Service do módulo CycleCount / Visão Computacional.
 *
 * Todas as chamadas ao back-end relacionadas a sessões, eventos e health
 * ficam centralizadas aqui. Nenhuma view/componente deve chamar Axios
 * diretamente para este módulo.
 *
 * O token é o mesmo JWT já utilizado pelo Linha Tex (Pinia -> pegar_token),
 * enviado no header seguindo o padrão existente do projeto.
 */

function headers(token) {
  return { Authorization: token };
}

// ── Sessões ──────────────────────────────────────────────────────────────

export async function criarSessao(dados, token) {
  return api.post('/cyclecount/sessions', dados, { headers: headers(token) });
}

export async function listarSessoes(token) {
  return api.get('/cyclecount/sessions', { headers: headers(token) });
}

export async function buscarSessaoPorEstacao(stationId, token) {
  return api.get(`/cyclecount/sessions/${stationId}`, { headers: headers(token) });
}

export async function encerrarSessao(stationId, token) {
  return api.delete(`/cyclecount/sessions/${stationId}`, { headers: headers(token) });
}

// ── Eventos ──────────────────────────────────────────────────────────────

// Filtros aceitos: session_id, state, operator_id, limit
export async function listarEventos(params = {}, token) {
  return api.get('/cyclecount/events', { params, headers: headers(token) });
}

// ── Health ───────────────────────────────────────────────────────────────

// Rota pública (sem Authorization), usada para o status geral da integração.
export async function buscarHealth() {
  return api.get('/cyclecount/health');
}

export async function buscarHealthEstacao(stationId, token) {
  return api.get(`/cyclecount/stations/${stationId}/health`, { headers: headers(token) });
}

// ── Normalização de dados ────────────────────────────────────────────────
// O front não inventa regras de negócio: apenas adapta nomes de campos
// vindos do back-end para exibição.

export function extrairLista(data, ...chaves) {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  for (const chave of chaves) {
    if (Array.isArray(data[chave])) return data[chave];
  }
  return [];
}

export function normalizarSessao(s = {}) {
  const statusBruto = String(
    s.status
    || (s.closed_at || s.encerrada_em || s.ended_at ? 'ENCERRADA' : 'ATIVA')
  ).toUpperCase();

  return {
    id: s.session_id || s.id || s.sid || '',
    station_id: s.station_id || s.stationId || s.estacao || '',
    operator_id: s.operator_id || s.operatorId || s.funcionario || '',
    op_id: s.op_id ?? s.opId ?? null,
    operation: s.operation || s.operacao || s.etapa || '',
    started_at: s.started_at || s.iniciada_em || s.start_time || s.inicio || null,
    closed_at: s.closed_at || s.encerrada_em || s.ended_at || s.fim || null,
    status: statusBruto,
    ativa: ['ATIVA', 'ACTIVE', 'OPEN', 'ABERTA'].includes(statusBruto),
    event_count: s.event_count ?? s.events_count ?? s.total_eventos ?? null,
  };
}

export function normalizarEvento(e = {}) {
  const production = e.production || e.producao || null;
  const confidenceBruta = e.confidence ?? e.confianca ?? e.confidence_score ?? null;

  let confidence = null;
  if (confidenceBruta !== null && confidenceBruta !== undefined && !isNaN(Number(confidenceBruta))) {
    const valor = Number(confidenceBruta);
    confidence = valor <= 1 ? Math.round(valor * 100) : Math.round(valor);
  }

  return {
    id: e.event_id || e.id || e.uuid || '',
    session_id: e.session_id || e.sessionId || '',
    operator_id: e.operator_id || e.operatorId || '',
    type: e.type || e.tipo || 'event',
    state: String(e.state || e.estado || e.status || '-').toUpperCase(),
    cycle: e.cycle_number ?? e.cycle ?? e.ciclo ?? null,
    cycle_completed: e.cycle_completed ?? e.ciclo_completo ?? false,
    confidence,
    timestamp: e.created_at || e.received_at || e.timestamp || e.hora_evento || e.data_evento || null,
    production,
  };
}

/**
 * Converte a resposta do health geral em: 'online' | 'atencao' | 'offline'.
 * HTTP 200 sem campo de status explícito => integração respondendo (online).
 */
export function normalizarHealthGeral(data = {}) {
  const bruto = String(data.status || data.state || data.health || '').toLowerCase();
  if (['degraded', 'warning', 'atencao', 'partial'].includes(bruto)) return 'atencao';
  if (['down', 'error', 'offline', 'fail', 'failed'].includes(bruto)) return 'offline';
  return 'online';
}

/**
 * Mapeia erros conhecidos do back-end para mensagens amigáveis.
 * 401 é tratado globalmente pelo interceptor de Axios.
 */
export function mensagemErroCycleCount(err) {
  const status = err?.response?.status;
  const msgBack = String(err?.response?.data?.message || '').toLowerCase();

  if (status === 404) {
    if (msgBack.includes('funcion')) {
      return 'O funcionário selecionado não foi encontrado neste estabelecimento.';
    }
    if (msgBack.includes('op')) {
      return 'OP não encontrada para este estabelecimento.';
    }
    return 'Sessão ativa não encontrada para esta estação.';
  }

  if (status === 409) {
    // Esperado pelo mecanismo de idempotência do CycleCount — não é falha grave.
    return 'Evento já processado.';
  }

  if (status === 400 && (msgBack.includes('etapa') || msgBack.includes('opera'))) {
    return 'A operação selecionada não está vinculada à OP escolhida.';
  }

  return err?.response?.data?.message || 'Erro inesperado ao comunicar com o CycleCount.';
}
