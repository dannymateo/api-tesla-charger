import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TimeoutError } from 'rxjs';

type RpcErrorPayload = {
  statusCode: number;
  body: string | Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function normalizeBody(message: unknown, fallback: string): string | Record<string, unknown> {
  if (typeof message === 'string') {
    return message || fallback;
  }
  const record = asRecord(message);
  if (record) {
    return record;
  }
  return fallback;
}

function payloadFromRecord(record: Record<string, unknown>, fallbackMessage: string): RpcErrorPayload | null {
  const statusCode =
    typeof record.statusCode === 'number'
      ? record.statusCode
      : typeof record.status === 'number'
        ? record.status
        : undefined;

  if (statusCode === undefined || statusCode < 400) {
    return null;
  }

  return {
    statusCode,
    body: normalizeBody(record.message ?? record.error, fallbackMessage),
  };
}

function extractRpcErrorPayload(error: unknown): RpcErrorPayload | null {
  const record = asRecord(error);
  if (!record) {
    return null;
  }

  const direct = payloadFromRecord(record, 'Request failed');
  if (direct) {
    return direct;
  }

  const nestedError = asRecord(record.error);
  if (nestedError) {
    const fromError = payloadFromRecord(nestedError, 'Request failed');
    if (fromError) {
      return fromError;
    }
  }

  const nestedMessage = asRecord(record.message);
  if (nestedMessage) {
    const nested = payloadFromRecord(nestedMessage, 'Request failed');
    if (nested) {
      return nested;
    }
    if (typeof nestedMessage.code === 'string') {
      return {
        statusCode: typeof nestedMessage.statusCode === 'number' ? nestedMessage.statusCode : 409,
        body: nestedMessage,
      };
    }
  }

  if (typeof record.message === 'string') {
    try {
      const parsed = JSON.parse(record.message) as Record<string, unknown>;
      const parsedPayload = payloadFromRecord(parsed, record.message);
      if (parsedPayload) {
        return parsedPayload;
      }
    } catch {
      // plain string message without status — not a mapped RPC error
    }
  }

  const response = asRecord(record.response);
  if (response) {
    return payloadFromRecord(response, 'Request failed');
  }

  return null;
}

function toHttpException(payload: RpcErrorPayload): HttpException {
  const { statusCode, body } = payload;

  switch (statusCode) {
    case 400:
      return new BadRequestException(body);
    case 401:
      return new UnauthorizedException(body);
    case 403:
      return new ForbiddenException(body);
    case 404:
      return new NotFoundException(body);
    case 409:
      return new ConflictException(body);
    case 422:
      return new UnprocessableEntityException(body);
    default:
      return new HttpException(body, statusCode);
  }
}

export function rethrowRpcError(error: unknown, serviceName: string): never {
  if (error instanceof HttpException) {
    throw error;
  }

  if (error instanceof TimeoutError) {
    throw new GatewayTimeoutException(`${serviceName} did not respond in time`);
  }

  const payload = extractRpcErrorPayload(error);
  if (payload) {
    throw toHttpException(payload);
  }

  throw new ServiceUnavailableException(`${serviceName} unavailable`);
}
