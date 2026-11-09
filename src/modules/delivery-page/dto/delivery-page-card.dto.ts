import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CARD_TEXT_MAX_LENGTH, CARD_TITLE_MAX_LENGTH } from '../constants/delivery-page.constants.js';

/** A card with a title and a text. */
export class DeliveryPageCardDto {
  @ApiProperty({ example: 'Стоимость' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(CARD_TITLE_MAX_LENGTH)
  title: string;

  @ApiProperty({ example: 'Менеджер сообщит стоимость при подтверждении заказа.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(CARD_TEXT_MAX_LENGTH)
  text: string;
}
