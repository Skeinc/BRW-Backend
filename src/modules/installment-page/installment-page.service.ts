import { Injectable } from '@nestjs/common';
import type { SaveInstallmentPageDto } from './dto/save-installment-page.dto.js';
import { InstallmentPageRepository } from './installment-page.repository.js';
import type { InstallmentPageResponse } from './types/installment-page.types.js';

/** Reads and saves the editable content of the "Installment" page. */
@Injectable()
export class InstallmentPageService {
  constructor(private readonly installmentPageRepository: InstallmentPageRepository) {}

  /** Saved content, or `{ content: null }` so the storefront falls back to its built-in texts. */
  async get(): Promise<InstallmentPageResponse> {
    return { content: (await this.installmentPageRepository.find()) ?? null };
  }

  /** Replaces the whole content. */
  async save(dto: SaveInstallmentPageDto): Promise<InstallmentPageResponse> {
    const { cards, loans } = dto;
    return { content: await this.installmentPageRepository.upsert({ cards, loans }) };
  }
}
