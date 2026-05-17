export enum SessionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  STOPPED = 'STOPPED',
  REJECTED = 'REJECTED',
}

export function parseSessionStatus(value: string): SessionStatus {
  if (Object.values(SessionStatus).includes(value as SessionStatus)) {
    return value as SessionStatus;
  }
  throw new Error(`Invalid session status: ${value}`);
}
