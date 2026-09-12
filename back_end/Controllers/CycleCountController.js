const cycleCountService = require('../Services/CycleCount.services');

// ═══════════════════════════════════════════════════════════════
// SESSION CONTROLLERS
// ═══════════════════════════════════════════════════════════════

async function postSession(req, res, next) {
  try {
    const cnpj = req.user.cnpj;
    const session = await cycleCountService.createSession(req.body, cnpj);
    res.status(201).json(session);
  } catch (err) {
    console.error('Erro ao criar sessão CycleCount:', err.message);
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    res.status(statusCode).json({ error: code, message: err.message });
  }
}

async function postSessionExternal(req, res, next) {
  try {
    const cnpj = req.body.estabelecimento_cnpj;
    if (!cnpj) {
      return res.status(400).json({ error: 'MISSING_CNPJ', message: 'Campo obrigatório: estabelecimento_cnpj' });
    }
    const session = await cycleCountService.createSession(req.body, cnpj);
    res.status(201).json(session);
  } catch (err) {
    console.error('Erro ao criar sessão CycleCount (external):', err.message);
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    res.status(statusCode).json({ error: code, message: err.message });
  }
}

async function deleteSession(req, res, next) {
  try {
    const cnpj = req.user.cnpj;
    const { station_id } = req.params;
    const session = await cycleCountService.closeSession(station_id, cnpj);
    res.status(200).json({ message: 'Sessão encerrada.', session });
  } catch (err) {
    console.error('Erro ao encerrar sessão CycleCount:', err.message);
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    res.status(statusCode).json({ error: code, message: err.message });
  }
}

async function getSessions(req, res, next) {
  try {
    const cnpj = req.user.cnpj;
    const sessions = await cycleCountService.getSessions(cnpj);
    res.status(200).json(sessions);
  } catch (err) {
    console.error('Erro ao buscar sessões CycleCount:', err.message);
    next(err);
  }
}

async function getSessionByStation(req, res, next) {
  try {
    const cnpj = req.user.cnpj;
    const { station_id } = req.params;
    const session = await cycleCountService.getSessionByStation(station_id, cnpj);
    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Nenhuma sessão ativa para esta estação.' });
    }
    res.status(200).json(session);
  } catch (err) {
    console.error('Erro ao buscar sessão CycleCount:', err.message);
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// WEBHOOK CONTROLLER
// ═══════════════════════════════════════════════════════════════

async function postWebhook(req, res, next) {
  try {
    const rawPayload = req.body;
    const cnpj = rawPayload.estabelecimento_cnpj;

    if (!cnpj) {
      return res.status(400).json({
        error: 'MISSING_ESTABELECIMENTO_CNPJ',
        message: 'Campo obrigatório: estabelecimento_cnpj'
      });
    }

    const result = await cycleCountService.processCycleEvent(req.body, cnpj, rawPayload);

    if (result.production) {
      // Cycle event with CONFIRMED + cycle_completed → production created
      if (req.io) {
        req.io.emit(`nova_atualizacao_${cnpj}`, {
          type: 'cyclecount_production',
          production: result.production,
          event: { eventId: result.cycleEvent.eventId, state: result.cycleEvent.state },
        });
      }
      return res.status(201).json({
        message: 'Ciclo processado e produção registrada.',
        event_id: result.cycleEvent.eventId,
        production_id: result.production.id_da_producao,
      });
    }

    // Summary event or cycle event without production
    const eventType = rawPayload.type;
    if (eventType === 'summary') {
      return res.status(200).json({
        message: 'Resumo recebido e armazenado.',
        event_id: result.cycleEvent.eventId,
        state: result.cycleEvent.state,
      });
    }

    // Event received but not CONFIRMED + cycle_completed — store event only
    return res.status(200).json({
      message: 'Evento recebido. Não gera produção (estado intermediário).',
      event_id: result.cycleEvent.eventId,
      state: result.cycleEvent.state,
    });
  } catch (err) {
    console.error('Erro ao processar webhook CycleCount:', err.message);
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';

    if (code === 'EVENT_ALREADY_PROCESSED') {
      return res.status(409).json({
        error: code,
        message: err.message,
      });
    }

    res.status(statusCode).json({ error: code, message: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════
// EVENTS CONTROLLER
// ═══════════════════════════════════════════════════════════════

async function getEvents(req, res, next) {
  try {
    const cnpj = req.user.cnpj;
    const filters = {
      session_id: req.query.session_id,
      state: req.query.state,
      operator_id: req.query.operator_id,
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
    };
    const events = await cycleCountService.getEvents(cnpj, filters);
    res.status(200).json(events);
  } catch (err) {
    console.error('Erro ao buscar eventos CycleCount:', err.message);
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// ADJUST CONTROLLER
// ═══════════════════════════════════════════════════════════════

async function postAdjust(req, res, next) {
  try {
    const cnpj = req.user.cnpj;
    const { event_id } = req.params;
    const { delta, reason, user } = req.body;

    if (delta === undefined || delta === null) {
      return res.status(400).json({ error: 'MISSING_DELTA', message: 'Campo obrigatório: delta' });
    }

    const result = await cycleCountService.adjustCycleEvent(event_id, delta, reason, user || req.user.email, cnpj);
    res.status(201).json({ message: 'Ajuste registrado.', ...result });
  } catch (err) {
    console.error('Erro ao ajustar ciclo CycleCount:', err.message);
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    res.status(statusCode).json({ error: code, message: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════
// HEALTH CONTROLLERS
// ═══════════════════════════════════════════════════════════════

async function getHealth(req, res, next) {
  try {
    const health = await cycleCountService.getHealth();
    res.status(200).json(health);
  } catch (err) {
    console.error('Erro ao verificar health:', err.message);
    next(err);
  }
}

async function getStationHealth(req, res, next) {
  try {
    const cnpj = req.user.cnpj;
    const { station_id } = req.params;
    const health = await cycleCountService.getStationHealth(station_id, cnpj);
    res.status(200).json(health);
  } catch (err) {
    console.error('Erro ao verificar health da estação:', err.message);
    next(err);
  }
}

module.exports = {
  postSession,
  postSessionExternal,
  deleteSession,
  getSessions,
  getSessionByStation,
  postWebhook,
  getEvents,
  postAdjust,
  getHealth,
  getStationHealth,
};
