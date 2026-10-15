import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto.js';

/** Body of PATCH /api/admin/categories/:id; every field is optional, `null` clears nullable fields. */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
