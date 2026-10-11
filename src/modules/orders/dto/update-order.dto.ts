import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { orderStatus } from '../../../database/schema/order-status.js';
import type { OrderStatusValue } from '../orders.types.js';

export class UpdateOrderDto {
  @ApiProperty({ enum: orderStatus.enumValues })
  @IsIn(orderStatus.enumValues)
  status: OrderStatusValue;
}
