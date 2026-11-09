import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { DeliveryPageCardDto } from './delivery-page-card.dto.js';

/** A payment method card that can be hidden from the public page. */
export class DeliveryPagePaymentCardDto extends DeliveryPageCardDto {
  @ApiPropertyOptional({ default: true, description: 'false hides the card on the public page' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
