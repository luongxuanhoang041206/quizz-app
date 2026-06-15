import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryQuizDto {
  @ApiPropertyOptional({
    description: 'Search keyword matched against title and description.',
    example: 'capital',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category name.',
    example: 'Geography',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by difficulty level.',
    example: 'easy',
    enum: ['easy', 'medium', 'hard'],
  })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  @ApiPropertyOptional({
    description: 'Sort order.',
    example: 'newest',
    enum: ['newest', 'oldest', 'title'],
  })
  @IsOptional()
  @IsEnum(['newest', 'oldest', 'title'])
  sort?: 'newest' | 'oldest' | 'title';

  @ApiPropertyOptional({ description: 'Page number (1-based).', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (max 50).', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
