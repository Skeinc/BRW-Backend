import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { ANALYTICS_PERIODS, TIME_ZONE_PATTERN } from '../constants/analytics.constants.js';
import type { AnalyticsPeriod } from '../types/analytics.types.js';

/** Query of GET /api/admin/analytics. */
export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ANALYTICS_PERIODS, default: '30d', description: 'Last N days including today' })
  @IsOptional()
  @IsIn(ANALYTICS_PERIODS)
  period?: AnalyticsPeriod;

  @ApiPropertyOptional({
    example: 'Europe/Minsk',
    description: 'IANA time zone of the viewer; days and hours are cut in it. Unknown names fall back to UTC.',
  })
  @IsOptional()
  @IsString()
  @Matches(TIME_ZONE_PATTERN)
  timeZone?: string;
}
