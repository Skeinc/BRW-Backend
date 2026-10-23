import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { emptyToUndefined } from '../../../common/transforms/empty-to-undefined.js';
import { trimText } from '../../../common/transforms/trim-text.js';
import { deliveryMethodEnum } from '../../../database/schema/delivery-method.enum.js';
import { paymentMethodEnum } from '../../../database/schema/payment-method.enum.js';
import { BELARUS_PHONE_PATTERN, MAX_ORDER_LINES } from '../constants/orders.constants.js';
import { normalizePhone } from '../lib/normalize-phone.js';
import { CreateOrderItemDto } from './create-order-item.dto.js';

const NAME_MAX_LENGTH = 120;
const EMAIL_MAX_LENGTH = 255;
const CITY_MAX_LENGTH = 120;
const ADDRESS_MAX_LENGTH = 500;
const COMMENT_MAX_LENGTH = 2000;

function toNormalizedPhone({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? normalizePhone(value) : value;
}

/** Body of POST /api/orders. */
export class CreateOrderDto {
  @ApiProperty({ maxLength: NAME_MAX_LENGTH })
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  contactName: string;

  @ApiProperty({ example: '+375 (29) 123-45-67', description: 'Belarus mobile number, the mask is stripped' })
  @Transform(toNormalizedPhone)
  @Matches(BELARUS_PHONE_PATTERN, { message: 'phone must be a Belarus mobile number like +375291234567' })
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email?: string;

  @ApiProperty({ enum: deliveryMethodEnum.enumValues })
  @IsIn(deliveryMethodEnum.enumValues)
  deliveryMethod: (typeof deliveryMethodEnum.enumValues)[number];

  @ApiPropertyOptional({ description: 'Required for delivery' })
  @ValidateIf((order: CreateOrderDto) => order.deliveryMethod === 'delivery')
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CITY_MAX_LENGTH)
  city?: string;

  @ApiPropertyOptional({ description: 'Required for delivery' })
  @ValidateIf((order: CreateOrderDto) => order.deliveryMethod === 'delivery')
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(ADDRESS_MAX_LENGTH)
  address?: string;

  @ApiProperty({ enum: paymentMethodEnum.enumValues })
  @IsIn(paymentMethodEnum.enumValues)
  paymentMethod: (typeof paymentMethodEnum.enumValues)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(COMMENT_MAX_LENGTH)
  comment?: string;

  @ApiProperty({ description: 'Consent to personal data processing; must be true' })
  @Equals(true, { message: 'consent must be given' })
  consent: boolean;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ORDER_LINES)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
