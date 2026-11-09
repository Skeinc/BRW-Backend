import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';
import {
  DELIVERY_CARDS_COUNT,
  DOCUMENT_MAX_LENGTH,
  DOCUMENTS_MAX,
  DOCUMENTS_MIN,
  FAQ_ITEMS_MAX,
  PAYMENT_CARDS_COUNT,
  RECEIVING_STEPS_MAX,
  RECEIVING_STEPS_MIN,
} from '../constants/delivery-page.constants.js';
import { DeliveryPageCardDto } from './delivery-page-card.dto.js';
import { DeliveryPagePaymentCardDto } from './delivery-page-payment-card.dto.js';
import { DeliveryPageFaqItemDto } from './delivery-page-faq-item.dto.js';

/** Body of PUT /api/admin/delivery-page: the whole editable content of the page. */
export class SaveDeliveryPageDto {
  @ApiProperty({ type: [DeliveryPagePaymentCardDto], description: 'Exactly 3 payment method cards' })
  @IsArray()
  @ArrayMinSize(PAYMENT_CARDS_COUNT)
  @ArrayMaxSize(PAYMENT_CARDS_COUNT)
  @ValidateNested({ each: true })
  @Type(() => DeliveryPagePaymentCardDto)
  payment: DeliveryPagePaymentCardDto[];

  @ApiProperty({ type: [DeliveryPageCardDto], description: 'Exactly 3 delivery cards' })
  @IsArray()
  @ArrayMinSize(DELIVERY_CARDS_COUNT)
  @ArrayMaxSize(DELIVERY_CARDS_COUNT)
  @ValidateNested({ each: true })
  @Type(() => DeliveryPageCardDto)
  delivery: DeliveryPageCardDto[];

  @ApiProperty({ type: [DeliveryPageCardDto], description: 'Order receiving steps in order' })
  @IsArray()
  @ArrayMinSize(RECEIVING_STEPS_MIN)
  @ArrayMaxSize(RECEIVING_STEPS_MAX)
  @ValidateNested({ each: true })
  @Type(() => DeliveryPageCardDto)
  receiving: DeliveryPageCardDto[];

  @ApiProperty({ type: [String], description: 'Documents handed over with the order' })
  @IsArray()
  @ArrayMinSize(DOCUMENTS_MIN)
  @ArrayMaxSize(DOCUMENTS_MAX)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(DOCUMENT_MAX_LENGTH, { each: true })
  documents: string[];

  @ApiProperty({ type: [DeliveryPageFaqItemDto], description: 'FAQ items in order; may be empty' })
  @IsArray()
  @ArrayMaxSize(FAQ_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => DeliveryPageFaqItemDto)
  faq: DeliveryPageFaqItemDto[];
}
