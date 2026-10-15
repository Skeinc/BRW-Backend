import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersRepository } from './orders.repository.js';
import { OrdersService } from './orders.service.js';

/** Wires the orders feature. */
@Module({
  controllers: [OrdersController],
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
