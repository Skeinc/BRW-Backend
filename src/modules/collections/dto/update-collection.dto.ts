import { PartialType } from '@nestjs/swagger';
import { CreateCollectionDto } from './create-collection.dto.js';

/** Body of PATCH /api/admin/collections/:id; every field is optional, `null` clears nullable fields. */
export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {}
