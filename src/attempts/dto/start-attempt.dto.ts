import { IsNotEmpty, IsUUID } from 'class-validator';

export class StartAttemptDto {
  @IsUUID()
  @IsNotEmpty()
  quiz_id: string;
}
