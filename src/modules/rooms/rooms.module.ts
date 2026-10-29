import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { AdminRoomsController } from './admin/admin-rooms.controller.js';
import { AdminRoomsRepository } from './admin/admin-rooms.repository.js';
import { AdminRoomsService } from './admin/admin-rooms.service.js';
import { AdminSolutionsController } from './admin/admin-solutions.controller.js';
import { AdminSolutionsRepository } from './admin/admin-solutions.repository.js';
import { AdminSolutionsService } from './admin/admin-solutions.service.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsRepository } from './rooms.repository.js';
import { RoomsService } from './rooms.service.js';

/** Wires the storefront and admin sides of rooms and ready-made solutions. */
@Module({
  imports: [MediaModule],
  controllers: [RoomsController, AdminRoomsController, AdminSolutionsController],
  providers: [
    RoomsRepository,
    RoomsService,
    AdminRoomsRepository,
    AdminRoomsService,
    AdminSolutionsRepository,
    AdminSolutionsService,
  ],
})
export class RoomsModule {}
