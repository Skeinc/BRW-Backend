import { Module } from '@nestjs/common';
import { AdminDeliveryPageController } from './admin/admin-delivery-page.controller.js';
import { DeliveryPageController } from './delivery-page.controller.js';
import { DeliveryPageRepository } from './delivery-page.repository.js';
import { DeliveryPageService } from './delivery-page.service.js';

/** Wires the editable "Delivery and payment" page content. */
@Module({
  controllers: [DeliveryPageController, AdminDeliveryPageController],
  providers: [DeliveryPageRepository, DeliveryPageService],
})
export class DeliveryPageModule {}
