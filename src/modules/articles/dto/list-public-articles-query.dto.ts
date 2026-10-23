import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { PUBLIC_ARTICLE_DEFAULT_PAGE_SIZE, PUBLIC_ARTICLE_MAX_PAGE_SIZE } from '../constants/articles.constants.js';

const FIRST_PAGE = 1;

/** Query of GET /api/articles. */
export class ListPublicArticlesQueryDto {
  @ApiPropertyOptional({ minimum: FIRST_PAGE, default: FIRST_PAGE })
  @Type(() => Number)
  @IsInt()
  @Min(FIRST_PAGE)
  page: number = FIRST_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: PUBLIC_ARTICLE_MAX_PAGE_SIZE,
    default: PUBLIC_ARTICLE_DEFAULT_PAGE_SIZE,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PUBLIC_ARTICLE_MAX_PAGE_SIZE)
  pageSize: number = PUBLIC_ARTICLE_DEFAULT_PAGE_SIZE;
}
