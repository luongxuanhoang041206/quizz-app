import { IsUUID } from 'class-validator';

export class CreateAttemptDto {
  @IsUUID('4')
  quiz_id!: string;
}
