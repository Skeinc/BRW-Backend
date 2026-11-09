import { Injectable } from '@nestjs/common';
import { DeliveryPageRepository } from './delivery-page.repository.js';
import type { SaveDeliveryPageDto } from './dto/save-delivery-page.dto.js';
import type { DeliveryPageResponse } from './types/delivery-page.types.js';

/** Reads and saves the editable content of the "Delivery and payment" page. */
@Injectable()
export class DeliveryPageService {
  constructor(private readonly deliveryPageRepository: DeliveryPageRepository) {}

  /** Saved content, or `{ content: null }` so the storefront falls back to its built-in texts. */
  async get(): Promise<DeliveryPageResponse> {
    return { content: (await this.deliveryPageRepository.find()) ?? null };
  }

  /** Replaces the whole content. */
  async save(dto: SaveDeliveryPageDto): Promise<DeliveryPageResponse> {
    const { payment, delivery, receiving, documents, faq } = dto;
    return { content: await this.deliveryPageRepository.upsert({ payment, delivery, receiving, documents, faq }) };
  }
}
