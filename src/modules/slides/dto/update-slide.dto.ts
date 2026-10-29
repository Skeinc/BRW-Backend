import { PartialType } from '@nestjs/swagger';
import { CreateSlideDto } from './create-slide.dto.js';

/** Body of PATCH /api/admin/slides/:id; every field is optional, `null` clears the link. */
export class UpdateSlideDto extends PartialType(CreateSlideDto) {}
