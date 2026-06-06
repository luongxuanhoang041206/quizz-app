import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  question_text?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsArray()
  options?: unknown[];

  @IsOptional()
  @IsObject()
  correct_answer?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;
}
