import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class AnswerDto {
  @ApiProperty({
    description: 'Question id being answered.',
    example: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
  })
  @IsString()
  question_id!: string;

  @ApiProperty({
    description: 'Index (0-based) of the selected option.',
    example: 2,
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  selected_answer_id!: number;
}

export class SubmitAttemptDto {
  @ApiProperty({
    description: 'Submitted answers for the attempt.',
    type: [AnswerDto],
    example: [
      {
        question_id: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
        selected_answer_id: 2,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}