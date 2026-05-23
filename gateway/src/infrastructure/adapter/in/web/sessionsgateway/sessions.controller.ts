import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
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
import { AuthenticatedUser } from '../../../../../domain/model/authenticated-user';
import { SessionsRpcClient } from '../../../../messaging/sessions-rpc.client';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { SessionIdParamDto, StartSessionDto } from './sessions.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';

@ApiTags('Sessions')
@Controller()
export class SessionsController {
  constructor(private readonly sessionsRpcClient: SessionsRpcClient) {}

  @Post('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Iniciar sesion de carga' })
  @ApiBearerAuth('BearerAuth')
  @ApiBody({ type: StartSessionDto })
  @ApiResponse({ status: 201, description: 'Sesion iniciada o estimacion devuelta.' })
  @ApiResponse({ status: 409, description: 'Sesion rechazada por regla de negocio.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  async startSession(@CurrentUser() user: AuthenticatedUser, @Body() body: StartSessionDto) {
    if (user.isAdmin()) {
      throw new ForbiddenException('Admins cannot start charging sessions');
    }
    return this.sessionsRpcClient.start({
      userId: user.sub,
      stationId: body.stationId,
      requestedKwh: body.requestedKwh,
    });
  }

  @Post('sessions/:id/stop')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detener sesion de carga manualmente' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Sesion detenida y facturacion parcial aplicada.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  stopSession(@CurrentUser() user: AuthenticatedUser, @Param() params: SessionIdParamDto) {
    return this.sessionsRpcClient.stop({ sessionId: params.id, userId: user.sub });
  }

  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Consultar sesion de carga' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Detalle de sesion.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  getSession(@CurrentUser() user: AuthenticatedUser, @Param() params: SessionIdParamDto) {
    return this.sessionsRpcClient.get({ sessionId: params.id, userId: user.sub });
  }

  @Get('me/sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Historial de sesiones del usuario autenticado' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Listado de sesiones del usuario.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  listMySessions(@CurrentUser() user: AuthenticatedUser) {
    return this.sessionsRpcClient.listForUser({ userId: user.sub });
  }
}
