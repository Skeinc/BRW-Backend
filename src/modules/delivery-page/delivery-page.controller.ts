import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeliveryPageService } from './delivery-page.service.js';
import type { DeliveryPageResponse } from './types/delivery-page.types.js';

/** Public HTTP endpoint of the "Delivery and payment" page content under `/api/delivery-page`. */
@ApiTags('catalog')
@Controller('delivery-page')
export class DeliveryPageController {
  constructor(private readonly deliveryPageService: DeliveryPageService) {}

  /** Editable blocks of the page. */
  @Get()
  @ApiOperation({ summary: 'Editable blocks of the Delivery and payment page; content is null until saved' })
  get(): Promise<DeliveryPageResponse> {
    return this.deliveryPageService.get();
  }
}
