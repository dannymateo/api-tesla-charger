import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
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
import { AuthenticatedUser } from '../../../../../domain/model/authenticated-user';
import { StationsRpcClient } from '../../../../messaging/stations-rpc.client';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import {
  CreateStationDto,
  StationIdParamDto,
  ToggleStationDto,
  UpdateStationDto,
  UpdateStationPriceDto,
} from './stations.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';

@ApiTags('Stations')
@Controller()
export class StationsController {
  constructor(private readonly stationsRpcClient: StationsRpcClient) {}

  @Get('stations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar estaciones habilitadas para conductores' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Listado de estaciones publicas.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  listPublicStations() {
    return this.stationsRpcClient.listPublic();
  }

  @Get('stations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Consultar detalle de una estacion' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Estacion encontrada.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  getStation(@Param() params: StationIdParamDto) {
    return this.stationsRpcClient.get({ id: params.id });
  }

  @Get('stations/:id/state')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Consultar estado en tiempo real de una estacion' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Estado actual de la estacion.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  getStationRealtimeState(@Param() params: StationIdParamDto) {
    return this.stationsRpcClient.getState({ id: params.id });
  }

  @Get('admin/stations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar estaciones (admin, incluye deshabilitadas)' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Listado administrativo de estaciones.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  listAdminStations(@CurrentUser() user: AuthenticatedUser) {
    this.ensureAdmin(user);
    return this.stationsRpcClient.listAdmin();
  }

  @Post('admin/stations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear estacion (admin)' })
  @ApiBearerAuth('BearerAuth')
  @ApiBody({ type: CreateStationDto })
  @ApiResponse({ status: 201, description: 'Estacion creada.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  createStation(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateStationDto) {
    this.ensureAdmin(user);
    return this.stationsRpcClient.create(body);
  }

  @Patch('admin/stations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar estacion (admin)' })
  @ApiBearerAuth('BearerAuth')
  @ApiBody({ type: UpdateStationDto })
  @ApiResponse({ status: 200, description: 'Estacion actualizada.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  updateStation(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: StationIdParamDto,
    @Body() body: UpdateStationDto,
  ) {
    this.ensureAdmin(user);
    return this.stationsRpcClient.update({ id: params.id, ...body });
  }

  @Patch('admin/stations/:id/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Habilitar o deshabilitar estacion (admin)' })
  @ApiBearerAuth('BearerAuth')
  @ApiBody({ type: ToggleStationDto })
  @ApiResponse({ status: 200, description: 'Estado de estacion actualizado.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  toggleStation(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: StationIdParamDto,
    @Body() body: ToggleStationDto,
  ) {
    this.ensureAdmin(user);
    return this.stationsRpcClient.toggle({ id: params.id, enabled: body.enabled });
  }

  @Patch('admin/stations/:id/price')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar precio por kWh de estacion (admin)' })
  @ApiBearerAuth('BearerAuth')
  @ApiBody({ type: UpdateStationPriceDto })
  @ApiResponse({ status: 200, description: 'Precio por kWh actualizado.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  updateStationPrice(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: StationIdParamDto,
    @Body() body: UpdateStationPriceDto,
  ) {
    this.ensureAdmin(user);
    return this.stationsRpcClient.updatePrice({ id: params.id, pricePerKwh: body.pricePerKwh });
  }

  @Delete('admin/stations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eliminar estacion (admin)' })
  @ApiBearerAuth('BearerAuth')
  @ApiResponse({ status: 200, description: 'Estacion eliminada.' })
  @ApiUnauthorizedResponse({ description: 'JWT invalido o expirado.' })
  deleteStation(@CurrentUser() user: AuthenticatedUser, @Param() params: StationIdParamDto) {
    this.ensureAdmin(user);
    return this.stationsRpcClient.delete({ id: params.id });
  }

  private ensureAdmin(user: AuthenticatedUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin role required');
    }
  }
}
