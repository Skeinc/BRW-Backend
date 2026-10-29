import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { AdminSlidesController } from './admin/admin-slides.controller.js';
import { SlidesController } from './slides.controller.js';
import { SlidesRepository } from './slides.repository.js';
import { SlidesService } from './slides.service.js';

/** Wires the home page slides feature. */
@Module({
  imports: [MediaModule],
  controllers: [SlidesController, AdminSlidesController],
  providers: [SlidesRepository, SlidesService],
})
export class SlidesModule {}
