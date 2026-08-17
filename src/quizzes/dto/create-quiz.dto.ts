// dto/create-quiz.dto.ts
import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
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
  questions?: CreateQuestionDto[];

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
  total_time?: number;

  @ApiPropertyOptional({
    description: 'Whether this quiz awards an NFT upon completion (ADMIN only). USER requests always ignore this field.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isNftQuiz?: boolean;

  @IsOptional()
  @IsString()
  reward_id?: string;
}
