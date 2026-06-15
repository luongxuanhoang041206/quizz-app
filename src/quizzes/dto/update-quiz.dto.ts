import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, IsUUID, IsArray, ArrayUnique } from 'class-validator';

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
    example: 'private',
  })
  @IsOptional()
  @IsEnum(['public', 'private'])
  visibility?: 'public' | 'private';

  @ApiPropertyOptional({
    description: 'Category id for the quiz (UUID).',
    example: '7c8f6a2b-4e4d-4d6b-9b2a-1f2e3d4c5b6a',
  })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({
    description: 'Optional category name for display (redundant with category_id).',
    example: 'Geography',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  category?: string;

  @ApiPropertyOptional({
    description: 'List of tag ids or slugs associated with the quiz.',
    example: ['world-capitals', 'geography'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];
}
