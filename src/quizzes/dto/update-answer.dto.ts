import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAnswerDto {
  @ApiPropertyOptional({
    description: 'Updated answer text.',
    example: 'Paris',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  text?: string;

  @ApiPropertyOptional({
    description: 'Whether this answer is correct.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_correct?: boolean;
}
