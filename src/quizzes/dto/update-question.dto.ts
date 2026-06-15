import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateQuestionDto {
  @ApiPropertyOptional({
    description: 'Updated question prompt.',
    example: 'What is the capital city of France?',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  question_text?: string;

  @ApiPropertyOptional({
    description: 'Updated question type.',
    example: 'multiple_choice',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Updated answer options.',
    example: ['Paris', 'Lyon', 'Nice', 'Marseille'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  options?: unknown[];

  @ApiPropertyOptional({
    description: 'Updated correct answer payload.',
    example: { value: 'Paris' },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  correct_answer?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Updated explanation.',
    example:
      'Paris has been one of France main political centers for centuries.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  explanation?: string;

  @ApiPropertyOptional({
    description: 'Updated zero-based order index.',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;

  @ApiPropertyOptional({
    description: 'Points awarded for a correct answer.',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;
}
