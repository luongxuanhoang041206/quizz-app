import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class ReorderQuestionItemDto {
  @ApiProperty({
    description: 'Question id to reorder.',
    example: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
  })
  @IsString()
  id!: string;

  @ApiProperty({
    description: 'New zero-based order index.',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  order_index!: number;
}

export class ReorderQuestionsDto {
  @ApiProperty({
    description: 'Ordered list of question ids and their target positions.',
    type: [ReorderQuestionItemDto],
    example: [
      {
        id: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
        order_index: 0,
      },
      {
        id: '379bb89c-6dbd-4706-b84e-c3080a5d262f',
        order_index: 1,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderQuestionItemDto)
  questions!: ReorderQuestionItemDto[];
}
