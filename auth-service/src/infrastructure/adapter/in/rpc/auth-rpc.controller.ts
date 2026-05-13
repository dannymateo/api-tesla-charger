import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthApplicationService } from '../../../../application/service/auth.application-service';

@Controller()
export class AuthRpcController {
  constructor(private readonly authApplicationService: AuthApplicationService) {}

  @MessagePattern('auth.register')
  register(
    @Payload()
    payload: { email: string; password: string; vehicleModel: string; batteryKwh: number },
  ) {
    return this.authApplicationService.register(payload);
  }

  @MessagePattern('auth.login')
  login(@Payload() payload: { email: string; password: string }) {
    return this.authApplicationService.login(payload);
  }

  @MessagePattern('auth.profile.get')
  getProfile(@Payload() payload: { userId: string }) {
    return this.authApplicationService.getProfile(payload.userId);
  }

  @MessagePattern('auth.profile.update')
  updateProfile(@Payload() payload: { userId: string; vehicleModel?: string; batteryKwh?: number }) {
    return this.authApplicationService.updateProfile(payload.userId, payload);
  }

  @MessagePattern('auth.admin.users_overdue')
  usersOverdue() {
    return this.authApplicationService.listUsersWithOverdueDebt();
  }

  @MessagePattern('auth.user.is_blocked')
  isBlocked(@Payload() payload: { userId: string }) {
    return this.authApplicationService.isUserBlocked(payload.userId);
  }
}
