import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto.js';

/** Body of PATCH /api/admin/products/:id; every field is optional, `null` clears nullable fields. */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
