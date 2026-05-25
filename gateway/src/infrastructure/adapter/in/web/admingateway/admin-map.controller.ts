import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminMapService } from '../../../../../application/service/admin-map.service';
import { AuthenticatedUser } from '../../../../../domain/model/authenticated-user';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';

@ApiTags('Admin')
@Controller()
export class AdminMapController {
  constructor(private readonly adminMapService: AdminMapService) {}

  @Get('admin/map')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Mapa admin con estado, sesiones activas e ingresos del dia por estacion',
  })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Agregado administrativo del mapa.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  getAdminMap(@CurrentUser() user: AuthenticatedUser) {
    if (!user.isAdmin()) {
      throw new ForbiddenException('Admin role required');
    }
    return this.adminMapService.getAdminMap();
  }
}
