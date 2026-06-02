import { createServer, type Server } from 'http';
import { getMetricsContent } from './metrics';

export function startSidecarServer(
  serviceName: string,
  port = Number(process.env.HEALTH_PORT ?? 3000),
): Server {
  const server = createServer(async (req, res) => {
    const path = req.url?.split('?')[0];

    if (path === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: serviceName }));
      return;
    }

    if (path === '/metrics') {
      try {
        const body = await getMetricsContent();
        res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' });
        res.end(body);
      } catch {
        res.writeHead(503);
        res.end('metrics not ready');
      }
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port);
  return server;
}
