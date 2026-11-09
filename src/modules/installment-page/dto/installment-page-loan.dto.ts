import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';
import {
  BADGES_MAX,
  DETAILS_MAX,
  FACTS_MAX,
  LONG_TEXT_MAX_LENGTH,
  SHORT_TEXT_MAX_LENGTH,
  STEPS_MAX,
} from '../constants/installment-page.constants.js';
import { InstallmentPageLabeledValueDto } from './installment-page-labeled-value.dto.js';

/** A bank loan or installment offer. */
export class InstallmentPageLoanDto {
  @ApiProperty({ example: 'Сбер Банк' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  bank: string;

  @ApiProperty({ example: 'Рассрочка «Купи со Сбер Банком!» на 6 месяцев' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  name: string;

  @ApiProperty({ type: [String], example: ['На белорусские товары'] })
  @IsArray()
  @ArrayMaxSize(BADGES_MAX)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(SHORT_TEXT_MAX_LENGTH, { each: true })
  badges: string[];

  @ApiProperty({ example: '6 мес.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SHORT_TEXT_MAX_LENGTH)
  term: string;

  @ApiProperty({ example: '0,0001% годовых' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LONG_TEXT_MAX_LENGTH)
  rate: string;

  @ApiProperty({ type: [InstallmentPageLabeledValueDto] })
  @IsArray()
  @ArrayMaxSize(FACTS_MAX)
  @ValidateNested({ each: true })
  @Type(() => InstallmentPageLabeledValueDto)
  facts: InstallmentPageLabeledValueDto[];

  @ApiProperty({ type: [InstallmentPageLabeledValueDto], description: '"Requirements and documents" accordion' })
  @IsArray()
  @ArrayMaxSize(DETAILS_MAX)
  @ValidateNested({ each: true })
  @Type(() => InstallmentPageLabeledValueDto)
  details: InstallmentPageLabeledValueDto[];

  @ApiProperty({ type: [String], description: '"Order of application" accordion' })
  @IsArray()
  @ArrayMaxSize(STEPS_MAX)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(LONG_TEXT_MAX_LENGTH, { each: true })
  steps: string[];
}
