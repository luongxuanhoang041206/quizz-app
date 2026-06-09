import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'New display username.',
    example: 'alice_updated',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @ApiPropertyOptional({
    description: 'Absolute URL to the user avatar image.',
    example: 'https://example.com/avatars/alice.png',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  avatar_url?: string;

  @ApiPropertyOptional({
    description: 'Short profile biography.',
    example: 'I build and play history quizzes.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
