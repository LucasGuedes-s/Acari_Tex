const axios = require('axios');

const BASE_URL = 'http://localhost:3333';
const API_KEY = 'cyclecount_secret_key_2026';
const ESTABELECIMENTO_CNPJ = '12345678';
const OPERATOR_ID = 'test@example.com';
const OP_ID = 123;
const OPERATION = 'Etapa 1';
const STATION_ID = 'station-test-001';

const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'x-api-key': API_KEY }
});

let passed = 0;
let failed = 0;
let total = 0;

async function runTest(name, testFn) {
    total++;
    console.log(`\n🚀 [${total}] Test: ${name}`);
    try {
        await testFn();
        passed++;
        console.log(`   ✅ PASSED`);
    } catch (err) {
        failed++;
        const response = err.response;
        if (response) {
            console.log(`   ❌ FAILED: HTTP ${response.status}`);
            console.log(`   Response: ${JSON.stringify(response.data)}`);
        } else {
            console.log(`   ❌ FAILED: ${err.message}`);
        }
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message || 'AssertEqual'}: expected ${expected}, got ${actual}`);
    }
}

function assertStatus(err, expectedStatus, message) {
    if (!err.response) throw new Error(`${message || 'No response'}: ${err.message}`);
    assertEqual(err.response.status, expectedStatus, message);
}

function assertField(err, fieldName, message) {
    if (!err.response) throw new Error(`${message || 'No response'}: ${err.message}`);
    assert(err.response.data[fieldName] !== undefined, `${message}: missing field ${fieldName}`);
}

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  CycleCount ↔ Linha Tex — Integration Test Suite');
    console.log('═══════════════════════════════════════════════════════');

    let sessionId = null;
    let eventCounter = 0;

    // ═══════════════════════════════════════════════════════
    // ETAPA 1: Create real session
    // ═══════════════════════════════════════════════════════
    await runTest('Create real session via API', async () => {
        const res = await client.post('/cyclecount/sessions/external', {
            estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
            station_id: STATION_ID,
            operator_id: OPERATOR_ID,
            op_id: OP_ID,
            operation: OPERATION,
        });
        assertEqual(res.status, 201, 'Session creation status');
        assert(res.data.session_id, 'Session ID must be returned');
        sessionId = res.data.session_id;
        console.log(`   Session created: ${sessionId}`);
    });

    if (!sessionId) {
        console.log('\n❌ Cannot continue without a valid session. Aborting.');
        return;
    }

    // ═══════════════════════════════════════════════════════
    // ETAPA 2: Valid cycle event
    // ═══════════════════════════════════════════════════════
    await runTest('Valid cycle event → production created', async () => {
        eventCounter++;
        const eventId = `evt_cycle_${Date.now()}_${eventCounter}`;
        const res = await client.post('/cyclecount/webhook', {
            estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
            event_id: eventId,
            session_id: sessionId,
            type: 'cycle',
            cycle_id: 1,
            state: 'CONFIRMED',
            cycle_completed: true,
            started_at: new Date().toISOString(),
            ended_at: new Date().toISOString(),
            duration_s: 120,
            sewing_time_s: 110,
            confidence: 0.95,
        });
        assertEqual(res.status, 201, 'Cycle event status');
        assert(res.data.production_id, 'Production ID must be returned');
        assertEqual(res.data.event_id, eventId, 'Event ID in response');
        console.log(`   Event: ${eventId}, Production: ${res.data.production_id}`);
    });

    // ═══════════════════════════════════════════════════════
    // ETAPA 3: Valid summary event
    // ═══════════════════════════════════════════════════════
    await runTest('Valid summary event → accepted without cycle_id', async () => {
        eventCounter++;
        const eventId = `evt_summary_${Date.now()}_${eventCounter}`;
        const res = await client.post('/cyclecount/webhook', {
            estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
            event_id: eventId,
            session_id: sessionId,
            type: 'summary',
        });
        assert(res.status >= 200 && res.status < 300, 'Summary event should return 2xx');
        assertEqual(res.data.event_id, eventId, 'Event ID in response');
        assertEqual(res.data.state, 'summary', 'State should be summary type');
        console.log(`   Summary event accepted: ${eventId}`);
    });

    // ═══════════════════════════════════════════════════════
    // ETAPA 4: Duplicate event (idempotency)
    // ═══════════════════════════════════════════════════════
    await runTest('Duplicate event → idempotent response (409)', async () => {
        eventCounter++;
        const eventId = `evt_dup_${Date.now()}_${eventCounter}`;
        // Send first time
        await client.post('/cyclecount/webhook', {
            estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
            event_id: eventId,
            session_id: sessionId,
            type: 'cycle',
            cycle_id: 1,
            state: 'CONFIRMED',
            cycle_completed: true,
            duration_s: 60,
        });
        // Send again
        try {
            await client.post('/cyclecount/webhook', {
                estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
                event_id: eventId,
                session_id: sessionId,
                type: 'cycle',
                cycle_id: 1,
                state: 'CONFIRMED',
                cycle_completed: true,
                duration_s: 60,
            });
            throw new Error('Should have returned 409 for duplicate');
        } catch (err) {
            assertStatus(err, 409, 'Duplicate event status');
            assertField(err, 'error', 'Duplicate response');
            assertEqual(err.response.data.error, 'EVENT_ALREADY_PROCESSED', 'Error code');
            console.log(`   Duplicate event correctly rejected: ${eventId}`);
        }
    });

    // ═══════════════════════════════════════════════════════
    // ETAPA 5: Unknown field tolerance
    // ═══════════════════════════════════════════════════════
    await runTest('Event with unknown field → accepted', async () => {
        eventCounter++;
        const eventId = `evt_future_${Date.now()}_${eventCounter}`;
        const res = await client.post('/cyclecount/webhook', {
            estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
            event_id: eventId,
            session_id: sessionId,
            type: 'cycle',
            cycle_id: 1,
            state: 'CONFIRMED',
            cycle_completed: true,
            duration_s: 90,
            new_future_field: 'abc',
            another_unknown: 123,
            nested_object: { key: 'value' },
        });
        assert(res.status >= 200 && res.status < 300, 'Event with unknown fields should be accepted');
        console.log(`   Unknown fields tolerated: ${eventId}`);
    });

    // ═══════════════════════════════════════════════════════
    // ETAPA 6: Missing required fields
    // ═══════════════════════════════════════════════════════
    await runTest('Missing event_id → 400', async () => {
        try {
            await client.post('/cyclecount/webhook', {
                estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
                session_id: sessionId,
                type: 'cycle',
            });
            throw new Error('Should have failed with 400');
        } catch (err) {
            assertStatus(err, 400, 'Missing event_id status');
            assertField(err, 'error', 'Missing event_id response');
            assertEqual(err.response.data.error, 'MISSING_EVENT_ID', 'Error code');
        }
    });

    await runTest('Missing session_id → 400', async () => {
        try {
            await client.post('/cyclecount/webhook', {
                estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
                event_id: `evt_no_sess_${Date.now()}`,
                type: 'cycle',
            });
            throw new Error('Should have failed with 400');
        } catch (err) {
            assertStatus(err, 400, 'Missing session_id status');
            assertEqual(err.response.data.error, 'MISSING_SESSION_ID', 'Error code');
        }
    });

    await runTest('Missing type → 400', async () => {
        try {
            await client.post('/cyclecount/webhook', {
                estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
                event_id: `evt_no_type_${Date.now()}`,
                session_id: sessionId,
            });
            throw new Error('Should have failed with 400');
        } catch (err) {
            assertStatus(err, 400, 'Missing type status');
            assertEqual(err.response.data.error, 'MISSING_TYPE', 'Error code');
        }
    });

    await runTest('Cycle event missing cycle_id → 400 MISSING_CYCLE_ID', async () => {
        try {
            await client.post('/cyclecount/webhook', {
                estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
                event_id: `evt_no_cycle_${Date.now()}`,
                session_id: sessionId,
                type: 'cycle',
                state: 'CONFIRMED',
                cycle_completed: true,
            });
            throw new Error('Should have failed with MISSING_CYCLE_ID');
        } catch (err) {
            assertStatus(err, 400, 'Missing cycle_id status');
            assertEqual(err.response.data.error, 'MISSING_CYCLE_ID', 'Error code');
        }
    });

    await runTest('Cycle event missing state → 400 MISSING_STATE', async () => {
        try {
            await client.post('/cyclecount/webhook', {
                estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
                event_id: `evt_no_state_${Date.now()}`,
                session_id: sessionId,
                type: 'cycle',
                cycle_id: 1,
                cycle_completed: true,
            });
            throw new Error('Should have failed with MISSING_STATE');
        } catch (err) {
            assertStatus(err, 400, 'Missing state status');
            assertEqual(err.response.data.error, 'MISSING_STATE', 'Error code');
        }
    });

    await runTest('Cycle event missing cycle_completed → 400 MISSING_CYCLE_COMPLETED', async () => {
        try {
            await client.post('/cyclecount/webhook', {
                estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
                event_id: `evt_no_completed_${Date.now()}`,
                session_id: sessionId,
                type: 'cycle',
                cycle_id: 1,
                state: 'CONFIRMED',
            });
            throw new Error('Should have failed with MISSING_CYCLE_COMPLETED');
        } catch (err) {
            assertStatus(err, 400, 'Missing cycle_completed status');
            assertEqual(err.response.data.error, 'MISSING_CYCLE_COMPLETED', 'Error code');
        }
    });

    // ═══════════════════════════════════════════════════════
    // ETAPA 7: Non-existent session
    // ═══════════════════════════════════════════════════════
    await runTest('Non-existent session → 404 SESSION_NOT_FOUND', async () => {
        try {
            await client.post('/cyclecount/webhook', {
                estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
                event_id: `evt_bad_sess_${Date.now()}`,
                session_id: 'sess-never-existed-000000000',
                type: 'cycle',
                cycle_id: 1,
                state: 'CONFIRMED',
                cycle_completed: true,
            });
            throw new Error('Should have failed with SESSION_NOT_FOUND');
        } catch (err) {
            assertStatus(err, 404, 'Non-existent session status');
            assertEqual(err.response.data.error, 'SESSION_NOT_FOUND', 'Error code');
        }
    });

    // ═══════════════════════════════════════════════════════
    // ETAPA 8: Burst of 20 events
    // ═══════════════════════════════════════════════════════
    await runTest('Burst of 20 events → all processed', async () => {
        const promises = [];
        const eventIds = [];
        for (let i = 0; i < 20; i++) {
            eventCounter++;
            const eventId = `evt_burst_${Date.now()}_${eventCounter}`;
            eventIds.push(eventId);
            promises.push(
                client.post('/cyclecount/webhook', {
                    estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
                    event_id: eventId,
                    session_id: sessionId,
                    type: 'cycle',
                    cycle_id: i + 1,
                    state: 'CONFIRMED',
                    cycle_completed: true,
                    duration_s: 60 + i,
                })
            );
        }
        const results = await Promise.allSettled(promises);
        const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
        const failedEvents = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status !== 201));
        console.log(`   Sent: 20, Succeeded: ${succeeded.length}, Failed: ${failedEvents.length}`);
        assertEqual(succeeded.length, 20, 'All 20 events should succeed');
    });

    // ═══════════════════════════════════════════════════════
    // ETAPA 9: Invalid API key
    // ═══════════════════════════════════════════════════════
    await runTest('Invalid API key → 401', async () => {
        const badClient = axios.create({
            baseURL: BASE_URL,
            headers: { 'x-api-key': 'wrong_api_key_12345' }
        });
        try {
            await badClient.post('/cyclecount/webhook', {
                estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
                event_id: `evt_bad_key_${Date.now()}`,
                session_id: sessionId,
                type: 'cycle',
                cycle_id: 1,
                state: 'CONFIRMED',
                cycle_completed: true,
            });
            throw new Error('Should have failed with 401');
        } catch (err) {
            assertStatus(err, 401, 'Invalid API key status');
        }
    });

    await runTest('Missing API key → 401', async () => {
        const noKeyClient = axios.create({ baseURL: BASE_URL });
        try {
            await noKeyClient.post('/cyclecount/webhook', {
                estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
                event_id: `evt_no_key_${Date.now()}`,
                session_id: sessionId,
                type: 'cycle',
                cycle_id: 1,
                state: 'CONFIRMED',
                cycle_completed: true,
            });
            throw new Error('Should have failed with 401');
        } catch (err) {
            assertStatus(err, 401, 'Missing API key status');
        }
    });

    // ═══════════════════════════════════════════════════════
    // ETAPA 10: Close session and test behavior
    // ═══════════════════════════════════════════════════════
    await runTest('Close session → 200', async () => {
        const res = await client.delete(`/cyclecount/sessions/${STATION_ID}`);
        assertEqual(res.status, 200, 'Session close status');
        console.log(`   Session closed: ${sessionId}`);
    });

    await runTest('Event after session closed → 400 SESSION_NOT_ACTIVE', async () => {
        try {
            await client.post('/cyclecount/webhook', {
                estabelecimento_cnpj: ESTABELECIMENTO_CNPJ,
                event_id: `evt_after_close_${Date.now()}`,
                session_id: sessionId,
                type: 'cycle',
                cycle_id: 99,
                state: 'CONFIRMED',
                cycle_completed: true,
            });
            throw new Error('Should have failed with SESSION_NOT_ACTIVE');
        } catch (err) {
            assertStatus(err, 400, 'Event after close status');
            assertEqual(err.response.data.error, 'SESSION_NOT_ACTIVE', 'Error code');
        }
    });

    // ═══════════════════════════════════════════════════════
    // RESULTS
    // ═══════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`  Results: ${passed}/${total} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════');

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Test suite crashed:', err);
    process.exit(1);
});
