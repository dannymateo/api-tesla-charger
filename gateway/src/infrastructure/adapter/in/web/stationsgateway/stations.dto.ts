import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateStationDto {
  @ApiProperty({ example: 'Estacion Poblado Norte' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Cra 43A #10-20, Medellin' })
  @IsString()
  address!: string;

  @ApiProperty({ example: 6.2088 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: -75.5681 })
  @IsLongitude()
  lng!: number;

  @ApiProperty({ example: 8 })
  @IsNumber()
  @Min(1)
  connectorsTotal!: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxKwThreshold?: number;

  @ApiProperty({ example: 1450.5 })
  @IsNumber()
  @Min(0)
  pricePerKwh!: number;
}

export class UpdateStationDto {
  @ApiPropertyOptional({ example: 'Estacion Laureles Centro' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Calle 33 #76-22, Medellin' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 6.245 })
  @IsOptional()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: -75.597 })
  @IsOptional()
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  connectorsTotal?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxKwThreshold?: number;

  @ApiPropertyOptional({ example: 1600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerKwh?: number;
}

export class ToggleStationDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  enabled!: boolean;
}

export class UpdateStationPriceDto {
  @ApiProperty({ example: 1700 })
  @IsNumber()
  @Min(0)
  pricePerKwh!: number;
}

export class StationIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}
