import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { LONG_TEXT_MAX_LENGTH, SHORT_TEXT_MAX_LENGTH } from '../constants/installment-page.constants.js';

/** A label and its value. */
export class InstallmentPageLabeledValueDto {
  @ApiProperty({ example: 'Сумма' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  label: string;

  @ApiProperty({ example: '300–35 000 руб.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LONG_TEXT_MAX_LENGTH)
  value: string;
}
