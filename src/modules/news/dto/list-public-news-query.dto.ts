import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PUBLIC_NEWS_DEFAULT_PAGE_SIZE, PUBLIC_NEWS_MAX_PAGE_SIZE } from '../constants/news.constants.js';

const FIRST_PAGE = 1;

/** Query of GET /api/news. */
export class ListPublicNewsQueryDto {
  @ApiPropertyOptional({ minimum: FIRST_PAGE, default: FIRST_PAGE })
  @Type(() => Number)
  @IsInt()
  @Min(FIRST_PAGE)
  page: number = FIRST_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: PUBLIC_NEWS_MAX_PAGE_SIZE,
    default: PUBLIC_NEWS_DEFAULT_PAGE_SIZE,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PUBLIC_NEWS_MAX_PAGE_SIZE)
  pageSize: number = PUBLIC_NEWS_DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ description: 'Only promotions (true) or only plain news (false); omit for both' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isPromo?: boolean;
}
