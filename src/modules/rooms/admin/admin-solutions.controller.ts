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
import type { PaginatedResult } from '../../../common/lib/pagination.types.js';
import { CreateSolutionDto } from '../dto/create-solution.dto.js';
import { ListSolutionsQueryDto } from '../dto/list-solutions-query.dto.js';
import { UpdateSolutionDto } from '../dto/update-solution.dto.js';
import type { SolutionDetailView, SolutionView } from '../types/admin-rooms.types.js';
import { AdminSolutionsService } from './admin-solutions.service.js';

/** HTTP endpoints of ready-made solutions under `/api/admin/solutions` (admin cookie required). */
@ApiTags('admin-solutions')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/solutions')
export class AdminSolutionsController {
  constructor(private readonly solutionsService: AdminSolutionsService) {}

  /** One filtered page of solutions. */
  @Get()
  @ApiOperation({ summary: 'One page of solutions filtered by name, room and collection' })
  list(@Query() query: ListSolutionsQueryDto): Promise<PaginatedResult<SolutionView>> {
    return this.solutionsService.list(query);
  }

  /** Get one solution with its gallery and elements. */
  @Get(':id')
  @ApiOperation({ summary: 'Get one solution (SOLUTION_NOT_FOUND)' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<SolutionDetailView> {
    return this.solutionsService.get(id);
  }

  /** Create a solution. */
  @Post()
  @ApiOperation({ summary: 'Create a solution (ROOM_NOT_FOUND, COLLECTION_NOT_FOUND, PRODUCT_NOT_FOUND)' })
  create(@Body() dto: CreateSolutionDto): Promise<SolutionDetailView> {
    return this.solutionsService.create(dto);
  }

  /** Update a solution. */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a solution; productIds replaces the elements' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSolutionDto): Promise<SolutionDetailView> {
    return this.solutionsService.update(id, dto);
  }

  /** Delete a solution with its photos. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a solution and its photos' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.solutionsService.remove(id);
  }
}
