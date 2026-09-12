const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function logCycleEvent(eventId, sessionId, message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [CycleCount][Event: ${eventId || 'N/A'}][Session: ${sessionId || 'N/A'}] - ${message}`;
  if (level === 'error') {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════


function getBrazilDate() {
  const agora = new Date();
  const offsetBrasil = -3;
  const utc = agora.getTime() + agora.getTimezoneOffset() * 60000;
  const brasil = new Date(utc + 3600000 * offsetBrasil);
  return brasil;
}

function getDataInicio() {
  const brasil = getBrazilDate();
  brasil.setHours(0, 0, 0, 0);
  return brasil;
}

function getHoraRegistro(date, includeSeconds) {
  const brasil = date || getBrazilDate();
  const h = String(brasil.getHours()).padStart(2, '0');
  const m = String(brasil.getMinutes()).padStart(2, '0');
  if (includeSeconds) {
    const s = String(brasil.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  return `${h}:${m}`;
}

function getDataReferencia(date) {
  const brasil = date || getBrazilDate();
  brasil.setHours(0, 0, 0, 0);
  return brasil;
}

function normalizarTexto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

// ═══════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

async function createSession(body, cnpj) {
  const { station_id, operator_id, op_id, operation } = body;

  // Validate operator exists
  const funcionario = await prisma.usuarios.findFirst({
    where: { email: operator_id, estabelecimentoCnpj: cnpj },
  });
  if (!funcionario) {
    throw Object.assign(new Error('Funcionário não encontrado.'), { statusCode: 404, code: 'OPERATOR_NOT_FOUND' });
  }

  // Validate OP exists and belongs to establishment
  const op = await prisma.pecasOP.findFirst({
    where: { id_da_op: Number(op_id), id_Estabelecimento: cnpj },
  });
  if (!op) {
    throw Object.assign(new Error('OP não encontrada para este estabelecimento.'), { statusCode: 404, code: 'OP_NOT_FOUND' });
  }

  // ── Resolve operation (etapa) with multi-fallback strategy ──
  let operationId = null;

  // Strategy 1: Match by operation description in body
  if (operation) {
    const etapa = await prisma.etapa.findFirst({
      where: {
        descricao: operation,
        id_Estabelecimento: cnpj,
      },
    });
    if (etapa) {
      operationId = etapa.id_da_funcao;
    }
  }

  // Strategy 2: If no match, find first etapa associated with this OP
  if (!operationId) {
    const pecasEtapa = await prisma.pecasEtapas.findFirst({
      where: { id_da_op: Number(op_id) },
      include: { etapa: { select: { id_da_funcao: true, descricao: true } } },
    });
    if (pecasEtapa && pecasEtapa.etapa) {
      operationId = pecasEtapa.etapa.id_da_funcao;
      console.log(`[CycleCount][Session] Stage resolved from OP etapas: id=${operationId}, desc=${pecasEtapa.etapa.descricao}`);
    }
  }

  // Validate OP + etapa relationship if operation was found
  if (operationId) {
    const pecasEtapa = await prisma.pecasEtapas.findUnique({
      where: {
        id_da_op_id_da_funcao: {
          id_da_op: Number(op_id),
          id_da_funcao: operationId,
        },
      },
    });
    if (!pecasEtapa) {
      // Stage exists but is not linked to this OP — warn but don't fail
      console.warn(`[CycleCount][Session] Stage ${operationId} not linked to OP ${op_id}. Session will have null operationId.`);
      operationId = null;
    }
  }

  if (!operationId) {
    console.warn(`[CycleCount][Session] No stage resolved for OP ${op_id} at establishment ${cnpj}. operationId will be null.`);
  }

  // Close any existing active session for this station
  await prisma.cycleCountSession.updateMany({
    where: { stationId: station_id, status: 'active' },
    data: { status: 'closed', endedAt: new Date() },
  });

  // Generate unique session ID
  const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

  const session = await prisma.cycleCountSession.create({
    data: {
      sessionId,
      stationId: station_id,
      estabelecimentoCnpj: cnpj,
      operatorId: operator_id,
      opId: Number(op_id),
      operationId,
      startedAt: new Date(),
      status: 'active',
    },
  });

  console.log(`[CycleCount][Session] Created: sessionId=${sessionId}, estabelecimento=${cnpj}, operator=${operator_id}, op=${op_id}, operationId=${operationId}`);

  return {
    session_id: session.sessionId,
    station_id: session.stationId,
    started_at: session.startedAt,
  };
}

async function closeSession(stationId, cnpj) {
  const session = await prisma.cycleCountSession.findFirst({
    where: { stationId, estabelecimentoCnpj: cnpj, status: 'active' },
  });

  if (!session) {
    throw Object.assign(new Error('Sessão ativa não encontrada para esta estação.'), { statusCode: 404, code: 'SESSION_NOT_FOUND' });
  }

  const closed = await prisma.cycleCountSession.update({
    where: { id: session.id },
    data: { status: 'closed', endedAt: new Date() },
  });

  return closed;
}

async function getSessions(cnpj) {
  return prisma.cycleCountSession.findMany({
    where: { estabelecimentoCnpj: cnpj },
    orderBy: { startedAt: 'desc' },
    include: {
      operator: { select: { nome: true, email: true } },
      op: { select: { descricao: true } },
      operation: { select: { descricao: true } },
    },
  });
}

async function getSessionByStation(stationId, cnpj) {
  const session = await prisma.cycleCountSession.findFirst({
    where: { stationId, estabelecimentoCnpj: cnpj, status: 'active' },
    include: {
      operator: { select: { nome: true, email: true } },
      op: { select: { descricao: true } },
      operation: { select: { descricao: true } },
    },
  });
  return session;
}

// ═══════════════════════════════════════════════════════════════
// WEBHOOK EVENT PROCESSING
// ═══════════════════════════════════════════════════════════════

async function resolveStage(eventId, sessionId, opId, cnpj, sessionOperationId, eventOperation) {
  // ── Multi-fallback stage resolution ──
  // Strategy 1: Use session's stored operationId
  if (sessionOperationId) {
    const etapa = await prisma.etapa.findFirst({
      where: {
        id_da_funcao: sessionOperationId,
        id_Estabelecimento: cnpj,
      },
    });
    if (etapa) {
      logCycleEvent(eventId, sessionId, `Stage resolved from session: stageId=${etapa.id_da_funcao}, operation=${etapa.descricao}`);
      return etapa;
    }
  }

  // Strategy 2: Try to match by event's operation description
  if (eventOperation) {
    const etapa = await prisma.etapa.findFirst({
      where: {
        descricao: eventOperation,
        id_Estabelecimento: cnpj,
      },
    });
    if (etapa) {
      logCycleEvent(eventId, sessionId, `Stage resolved from event operation name: stageId=${etapa.id_da_funcao}, operation=${etapa.descricao}`);
      return etapa;
    }
  }

  // Strategy 3: Find first etapa associated with this OP via PecasEtapas
  const pecasEtapa = await prisma.pecasEtapas.findFirst({
    where: { id_da_op: Number(opId) },
    include: { etapa: true },
  });
  if (pecasEtapa && pecasEtapa.etapa) {
    const etapa = pecasEtapa.etapa;
    // Verify the etapa belongs to the same establishment
    if (etapa.id_Estabelecimento === cnpj) {
      logCycleEvent(eventId, sessionId, `Stage resolved from OP etapas: stageId=${etapa.id_da_funcao}, operation=${etapa.descricao}`);
      return etapa;
    }
  }

  // No stage found
  logCycleEvent(eventId, sessionId, `Session context incomplete: operationId=${sessionOperationId}, eventOperation=${eventOperation}. No stage could be resolved for OP ${opId} at establishment ${cnpj}.`, 'error');
  return null;
}

async function processCycleEvent(body, cnpj, rawPayload) {
  const {
    event_id,
    session_id,
    type,
    cycle_id,
    state,
    cycle_completed,
    started_at,
    ended_at,
    confidence,
    duration_s,
    sewing_time_s,
    source,
    estabelecimento_cnpj,
    // body fields that may be sent but session context takes precedence
    operator_id: bodyOperatorId,
    op_id: bodyOpId,
    operation: bodyOperation,
    station_id: bodyStationId,
  } = body;

  // ── 1. Validate universally required fields ──
  if (!event_id) {
    throw Object.assign(new Error('Campo obrigatório: event_id'), { statusCode: 400, code: 'MISSING_EVENT_ID' });
  }
  if (!session_id) {
    logCycleEvent(event_id, null, 'Missing session_id', 'error');
    throw Object.assign(new Error('Campo obrigatório: session_id'), { statusCode: 400, code: 'MISSING_SESSION_ID' });
  }
  if (!type) {
    logCycleEvent(event_id, session_id, 'Missing type', 'error');
    throw Object.assign(new Error('Campo obrigatório: type'), { statusCode: 400, code: 'MISSING_TYPE' });
  }

  logCycleEvent(event_id, session_id, `[Type: ${type}] Processing event. State: ${state}, Completed: ${cycle_completed}`);

  // ── 2. Validate type-specific required fields ──
  if (type === 'cycle') {
    if (cycle_id === undefined || cycle_id === null) {
      logCycleEvent(event_id, session_id, 'Missing cycle_id for cycle event', 'error');
      throw Object.assign(new Error('Campo obrigatório para evento cycle: cycle_id'), { statusCode: 400, code: 'MISSING_CYCLE_ID' });
    }
    if (!state) {
      logCycleEvent(event_id, session_id, 'Missing state for cycle event', 'error');
      throw Object.assign(new Error('Campo obrigatório para evento cycle: state'), { statusCode: 400, code: 'MISSING_STATE' });
    }
    if (cycle_completed === undefined || cycle_completed === null) {
      logCycleEvent(event_id, session_id, 'Missing cycle_completed for cycle event', 'error');
      throw Object.assign(new Error('Campo obrigatório para evento cycle: cycle_completed'), { statusCode: 400, code: 'MISSING_CYCLE_COMPLETED' });
    }
  } else if (type === 'summary') {
    // summary events do not require cycle_id, state, or cycle_completed
    // They are informational/aggregation events — no stage validation needed
    logCycleEvent(event_id, session_id, 'Summary event received — no cycle validation needed');
  } else {
    // Unknown type: accept but log warning (tolerant to future types)
    logCycleEvent(event_id, session_id, `Unknown event type: ${type} — accepting with basic validation only`);
  }

  // ── 3. Idempotency check ──
  const existingEvent = await prisma.cycleCountEvent.findUnique({
    where: { eventId: event_id },
  });

  if (existingEvent) {
    logCycleEvent(event_id, session_id, `Duplicate event ignored: eventId=${event_id}`);
    throw Object.assign(new Error('Evento já processado.'), {
      statusCode: 409,
      code: 'EVENT_ALREADY_PROCESSED',
    });
  }

  // ── 4. Validate session ──
  const session = await prisma.cycleCountSession.findFirst({
    where: { sessionId: session_id, estabelecimentoCnpj: cnpj },
  });
  if (!session) {
    logCycleEvent(event_id, session_id, 'Session not found in database', 'error');
    throw Object.assign(new Error('Sessão do CycleCount não encontrada.'), { statusCode: 404, code: 'SESSION_NOT_FOUND' });
  }
  if (session.status !== 'active') {
    logCycleEvent(event_id, session_id, `Session is not active (status: ${session.status})`, 'error');
    throw Object.assign(new Error('Sessão não está ativa.'), { statusCode: 400, code: 'SESSION_NOT_ACTIVE' });
  }

  logCycleEvent(event_id, session_id, `Session found: sessionId=${session.sessionId}, estabelecimento=${session.estabelecimentoCnpj}, operator=${session.operatorId}, op=${session.opId}, operationId=${session.operationId}`);

  // ── 5. Validate CNPJ consistency ──
  if (estabelecimento_cnpj && estabelecimento_cnpj !== cnpj) {
    logCycleEvent(event_id, session_id, `CNPJ mismatch: event has ${estabelecimento_cnpj}, session has ${cnpj}`, 'error');
    throw Object.assign(new Error('estabelecimento_cnpj do evento não corresponde à sessão.'), { statusCode: 400, code: 'CNPJ_MISMATCH' });
  }

  // ── 6. Use session context as source of truth ──
  const operatorId = session.operatorId;
  const opId = session.opId;

  // ── 7. Validate operator exists ──
  const funcionario = await prisma.usuarios.findFirst({
    where: { email: operatorId, estabelecimentoCnpj: cnpj },
  });
  if (!funcionario) {
    logCycleEvent(event_id, session_id, `Operator ${operatorId} not found in establishment`, 'error');
    throw Object.assign(new Error('Funcionário da sessão não encontrado no estabelecimento.'), { statusCode: 404, code: 'OPERATOR_NOT_FOUND' });
  }

  // ── 8. Validate OP exists ──
  const op = await prisma.pecasOP.findFirst({
    where: { id_da_op: Number(opId), id_Estabelecimento: cnpj },
  });
  if (!op) {
    logCycleEvent(event_id, session_id, `OP ${opId} not found in establishment`, 'error');
    throw Object.assign(new Error('OP da sessão não encontrada no estabelecimento.'), { statusCode: 404, code: 'OP_NOT_FOUND' });
  }

  // ── 9. Resolve stage — summary events skip stage validation ──
  let etapa = null;

  if (type === 'summary') {
    // Summary events are informational — stage is not required
    logCycleEvent(event_id, session_id, 'Summary event — stage validation skipped');
  } else {
    // Cycle events (and unknown types) require a valid stage
    etapa = await resolveStage(event_id, session_id, opId, cnpj, session.operationId, bodyOperation);
    if (!etapa) {
      throw Object.assign(new Error('Etapa da sessão não encontrada no estabelecimento.'), { statusCode: 404, code: 'STAGE_NOT_FOUND' });
    }
  }

  // ── 10. Validate OP + etapa relationship (only for cycle events with resolved stage) ──
  if (etapa) {
    const pecasEtapa = await prisma.pecasEtapas.findUnique({
      where: {
        id_da_op_id_da_funcao: {
          id_da_op: Number(opId),
          id_da_funcao: etapa.id_da_funcao,
        },
      },
    });
    if (!pecasEtapa) {
      logCycleEvent(event_id, session_id, `Etapa ${etapa.id_da_funcao} (${etapa.descricao}) not associated with OP ${opId}`, 'error');
      throw Object.assign(new Error('Etapa não está associada a esta OP.'), { statusCode: 400, code: 'OP_STAGE_MISMATCH' });
    }
  }

  // ── 11. Determine if production should be created ──
  const shouldCreateProduction = type === 'cycle' && state === 'CONFIRMED' && cycle_completed === true;

  // ── 12. Transactional: create event + optionally create production ──
  const result = await prisma.$transaction(async (tx) => {
    const startedAtDate = started_at ? new Date(started_at) : new Date();
    const endedAtDate = ended_at ? new Date(ended_at) : null;

    const cycleEvent = await tx.cycleCountEvent.create({
      data: {
        eventId: event_id,
        sessionId: session_id,
        stationId: session.stationId,
        operatorId,
        opId: Number(opId),
        operation: etapa ? etapa.descricao : (type || null),
        cycleId: cycle_id !== undefined ? Number(cycle_id) : null,
        state: state || type,
        cycleCompleted: cycle_completed === true,
        startedAt: startedAtDate,
        endedAt: endedAtDate,
        confidence: confidence !== undefined ? confidence : null,
        durationS: duration_s !== undefined ? duration_s : null,
        sewingTimeS: sewing_time_s !== undefined ? sewing_time_s : null,
        source: source || 'cyclecount',
        rawPayload: rawPayload || undefined,
        processedAt: new Date(),
      },
    });

    let production = null;

    if (shouldCreateProduction && etapa) {
      const productionDate = endedAtDate || new Date();
      const horaRegistro = getHoraRegistro(productionDate, true);
      const dataReferencia = getDataReferencia(productionDate);
      const dataInicio = getDataInicio();

      production = await tx.producao.create({
        data: {
          quantidade_pecas: 1,
          id_Estabelecimento: cnpj,
          id_da_op: Number(opId),
          id_funcionario: operatorId,
          id_da_funcao: etapa.id_da_funcao,
          data_inicio: dataInicio,
          hora_registro: horaRegistro,
          dataReferencia,
          tipoRegistro: 'cyclecount',
          tempo_produzido: duration_s ? duration_s / 60 : 60,
          cycleCountEventId: cycleEvent.id,
        },
      });

      await tx.cycleCountEvent.update({
        where: { id: cycleEvent.id },
        data: { productionId: production.id_da_producao },
      });

      logCycleEvent(event_id, session_id, `Cycle accepted: eventId=${event_id}, cycleId=${cycle_id}, productionId=${production.id_da_producao}`);
    } else if (type === 'summary') {
      logCycleEvent(event_id, session_id, `Summary accepted: eventId=${event_id}`);
    } else {
      logCycleEvent(event_id, session_id, `Event stored: eventId=${event_id}. No production (type: ${type}, state: ${state}, completed: ${cycle_completed})`);
    }

    return { cycleEvent, production };
  });

  return result;
}

async function getEvents(cnpj, filters = {}) {
  const where = {};
  if (filters.session_id) where.sessionId = filters.session_id;
  if (filters.state) where.state = filters.state;
  if (filters.operator_id) where.operatorId = filters.operator_id;

  return prisma.cycleCountEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters.limit || 100,
    include: {
      production: {
        select: {
          id_da_producao: true,
          quantidade_pecas: true,
          hora_registro: true,
          tipoRegistro: true,
        },
      },
    },
  });
}

async function adjustCycleEvent(eventId, delta, reason, user, cnpj) {
  const event = await prisma.cycleCountEvent.findUnique({
    where: { eventId: eventId },
    include: { production: true },
  });

  if (!event) {
    throw Object.assign(new Error('Evento não encontrado.'), { statusCode: 404, code: 'EVENT_NOT_FOUND' });
  }

  if (!event.production) {
    throw Object.assign(new Error('Evento não possui produção associada.'), { statusCode: 400, code: 'NO_PRODUCTION' });
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create adjustment record
    const adjustment = await tx.cycleCountAdjustment.create({
      data: {
        cycleCountEventId: event.id,
        delta: Number(delta),
        reason: reason || null,
        user: user || null,
      },
    });

    // Create an adjustment production record (negative or positive delta)
    const adjustmentProd = await tx.producao.create({
      data: {
        quantidade_pecas: Number(delta),
        id_Estabelecimento: cnpj,
        id_da_op: event.opId,
        id_funcionario: event.operatorId,
        id_da_funcao: event.production.id_da_funcao,
        data_inicio: new Date(),
        hora_registro: getHoraRegistro(),
        dataReferencia: getDataReferencia(),
        tipoRegistro: 'cyclecount_adjustment',
        tempo_produzido: 0,
      },
    });

    return { adjustment, adjustmentProd };
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════
// HEALTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

async function getHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}

async function getStationHealth(stationId, cnpj) {
  const session = await prisma.cycleCountSession.findFirst({
    where: { stationId, estabelecimentoCnpj: cnpj, status: 'active' },
  });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const eventsLastHour = await prisma.cycleCountEvent.count({
    where: {
      stationId,
      createdAt: { gte: oneHourAgo },
    },
  });

  return {
    station_id: stationId,
    session_open: !!session,
    events_last_hour: eventsLastHour,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  createSession,
  closeSession,
  getSessions,
  getSessionByStation,
  processCycleEvent,
  getEvents,
  adjustCycleEvent,
  getHealth,
  getStationHealth,
};
