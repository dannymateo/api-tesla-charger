import { initMetrics, initTelemetry } from '../shared/observability';

initTelemetry('notification-service');
initMetrics('notification-service');
