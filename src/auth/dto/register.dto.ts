// src/auth/dto/register.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email address used to sign in.',
    example: 'alice@example.com',
    format: 'email',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Public username displayed in the application.',
    example: 'alice_quiz',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  username!: string;

  @ApiProperty({
    description: 'Plain text password. It is hashed before storage.',
    example: 'secret123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;
}
