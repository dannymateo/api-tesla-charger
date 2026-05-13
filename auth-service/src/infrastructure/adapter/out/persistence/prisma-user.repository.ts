import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../../../application/port/out/user-repository.port';
import { PrismaService } from './prisma.service';
import { toDomainUser } from './prisma-user.mapper';

@Injectable()
export class PrismaUserRepository extends UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? toDomainUser(user) : null;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toDomainUser(user) : null;
  }

  async create(data: Parameters<UserRepositoryPort['create']>[0]) {
    const user = await this.prisma.user.create({ data });
    return toDomainUser(user);
  }

  async update(id: string, data: Parameters<UserRepositoryPort['update']>[1]) {
    const user = await this.prisma.user.update({ where: { id }, data });
    return toDomainUser(user);
  }

  async findBlockedUsers() {
    const users = await this.prisma.user.findMany({ where: { isBlocked: true } });
    return users.map(toDomainUser);
  }
}
