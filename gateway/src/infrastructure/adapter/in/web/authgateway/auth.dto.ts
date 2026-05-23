import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'driver@tesla.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Tesla123!' })
  @IsString()
  password!: string;

  @ApiProperty({ example: 'Tesla Model 3' })
  @IsString()
  vehicleModel!: string;

  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(1)
  batteryKwh!: number;
}

export class LoginDto {
  @ApiProperty({ example: 'driver@tesla.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Tesla123!' })
  @IsString()
  password!: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Tesla Model Y' })
  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @ApiPropertyOptional({ example: 75 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  batteryKwh?: number;
}
