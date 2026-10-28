import { PartialType } from '@nestjs/swagger';
import { CreateNewsDto } from './create-news.dto.js';

/** Body of PATCH /api/admin/news/:id; every field is optional, `null` clears nullable fields. */
export class UpdateNewsDto extends PartialType(CreateNewsDto) {}
