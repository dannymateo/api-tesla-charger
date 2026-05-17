import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SessionsApplicationService } from '../../../../application/service/sessions.application-service';

@Controller()
export class SessionsRpcController {
  constructor(private readonly sessionsApplicationService: SessionsApplicationService) {}

  @MessagePattern('sessions.start')
  start(@Payload() payload: { userId: string; stationId: string; requestedKwh: number }) {
    return this.sessionsApplicationService.startSession(payload);
  }

  @MessagePattern('sessions.stop')
  stop(@Payload() payload: { sessionId: string; userId: string }) {
    return this.sessionsApplicationService.stopSession(payload.sessionId, payload.userId);
  }

  @MessagePattern('sessions.get')
  get(@Payload() payload: { sessionId: string; userId?: string }) {
    return this.sessionsApplicationService.getSession(payload.sessionId, payload.userId);
  }

  @MessagePattern('sessions.list_for_user')
  listForUser(@Payload() payload: { userId: string }) {
    return this.sessionsApplicationService.listForUser(payload.userId);
  }

  @MessagePattern('sessions.list_active')
  listActive() {
    return this.sessionsApplicationService.listActive();
  }

  @MessagePattern('sessions.count_active_by_station')
  countActiveByStation(@Payload() payload: { stationId: string }) {
    return this.sessionsApplicationService.countActiveByStation(payload.stationId);
  }
}
