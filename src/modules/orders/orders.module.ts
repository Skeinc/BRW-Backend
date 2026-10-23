import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ProductsModule } from '../products/products.module.js';
import { ORDER_THROTTLE_LIMIT, ORDER_THROTTLE_TTL_MS } from './constants/orders.constants.js';
import { AdminOrdersController } from './admin/admin-orders.controller.js';
import { OrdersController } from './orders.controller.js';
import { OrdersRepository } from './orders.repository.js';
import { OrdersService } from './orders.service.js';

/** Wires the orders feature. */
@Module({
  imports: [ProductsModule, ThrottlerModule.forRoot([{ limit: ORDER_THROTTLE_LIMIT, ttl: ORDER_THROTTLE_TTL_MS }])],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
