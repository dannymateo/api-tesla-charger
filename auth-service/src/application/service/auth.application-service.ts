import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { UserRole } from '../../domain/enum/user-role.enum';
import { PublicUser } from '../../domain/model/public-user';
import { User } from '../../domain/model/user';
import {
  IBlockUserForOverdueUseCase,
  IGetProfileUseCase,
  IHandleInvoicesPaidUseCase,
  IIsUserBlockedUseCase,
  IListUsersOverdueUseCase,
  ILoginUseCase,
  IRegisterUseCase,
  IUpdateProfileUseCase,
} from '../port/in/auth.use-cases';
import { JwtTokenPort } from '../port/out/jwt-token.port';
import { NotificationEventsPort } from '../port/out/notification-events.port';
import { UserRepositoryPort } from '../port/out/user-repository.port';

@Injectable()
export class AuthApplicationService
  implements
    IRegisterUseCase,
    ILoginUseCase,
    IGetProfileUseCase,
    IUpdateProfileUseCase,
    IListUsersOverdueUseCase,
    IIsUserBlockedUseCase,
    IHandleInvoicesPaidUseCase,
    IBlockUserForOverdueUseCase
{
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly jwtTokenPort: JwtTokenPort,
    private readonly notificationEvents: NotificationEventsPort,
  ) {}

  async register(input: {
    email: string;
    password: string;
    vehicleModel: string;
    batteryKwh: number;
  }) {
    const email = User.normalizeEmail(input.email);
    const exists = await this.userRepository.findByEmail(email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const user = await this.userRepository.create(
      User.createNew({
        email,
        passwordHash: await hash(input.password, 10),
        role: UserRole.USER,
        vehicleModel: input.vehicleModel,
        batteryKwh: input.batteryKwh,
        isBlocked: false,
      }),
    );

    void this.notificationEvents.publishEmailNotification({
      type: 'REGISTRATION',
      to: user.email,
      headline: 'Bienvenido a Tesla Supercharger',
      description:
        'Tu cuenta ha sido creada correctamente. Ya puedes consultar estaciones y comenzar a cargar tu vehículo en Medellín.',
      details: [
        { label: 'Email', value: user.email },
        { label: 'Vehículo', value: user.vehicleModel },
        { label: 'Batería', value: `${user.batteryKwh} kWh` },
      ],
      ctaLabel: 'Abrir mapa de estaciones',
      ctaUrl: `${process.env.APP_URL ?? 'http://localhost:3001'}/driver/map`,
    });

    return PublicUser.fromUser(user);
  }

  async login(input: { email: string; password: string }) {
    const user = await this.userRepository.findByEmail(User.normalizeEmail(input.email));
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await compare(input.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtTokenPort.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: PublicUser.fromUser(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return PublicUser.fromUser(user);
  }

  async updateProfile(userId: string, input: { vehicleModel?: string; batteryKwh?: number }) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const updated = await this.userRepository.update(userId, user.withProfileUpdate(input));
    return PublicUser.fromUser(updated);
  }

  async listUsersWithOverdueDebt() {
    const blockedUsers = await this.userRepository.findBlockedUsers();
    return blockedUsers.map((user) => PublicUser.fromUser(user));
  }

  async isUserBlocked(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { isBlocked: user.isBlocked };
  }

  async handleInvoicesPaid(payload: { userId: string; hasRemainingOverdue: boolean }) {
    if (payload.hasRemainingOverdue) {
      return { unblocked: false, reason: 'still_has_overdue_invoices' };
    }
    return this.unblockUser(payload.userId);
  }

  private async unblockUser(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { unblocked: false, reason: 'user_not_found' };
    }
    if (!user.isBlocked) {
      return { unblocked: false, reason: 'already_unblocked' };
    }
    await this.userRepository.update(userId, user.withBlocked(false));
    return { unblocked: true };
  }

  async blockUserForOverdueDebt(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { updated: false, reason: 'user_not_found' };
    }
    if (user.isBlocked) {
      return { updated: false, reason: 'already_blocked' };
    }
    await this.userRepository.update(userId, user.withBlocked(true));
    return { updated: true };
  }
}
