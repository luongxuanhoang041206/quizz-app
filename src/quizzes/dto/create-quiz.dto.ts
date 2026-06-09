import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateQuizDto {
  @ApiProperty({
    description: 'Quiz title.',
    example: 'World Capitals Challenge',
    maxLength: 150,
  })
  @IsString()
  @MaxLength(150)
  title!: string;

  @ApiPropertyOptional({
    description: 'Quiz description shown to players.',
    example: 'Test your knowledge of capital cities around the world.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the quiz can be viewed publicly.',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
