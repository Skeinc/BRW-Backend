import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { MONTHS_MAX, MONTHS_MIN, SHORT_TEXT_MAX_LENGTH } from '../constants/installment-page.constants.js';

/** An installment card. */
export class InstallmentPageCardDto {
  @ApiProperty({ example: 'Карта рассрочки' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  note: string;

  @ApiProperty({ example: 'Халва' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  name: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(MONTHS_MIN)
  @Max(MONTHS_MAX)
  months: number;

  @ApiProperty({ example: 'Без процентов' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  rate: string;

  @ApiProperty({ example: 'до 15 числа каждого месяца', description: 'Empty hides the line' })
  @IsString()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  payment: string;
}
