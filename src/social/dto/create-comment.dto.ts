import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment content.',
    example: 'Great quiz, the final question was tricky!',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content: string;
}
