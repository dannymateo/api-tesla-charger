export abstract class SessionEventsPort {
  abstract publishSessionClosed(payload: unknown): Promise<void>;
  abstract publishSessionProgress(payload: unknown): Promise<void>;
}
