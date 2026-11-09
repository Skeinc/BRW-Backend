import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CARDS_MAX, CARDS_MIN, LOANS_MAX, LOANS_MIN } from '../constants/installment-page.constants.js';
import { InstallmentPageCardDto } from './installment-page-card.dto.js';
import { InstallmentPageLoanDto } from './installment-page-loan.dto.js';

/** Body of PUT /api/admin/installment-page: the whole editable content of the page. */
export class SaveInstallmentPageDto {
  @ApiProperty({ type: [InstallmentPageCardDto], description: 'Installment cards in order' })
  @IsArray()
  @ArrayMinSize(CARDS_MIN)
  @ArrayMaxSize(CARDS_MAX)
  @ValidateNested({ each: true })
  @Type(() => InstallmentPageCardDto)
  cards: InstallmentPageCardDto[];

  @ApiProperty({ type: [InstallmentPageLoanDto], description: 'Bank loans in order' })
  @IsArray()
  @ArrayMinSize(LOANS_MIN)
  @ArrayMaxSize(LOANS_MAX)
  @ValidateNested({ each: true })
  @Type(() => InstallmentPageLoanDto)
  loans: InstallmentPageLoanDto[];
}
