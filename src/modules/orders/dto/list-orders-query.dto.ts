import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/lib/pagination-query.dto.js';
import { orderStatus } from '../../../database/schema/order-status.js';
import type { OrderStatusValue } from '../orders.types.js';

export class ListOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: orderStatus.enumValues })
  @IsOptional()
  @IsIn(orderStatus.enumValues)
  status?: OrderStatusValue;
}
