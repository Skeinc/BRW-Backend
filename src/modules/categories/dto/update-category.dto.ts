import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto.js';

/**
 * Every field is optional; `null` clears the optional ones.
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
