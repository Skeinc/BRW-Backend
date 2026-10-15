import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const MAX_CREDENTIAL_LENGTH = 200;

/** Admin login credentials. */
export class LoginDto {
  @ApiProperty({ example: 'admin@brw.local' })
  @IsEmail()
  @MaxLength(MAX_CREDENTIAL_LENGTH)
  email: string;

  @ApiProperty({ example: 'your-admin-password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CREDENTIAL_LENGTH)
  password: string;
}
