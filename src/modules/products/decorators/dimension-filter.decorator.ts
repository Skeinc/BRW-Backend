import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { emptyToUndefined } from '../../../common/transforms/empty-to-undefined.js';
import { MAX_DIMENSION_CM } from '../constants/products.constants.js';

/** A query parameter with one end of a size range in centimetres. */
export function DimensionFilter(description: string): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional({ description, minimum: 0, maximum: MAX_DIMENSION_CM, example: 50 }),
    Transform(emptyToUndefined),
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(0),
    Max(MAX_DIMENSION_CM),
  );
}
