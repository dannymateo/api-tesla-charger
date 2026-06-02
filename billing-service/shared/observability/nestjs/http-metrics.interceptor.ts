import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { recordHttpRequest } from '../metrics';

type HttpRequestLike = {
  method: string;
  route?: { path?: string };
  baseUrl?: string;
  path?: string;
};

type HttpResponseLike = {
  statusCode: number;
};

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<HttpRequestLike>();
    const res = http.getResponse<HttpResponseLike>();
    const started = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => this.observe(req, res, started),
        error: () => this.observe(req, res, started),
      }),
    );
  }

  private observe(req: HttpRequestLike, res: HttpResponseLike, started: bigint): void {
    const route = req.route?.path ?? req.baseUrl ?? req.path ?? 'unknown';
    const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
    recordHttpRequest(req.method, route, res.statusCode, durationSeconds);
  }
}
