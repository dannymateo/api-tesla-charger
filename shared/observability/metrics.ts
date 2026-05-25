import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

let registry: Registry | undefined;
let httpRequestDuration: Histogram<'method' | 'route' | 'status_code'> | undefined;
let httpRequestsTotal: Counter<'method' | 'route' | 'status_code'> | undefined;

export function initMetrics(serviceName: string): Registry {
  if (registry) {
    return registry;
  }

  registry = new Registry();
  registry.setDefaultLabels({ service: serviceName });
  collectDefaultMetrics({ register: registry });

  httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });

  httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [registry],
  });

  return registry;
}

export function getMetricsRegistry(): Registry {
  if (!registry) {
    throw new Error('Metrics not initialized. Call initMetrics() first.');
  }
  return registry;
}

export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number,
): void {
  const labels = {
    method,
    route,
    status_code: String(statusCode),
  };
  httpRequestsTotal?.inc(labels);
  httpRequestDuration?.observe(labels, durationSeconds);
}

export async function getMetricsContent(): Promise<string> {
  return getMetricsRegistry().metrics();
}
