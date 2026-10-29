import { PartialType } from '@nestjs/swagger';
import { CreateSolutionDto } from './create-solution.dto.js';

/** Body of PATCH /api/admin/solutions/:id; every field is optional, `null` clears the description. */
export class UpdateSolutionDto extends PartialType(CreateSolutionDto) {}
