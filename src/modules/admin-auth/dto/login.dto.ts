import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const MAX_CREDENTIAL_LENGTH = 200;

/** Admin login credentials. */
export class LoginDto {
  @ApiProperty({ example: 'BRW-COMPANY' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CREDENTIAL_LENGTH)
  login: string;

  @ApiProperty({ example: 'your-admin-password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CREDENTIAL_LENGTH)
  password: string;
}
