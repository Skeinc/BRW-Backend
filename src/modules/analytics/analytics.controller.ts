import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';
import type { AnalyticsReport } from './types/analytics.types.js';

/** HTTP endpoint of the analytics report under `/api/admin/analytics` (admin cookie required). */
@ApiTags('admin-analytics')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** Revenue, orders, top lists and catalog health for the last N days, compared with the N days before. */
  @Get()
  @ApiOperation({ summary: 'Analytics report of orders and the catalog for a period' })
  getReport(@Query() query: AnalyticsQueryDto): Promise<AnalyticsReport> {
    return this.analyticsService.getReport(query);
  }
}
