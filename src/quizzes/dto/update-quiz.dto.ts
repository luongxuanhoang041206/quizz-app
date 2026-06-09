import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateQuizDto {
  @ApiPropertyOptional({
    description: 'Updated quiz title.',
    example: 'World Capitals Challenge - Updated',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated quiz description.',
    example: 'A refreshed set of world capital questions.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the quiz is publicly visible.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
