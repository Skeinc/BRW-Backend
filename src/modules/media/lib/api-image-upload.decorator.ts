import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { IMAGE_FIELD_NAME } from '../constants/media.constants.js';

/**
 * Swagger description of a multipart upload with one image in the "file" field.
 */
export function ApiImageUpload(extraProperties: Record<string, object> = {}): MethodDecorator {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: [IMAGE_FIELD_NAME],
        properties: { [IMAGE_FIELD_NAME]: { type: 'string', format: 'binary' }, ...extraProperties },
      },
    }),
  );
}
