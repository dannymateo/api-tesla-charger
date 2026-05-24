import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class InvoiceIdParamDto {
  @IsString()
  id!: string;
}

export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'PAID', 'OVERDUE'] })
  @IsOptional()
  @IsIn(['PENDING', 'PAID', 'OVERDUE'])
  status?: string;

  @ApiPropertyOptional({ example: '2026-05', description: 'Mes en formato YYYY-MM' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;
}
