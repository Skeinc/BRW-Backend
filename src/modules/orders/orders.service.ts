import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { buildPaginatedResult } from '../../common/lib/build-paginated-result.js';
import type { PaginatedResult } from '../../common/lib/pagination.types.js';
import { MailService } from '../../common/mail/mail.service.js';
import type { EnvironmentVariables } from '../../config/environment-variables.js';
import { fromMinorUnits } from '../../common/lib/from-minor-units.js';
import { toMinorUnits } from '../../common/lib/to-minor-units.js';
import { ProductsService } from '../products/products.service.js';
import type { ProductRecord } from '../products/types/products.types.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import type { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import { MAX_LINE_QUANTITY, ORDER_STATUS_TRANSITIONS } from './constants/orders.constants.js';
import { buildOrderNotification } from './lib/build-order-notification.js';
import { OrdersRepository } from './orders.repository.js';
import type {
  CreatedOrder,
  NewOrderLine,
  NewOrderValues,
  OrderListItem,
  OrderRecord,
  OrderStatus,
  OrderView,
  UnavailableItem,
} from './types/orders.types.js';

/** Order requests: the public checkout creates them, the admin browses them and changes the status. */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly productsService: ProductsService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  /**
   * Creates an order request from the storefront cart. Names, SKUs and prices come from the database; products that
   * are unpublished or out of stock fail the whole request with 409 ORDER_ITEM_UNAVAILABLE.
   */
  async create(dto: CreateOrderDto): Promise<CreatedOrder> {
    const quantities: Map<string, number> = this.mergeQuantities(dto);
    const products: ProductRecord[] = await this.productsService.findPublishedByIds([...quantities.keys()]);
    this.assertAllAvailable({ quantities, products });
    const lines: NewOrderLine[] = products.map((record) => ({
      productId: record.id,
      name: record.name,
      sku: record.sku,
      unitPrice: record.price,
      quantity: quantities.get(record.id) ?? 0,
    }));
    const { contactName, phone, email, deliveryMethod, city, address, paymentMethod, comment } = dto;
    const values: NewOrderValues = {
      contactName,
      phone,
      email,
      deliveryMethod,
      city: deliveryMethod === 'delivery' ? city : undefined,
      address: deliveryMethod === 'delivery' ? address : undefined,
      paymentMethod,
      comment,
      total: this.calculateTotal(lines),
    };
    const number: string = await this.ordersRepository.createWithLines({ values, lines });
    void this.notifyManager({ number, values, lines });
    return { number };
  }

  /** Emails the new order to ORDER_NOTIFY_EMAIL. A mail failure is logged and never fails the order. */
  private async notifyManager({
    number,
    values,
    lines,
  }: {
    number: string;
    values: NewOrderValues;
    lines: NewOrderLine[];
  }): Promise<void> {
    const to: string | undefined = this.configService.get('ORDER_NOTIFY_EMAIL', { infer: true });
    if (to === undefined || !this.mailService.isEnabled) {
      return;
    }
    try {
      const { subject, text } = buildOrderNotification({ number, values, lines });
      await this.mailService.send({ to, subject, text, replyTo: values.email ?? undefined });
    } catch (error) {
      this.logger.error(`Could not email order ${number}`, error instanceof Error ? error.stack : String(error));
    }
  }

  /** A page of orders, optionally filtered by status. */
  async list(query: ListOrdersQueryDto): Promise<PaginatedResult<OrderListItem>> {
    const { rows, total } = await this.ordersRepository.findPage(query);
    return buildPaginatedResult({ items: rows, page: query.page, pageSize: query.pageSize, total });
  }

  /** One order with its lines; fails with 404 ORDER_NOT_FOUND. */
  async get(id: string): Promise<OrderView> {
    return this.toView(await this.getRecordOrThrow(id));
  }

  /** Sets the status of an order; fails with 409 ORDER_STATUS_INVALID when the order cannot move there. */
  async updateStatus({ id, status }: { id: string; status: OrderStatus }): Promise<OrderView> {
    const existing: OrderRecord = await this.getRecordOrThrow(id);
    if (existing.status === status) {
      return this.toView(existing);
    }
    if (!ORDER_STATUS_TRANSITIONS[existing.status].includes(status)) {
      throw new AppException(
        ErrorCode.ORDER_STATUS_INVALID,
        HttpStatus.CONFLICT,
        `Order status cannot change from ${existing.status} to ${status}`,
        { from: existing.status, to: status },
      );
    }
    return this.toView(await this.ordersRepository.updateStatus({ id, status }));
  }

  /** Sums the quantities of repeated products; the sum may not exceed the per-line limit. */
  private mergeQuantities({ items }: CreateOrderDto): Map<string, number> {
    const quantities = new Map<string, number>();
    items.forEach(({ productId, qty }) => quantities.set(productId, (quantities.get(productId) ?? 0) + qty));
    if ([...quantities.values()].some((qty) => qty > MAX_LINE_QUANTITY)) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
        `A product can be ordered at most ${MAX_LINE_QUANTITY} times`,
      );
    }
    return quantities;
  }

  private assertAllAvailable({
    quantities,
    products,
  }: {
    quantities: Map<string, number>;
    products: ProductRecord[];
  }): void {
    const recordsById = new Map(products.map((record) => [record.id, record]));
    const unavailable: UnavailableItem[] = [...quantities.keys()].flatMap((productId): UnavailableItem[] => {
      const record: ProductRecord | undefined = recordsById.get(productId);
      if (record === undefined) {
        return [{ productId, reason: 'not_found' }];
      }
      return record.stockStatus === 'out_of_stock' ? [{ productId, reason: 'out_of_stock' }] : [];
    });
    if (unavailable.length > 0) {
      throw new AppException(
        ErrorCode.ORDER_ITEM_UNAVAILABLE,
        HttpStatus.CONFLICT,
        'Some products are not available for order',
        unavailable,
      );
    }
  }

  private calculateTotal(lines: NewOrderLine[]): string {
    const total: bigint = lines.reduce((sum, line) => sum + toMinorUnits(line.unitPrice) * BigInt(line.quantity), 0n);
    return fromMinorUnits(total);
  }

  private async getRecordOrThrow(id: string): Promise<OrderRecord> {
    const record: OrderRecord | undefined = await this.ordersRepository.findById(id);
    if (record === undefined) {
      throw new AppException(ErrorCode.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Order not found');
    }
    return record;
  }

  private async toView(record: OrderRecord): Promise<OrderView> {
    return { ...record, items: await this.ordersRepository.findItems(record.id) };
  }
}
