import { PartialType } from '@nestjs/swagger';
import { CreateCollectionDto } from './create-collection.dto.js';

/**
 * Every field is optional; `null` clears the optional ones.
 */
export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {}
