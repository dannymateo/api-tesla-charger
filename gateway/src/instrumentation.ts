import { initMetrics, initTelemetry } from '../shared/observability';

initTelemetry('gateway');
initMetrics('gateway');
