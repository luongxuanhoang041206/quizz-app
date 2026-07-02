// dto/create-quiz.dto.ts
import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { CreateQuestionDto } from './create-question.dto';
import { Type } from 'class-transformer';

export class CreateQuizDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['private', 'public', 'unlisted'])
  visibility?: 'private' | 'public' | 'unlisted';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[]

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsNumber()
  category_id?: number | string;

  @IsOptional()
  @IsNumber()
  total_time?: number; // total time in minutes

  // @IsOptional()
  // @IsNumber()
  // time_per_question?: number; // in seconds or minutes depending on your schema
}