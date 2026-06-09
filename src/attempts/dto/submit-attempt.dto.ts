import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @ApiProperty({
    description: 'Question id being answered.',
    example: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
  })
  @IsString()
  question_id!: string;

  @ApiProperty({
    description: 'Selected answer option.',
    example: 'Paris',
  })
  @IsString()
  selected_option!: string;
}

export class SubmitAttemptDto {
  @ApiProperty({
    description: 'Submitted answers for the attempt.',
    type: [AnswerDto],
    example: [
      {
        question_id: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
        selected_option: 'Paris',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
