/**
 * Precios y cargas de demo en USD.
 * Referencia: red pública DC fast (~$0.38–0.48/kWh, estilo Supercharger EE.UU.)
 * Las sesiones representan ~25–45% de la batería según el vehículo en auth seed.
 */
const roundUsd = (value) => Math.round(value * 100) / 100;

const STATION_PRICES_USD = {
  poblado: 0.42,
  estadio: 0.38,
  laureles: 0.4,
  disabled: 0.36,
};

const SESSIONS = {
  juanPaid: {
    stationKey: 'poblado',
    requestedKwh: 32,
    deliveredKwh: 32,
    // Model 3 75 kWh → ~43% de batería
  },
  mariaPending: {
    stationKey: 'laureles',
    requestedKwh: 35,
    deliveredKwh: 22,
    // Model Y 82 kWh → detuvo en ~27% entregado
  },
  blockedOverdue: {
    stationKey: 'poblado',
    requestedKwh: 28,
    deliveredKwh: 28,
    // Model 3 60 kWh → ~47% de batería
  },
  mariaRejected: {
    stationKey: 'poblado',
    requestedKwh: 45,
    deliveredKwh: 0,
    // Model Y 82 kWh → intento alto rechazado por saturación
  },
};

function sessionPriceSnapshot(sessionKey) {
  const session = SESSIONS[sessionKey];
  return STATION_PRICES_USD[session.stationKey];
}

function sessionTotal(sessionKey) {
  const session = SESSIONS[sessionKey];
  return roundUsd(session.deliveredKwh * sessionPriceSnapshot(sessionKey));
}

module.exports = {
  STATION_PRICES_USD,
  SESSIONS,
  roundUsd,
  sessionPriceSnapshot,
  sessionTotal,
};
