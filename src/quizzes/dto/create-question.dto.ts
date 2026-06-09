import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Question prompt displayed to quiz takers.',
    example: 'What is the capital of France?',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  question_text!: string;

  @ApiPropertyOptional({
    description: 'Question type.',
    example: 'multiple_choice',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Available answer options.',
    example: ['Paris', 'Rome', 'Berlin', 'Madrid'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  options?: unknown[];

  @ApiPropertyOptional({
    description: 'Correct answer payload.',
    example: { value: 'Paris' },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  correct_answer?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Explanation shown after submission.',
    example: 'Paris is the capital and largest city of France.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  explanation?: string;

  @ApiPropertyOptional({
    description: 'Zero-based order of this question inside the quiz.',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;
}
