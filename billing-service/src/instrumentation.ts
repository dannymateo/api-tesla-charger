import { initMetrics, initTelemetry } from '../shared/observability';

initTelemetry('billing-service');
initMetrics('billing-service');
