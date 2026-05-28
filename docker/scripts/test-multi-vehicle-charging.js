/**
 * Prueba concurrente: varios vehículos en Supercharger Laureles (3 conectores).
 * Evidencia NO_CONNECTORS, liberación progresiva y eventos WebSocket.
 *
 * Uso: node docker/scripts/test-multi-vehicle-charging.js
 * Requiere: API en localhost:3000, socket.io-client (npx lo resuelve).
 */

const { io } = require('socket.io-client');

const API = process.env.API_BASE ?? 'http://localhost:3000/api/v1';
const WS_URL = process.env.WS_URL ?? 'http://localhost:3000';
const STATION_ID = 'b0000000-0000-4000-8000-000000000003'; // Laureles, 3 conectores
const REQUESTED_KWH = 20; // ~4s por sesión con CHARGE_RATE_KWH_PER_SEC=5
const PASSWORD = 'Tesla123!';

const wsEvents = {
  stationState: [],
  sessionProgress: [],
};

function log(section, message, data) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] ${section} | ${message}`, data ?? '');
}

async function api(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

async function registerOrLogin(email) {
  const reg = await api('POST', '/auth/register', {
    email,
    password: PASSWORD,
    vehicleModel: 'Tesla Model 3',
    batteryKwh: 75,
  });
  if (reg.status !== 201 && reg.status !== 200) {
    const loginOnly = await api('POST', '/auth/login', { email, password: PASSWORD });
    if (loginOnly.status !== 200) {
      throw new Error(`No se pudo autenticar ${email}: ${loginOnly.status} ${JSON.stringify(loginOnly.body)}`);
    }
    return loginOnly.body.accessToken ?? loginOnly.body.token;
  }
  const login = await api('POST', '/auth/login', { email, password: PASSWORD });
  if (login.status !== 200) {
    throw new Error(`Registro OK pero login falló ${email}: ${login.status}`);
  }
  return login.body.accessToken ?? login.body.token;
}

async function startSession(token, label) {
  const res = await api(
    'POST',
    '/sessions',
    { stationId: STATION_ID, requestedKwh: REQUESTED_KWH },
    token,
  );
  log('HTTP', `${label} start → ${res.status}`, res.body);
  return res;
}

async function getStationState(token) {
  const res = await api('GET', `/stations/${STATION_ID}/state`, null, token);
  return res.body;
}

function connectWebSocket(sessionIds) {
  return new Promise((resolve, reject) => {
    const socket = io(WS_URL, { path: '/ws', transports: ['websocket'] });

    socket.on('connect', () => {
      log('WS', 'Conectado', socket.id);
      socket.emit('map.join');
      socket.emit('station.join', { stationId: STATION_ID });
      for (const sessionId of sessionIds) {
        socket.emit('session.join', { sessionId });
      }
      resolve(socket);
    });

    socket.on('connect_error', reject);

    socket.on('station.state.changed', (payload) => {
      wsEvents.stationState.push(payload);
      log('WS', 'station.state.changed', {
        state: payload.state,
        busy: payload.busyConnectors,
        free: payload.freeConnectors,
        activeKw: payload.activeKw,
      });
    });

    socket.on('session.progress.updated', (payload) => {
      wsEvents.sessionProgress.push(payload);
      if (payload.percentComplete % 50 === 0 || payload.percentComplete >= 100) {
        log('WS', 'session.progress.updated', {
          sessionId: payload.sessionId?.slice(0, 8),
          percent: payload.percentComplete,
          deliveredKwh: payload.deliveredKwh,
        });
      }
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('\n=== Prueba multi-vehículo — Supercharger Laureles (3 conectores) ===\n');

  const emails = [
    'ev1@tesla.local',
    'ev2@tesla.local',
    'ev3@tesla.local',
    'ev4@tesla.local',
  ];

  log('SETUP', 'Registrando / autenticando 4 conductores...');
  const tokens = [];
  for (const email of emails) {
    tokens.push(await registerOrLogin(email));
  }
  const probeToken = tokens[0];

  const initialState = await getStationState(probeToken);
  log('SETUP', 'Estado inicial estación', {
    state: initialState.state,
    busy: initialState.busyConnectors,
    free: initialState.freeConnectors,
  });

  const socket = await connectWebSocket([]);

  log('PHASE', '--- Iniciando 3 vehículos (llenar conectores) ---');
  const started = [];
  for (let i = 0; i < 3; i++) {
    const res = await startSession(tokens[i], `EV${i + 1}`);
    if (res.status === 201 || res.status === 200) {
      started.push({ label: `EV${i + 1}`, sessionId: res.body.sessionId, token: tokens[i] });
      socket.emit('session.join', { sessionId: res.body.sessionId });
    }
    await sleep(300);
  }

  const fullState = await getStationState(probeToken);
  log('CHECK', 'Estado tras 3 cargas activas', {
    state: fullState.state,
    busy: fullState.busyConnectors,
    free: fullState.freeConnectors,
    expected: 'NO_CONNECTORS',
  });

  log('PHASE', '--- Intento EV4 (debe rechazarse) ---');
  const rejected = await startSession(tokens[3], 'EV4');
  const rejectedOk = rejected.status === 409;
  log('CHECK', rejectedOk ? 'EV4 rechazado correctamente (409)' : 'EV4 NO rechazado — revisar', rejected.body);

  await sleep(500);

  log('PHASE', '--- Esperando fin de sesiones (~5s c/u) y liberación de conectores ---');
  const waitMs = (REQUESTED_KWH / 5 + 3) * 1000 * 3;
  const deadline = Date.now() + waitMs;
  let ev4Started = false;

  while (Date.now() < deadline) {
    const state = await getStationState(probeToken);
    if (!ev4Started && state.freeConnectors > 0) {
      log('PHASE', `Conector libre detectado (free=${state.freeConnectors}) — intentando EV4`);
      const retry = await startSession(tokens[3], 'EV4-retry');
      if (retry.status === 201 || retry.status === 200) {
        ev4Started = true;
        started.push({ label: 'EV4', sessionId: retry.body.sessionId, token: tokens[3] });
        socket.emit('session.join', { sessionId: retry.body.sessionId });
      }
    }

    const statuses = await Promise.all(
      started.map((s) =>
        api('GET', `/sessions/${s.sessionId}`, null, s.token).then((r) => r.body?.status),
      ),
    );
    const allDone = statuses.length > 0 && statuses.every((s) => s !== 'IN_PROGRESS');
    if (allDone && ev4Started) {
      break;
    }
    await sleep(800);
  }

  await sleep(1500);
  socket.close();

  const finalState = await getStationState(probeToken);
  log('RESULT', 'Estado final estación', {
    state: finalState.state,
    busy: finalState.busyConnectors,
    free: finalState.freeConnectors,
  });

  console.log('\n=== Resumen WebSocket ===');
  console.log(`station.state.changed recibidos: ${wsEvents.stationState.length}`);
  console.log(`session.progress.updated recibidos: ${wsEvents.sessionProgress.length}`);

  const statesSeen = [...new Set(wsEvents.stationState.map((e) => e.state))];
  console.log('Estados WS observados:', statesSeen.join(' → '));

  const checks = [
    ['3 sesiones iniciadas', started.length >= 3],
    ['EV4 rechazado inicialmente (409)', rejectedOk],
    ['WS station.state.changed >= 4', wsEvents.stationState.length >= 4],
    ['WS session.progress.updated >= 3', wsEvents.sessionProgress.length >= 3],
    ['Estado NO_CONNECTORS visto en WS', statesSeen.includes('NO_CONNECTORS')],
    ['EV4 pudo cargar tras liberar conector', ev4Started],
    [
      'Estado final con conectores libres o AVAILABLE',
      finalState.freeConnectors > 0 || finalState.state === 'AVAILABLE',
    ],
  ];

  console.log('\n=== Validaciones ===');
  let allOk = true;
  for (const [label, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${label}`);
    if (!ok) allOk = false;
  }

  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
