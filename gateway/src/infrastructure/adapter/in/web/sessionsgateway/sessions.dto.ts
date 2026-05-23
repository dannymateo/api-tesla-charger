import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class StartSessionDto {
  @ApiProperty({ format: 'uuid', example: '11111111-1111-1111-1111-111111111111' })
  @IsUUID()
  stationId!: string;

  @ApiProperty({ example: 20, description: 'kWh solicitados para la carga (minimo 1)' })
  @IsNumber()
  @Min(1)
  requestedKwh!: number;
}

export class SessionIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}
