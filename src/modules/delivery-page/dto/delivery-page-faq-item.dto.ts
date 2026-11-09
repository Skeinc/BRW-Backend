import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { FAQ_ANSWER_MAX_LENGTH, FAQ_QUESTION_MAX_LENGTH } from '../constants/delivery-page.constants.js';

/** One question of the FAQ accordion. */
export class DeliveryPageFaqItemDto {
  @ApiProperty({ example: 'Доставка платная или бесплатная?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(FAQ_QUESTION_MAX_LENGTH)
  question: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(FAQ_ANSWER_MAX_LENGTH)
  answer: string;
}
