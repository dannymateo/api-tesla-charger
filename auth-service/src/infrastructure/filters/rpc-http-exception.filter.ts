import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch()
export class RpcHttpExceptionFilter extends BaseRpcExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): Observable<unknown> {
    if (host.getType() !== 'rpc') {
      throw exception;
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      const payload =
        typeof response === 'string'
          ? { statusCode, message: response }
          : { statusCode, ...(response as Record<string, unknown>) };

      return throwError(() => payload);
    }

    if (exception instanceof RpcException) {
      const error = exception.getError();
      if (typeof error === 'object' && error !== null && typeof (error as { statusCode?: unknown }).statusCode === 'number') {
        return throwError(() => error);
      }
      const message = typeof error === 'string' ? error : 'Internal server error';
      return throwError(() => ({ statusCode: 500, message }));
    }

    return super.catch(exception, host);
  }
}
