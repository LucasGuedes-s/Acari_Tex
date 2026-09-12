const express = require('express');
const router = express.Router();
const jwtMiddleware = require('../middlewares/auth');
const apiKeyAuth = require('../middlewares/apiKeyAuth');
const cycleCountController = require('../Controllers/CycleCountController');

// ═══════════════════════════════════════════════════════════════
// SESSIONS
// ═══════════════════════════════════════════════════════════════

// Create a new CycleCount session (JWT from Linha Tex UI)
router.post('/cyclecount/sessions', [jwtMiddleware], cycleCountController.postSession);

// Create a new CycleCount session (API key from CycleCount system)
router.post('/cyclecount/sessions/external', [apiKeyAuth], cycleCountController.postSessionExternal);

// Close session by station
router.delete('/cyclecount/sessions/:station_id', [jwtMiddleware], cycleCountController.deleteSession);

// List all sessions
router.get('/cyclecount/sessions', [jwtMiddleware], cycleCountController.getSessions);

// Get active session by station
router.get('/cyclecount/sessions/:station_id', [jwtMiddleware], cycleCountController.getSessionByStation);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK
// ═══════════════════════════════════════════════════════════════

// Receive cycle events from CycleCount
router.post('/cyclecount/webhook', [apiKeyAuth], cycleCountController.postWebhook);

// ═══════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════

// List cycle events with optional filters
router.get('/cyclecount/events', [jwtMiddleware], cycleCountController.getEvents);

// ═══════════════════════════════════════════════════════════════
// ADJUSTMENTS
// ═══════════════════════════════════════════════════════════════

// Create an auditable adjustment for a cycle event
router.post('/cyclecount/cycles/:event_id/adjust', [jwtMiddleware], cycleCountController.postAdjust);

// ═══════════════════════════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════════════════════════

// General health check
router.get('/cyclecount/health', cycleCountController.getHealth);

// Station-specific health check
router.get('/cyclecount/stations/:station_id/health', [jwtMiddleware], cycleCountController.getStationHealth);

module.exports = router;
