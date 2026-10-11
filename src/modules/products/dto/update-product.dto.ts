import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto.js';

/**
 * Every field is optional; `null` clears the optional ones.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
