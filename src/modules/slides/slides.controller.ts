import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SlidesService } from './slides.service.js';
import type { PublicSlide } from './types/slides.types.js';

/** Public HTTP endpoint of home page slides under `/api/slides`. */
@ApiTags('catalog')
@Controller('slides')
export class SlidesController {
  constructor(private readonly slidesService: SlidesService) {}

  /** Published slides with a picture, in display order. */
  @Get()
  @ApiOperation({ summary: 'Published home page slides that have a picture, in display order' })
  list(): Promise<PublicSlide[]> {
    return this.slidesService.listPublic();
  }
}
