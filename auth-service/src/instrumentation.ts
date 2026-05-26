import { initMetrics, initTelemetry } from '../shared/observability';

initTelemetry('auth-service');
initMetrics('auth-service');
