import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { DeliveryPageService } from '../delivery-page.service.js';
import { SaveDeliveryPageDto } from '../dto/save-delivery-page.dto.js';
import type { DeliveryPageResponse } from '../types/delivery-page.types.js';

/** HTTP endpoints of the "Delivery and payment" page content under `/api/admin/delivery-page` (admin cookie required). */
@ApiTags('admin-delivery-page')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/delivery-page')
export class AdminDeliveryPageController {
  constructor(private readonly deliveryPageService: DeliveryPageService) {}

  /** Saved content; null until the first save. */
  @Get()
  @ApiOperation({ summary: 'Saved page content; content is null until the first save' })
  get(): Promise<DeliveryPageResponse> {
    return this.deliveryPageService.get();
  }

  /** Replace the whole content. */
  @Put()
  @ApiOperation({ summary: 'Replace the whole editable content of the page' })
  save(@Body() dto: SaveDeliveryPageDto): Promise<DeliveryPageResponse> {
    return this.deliveryPageService.save(dto);
  }
}
