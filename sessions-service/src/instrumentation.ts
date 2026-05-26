import { initMetrics, initTelemetry } from '../shared/observability';

initTelemetry('sessions-service');
initMetrics('sessions-service');
