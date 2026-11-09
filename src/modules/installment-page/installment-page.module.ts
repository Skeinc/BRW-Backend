import { Module } from '@nestjs/common';
import { AdminInstallmentPageController } from './admin/admin-installment-page.controller.js';
import { InstallmentPageController } from './installment-page.controller.js';
import { InstallmentPageRepository } from './installment-page.repository.js';
import { InstallmentPageService } from './installment-page.service.js';

/** Wires the editable "Installment" page content. */
@Module({
  controllers: [InstallmentPageController, AdminInstallmentPageController],
  providers: [InstallmentPageRepository, InstallmentPageService],
})
export class InstallmentPageModule {}
