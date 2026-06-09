import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateAttemptDto {
  @ApiProperty({
    description: 'Public quiz id to start an attempt for.',
    example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
    format: 'uuid',
  })
  @IsUUID('4')
  quiz_id!: string;
}
