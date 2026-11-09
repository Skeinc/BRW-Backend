import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SaveInstallmentPageDto } from '../dto/save-installment-page.dto.js';
import { InstallmentPageService } from '../installment-page.service.js';
import type { InstallmentPageResponse } from '../types/installment-page.types.js';

/** HTTP endpoints of the "Installment" page content under `/api/admin/installment-page` (admin cookie required). */
@ApiTags('admin-installment-page')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/installment-page')
export class AdminInstallmentPageController {
  constructor(private readonly installmentPageService: InstallmentPageService) {}

  /** Saved content; null until the first save. */
  @Get()
  @ApiOperation({ summary: 'Saved page content; content is null until the first save' })
  get(): Promise<InstallmentPageResponse> {
    return this.installmentPageService.get();
  }

  /** Replace the whole content. */
  @Put()
  @ApiOperation({ summary: 'Replace the whole editable content of the page' })
  save(@Body() dto: SaveInstallmentPageDto): Promise<InstallmentPageResponse> {
    return this.installmentPageService.save(dto);
  }
}
