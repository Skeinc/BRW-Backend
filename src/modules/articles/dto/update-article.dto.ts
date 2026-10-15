import { PartialType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto.js';

/** Body of PATCH /api/admin/articles/:id; every field is optional, `null` clears nullable fields. */
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
