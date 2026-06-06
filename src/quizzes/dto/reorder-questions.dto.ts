import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

class ReorderQuestionItemDto {
  @IsString()
  id!: string;

  @IsInt()
  @Min(0)
  order_index!: number;
}

export class ReorderQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderQuestionItemDto)
  questions!: ReorderQuestionItemDto[];
}
