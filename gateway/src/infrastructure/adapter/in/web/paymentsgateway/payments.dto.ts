import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString, IsUUID } from 'class-validator';

export class CreatePayPalPaymentDto {
  @ApiProperty({
    type: [String],
    description: 'IDs de facturas PENDING u OVERDUE a pagar',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  invoiceIds!: string[];
}
