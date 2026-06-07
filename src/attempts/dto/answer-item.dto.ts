import { IsDefined, IsUUID } from 'class-validator';

export class AnswerItemDto {
  @IsUUID()
  question_id: string;

  @IsDefined()
  answer: unknown;
}
