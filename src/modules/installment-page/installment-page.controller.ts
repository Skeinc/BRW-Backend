import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InstallmentPageService } from './installment-page.service.js';
import type { InstallmentPageResponse } from './types/installment-page.types.js';

/** Public HTTP endpoint of the "Installment" page content under `/api/installment-page`. */
@ApiTags('catalog')
@Controller('installment-page')
export class InstallmentPageController {
  constructor(private readonly installmentPageService: InstallmentPageService) {}

  /** Editable blocks of the page. */
  @Get()
  @ApiOperation({ summary: 'Editable blocks of the Installment page; content is null until saved' })
  get(): Promise<InstallmentPageResponse> {
    return this.installmentPageService.get();
  }
}
