import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const MAX_PASSWORD_LENGTH = 200;

export class LoginDto {
  @ApiProperty({ example: 'admin@brw.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PASSWORD_LENGTH)
  password: string;
}
