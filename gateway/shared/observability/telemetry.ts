import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | undefined;

export function initTelemetry(serviceName: string): void {
  if (process.env.OTEL_ENABLED === 'false') {
    return;
  }

  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://jaeger:4318/v1/traces';

  sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  const shutdown = () => {
    void sdk?.shutdown();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
