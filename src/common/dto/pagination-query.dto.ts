import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** `page` and `pageSize` query parameters shared by every paged list. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: DEFAULT_PAGE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = DEFAULT_PAGE_SIZE;
}
