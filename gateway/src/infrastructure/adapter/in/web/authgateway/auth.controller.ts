import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginDto, RegisterDto, UpdateProfileDto } from './auth.dto';
import { AuthRpcClient } from '../../../../messaging/auth-rpc.client';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../../domain/model/authenticated-user';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authRpcClient: AuthRpcClient) {}

  @Post('auth/register')
  @ApiOperation({ summary: 'Registrar usuario conductor' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Usuario registrado.' })
  register(@Body() body: RegisterDto) {
    return this.authRpcClient.register(body);
  }

  @Post('auth/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesion de usuario' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login exitoso y JWT emitido.' })
  login(@Body() body: LoginDto) {
    return this.authRpcClient.login(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Consultar perfil autenticado' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Perfil del usuario actual.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authRpcClient.getProfile({ userId: user.sub });
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
  @ApiBearerAuth('BearerAuth')
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Perfil actualizado.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateProfileDto) {
    return this.authRpcClient.updateProfile({
      userId: user.sub,
      vehicleModel: body.vehicleModel,
      batteryKwh: body.batteryKwh,
    });
  }

  @Get('admin/users/overdue')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar usuarios con deuda vencida' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Listado de usuarios bloqueados.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  usersOverdue(@CurrentUser() user: AuthenticatedUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin role required');
    }
    return this.authRpcClient.listUsersOverdue();
  }
}
