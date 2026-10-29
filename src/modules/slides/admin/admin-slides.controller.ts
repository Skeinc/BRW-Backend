import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { MoveItemDto } from '../../../common/dto/move-item.dto.js';
import type { PaginatedResult } from '../../../common/lib/pagination.types.js';
import { CreateSlideDto } from '../dto/create-slide.dto.js';
import { ListSlidesQueryDto } from '../dto/list-slides-query.dto.js';
import { UpdateSlideDto } from '../dto/update-slide.dto.js';
import { SlidesService } from '../slides.service.js';
import type { SlideDetailView, SlideView } from '../types/slides.types.js';

/** HTTP endpoints of home page slides under `/api/admin/slides` (admin cookie required). */
@ApiTags('admin-slides')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/slides')
export class AdminSlidesController {
  constructor(private readonly slidesService: SlidesService) {}

  /** One page of slides in display order. */
  @Get()
  @ApiOperation({ summary: 'One page of slides in display order, with the cover' })
  list(@Query() query: ListSlidesQueryDto): Promise<PaginatedResult<SlideView>> {
    return this.slidesService.list(query);
  }

  /** Get one slide with its gallery. */
  @Get(':id')
  @ApiOperation({ summary: 'Get one slide (SLIDE_NOT_FOUND)' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<SlideDetailView> {
    return this.slidesService.get(id);
  }

  /** Create a slide at the end of the list. */
  @Post()
  @ApiOperation({ summary: 'Create a slide at the end of the list' })
  create(@Body() dto: CreateSlideDto): Promise<SlideDetailView> {
    return this.slidesService.create(dto);
  }

  /** Update a slide. */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a slide; linkUrl null clears the link' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSlideDto): Promise<SlideDetailView> {
    return this.slidesService.update(id, dto);
  }

  /** Move a slide to the position of another one. */
  @Patch(':id/move')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Put a slide where another one is now' })
  move(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveItemDto): Promise<void> {
    return this.slidesService.move({ id, overId: dto.overId });
  }

  /** Delete a slide with its picture. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a slide and its picture' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.slidesService.remove(id);
  }
}
