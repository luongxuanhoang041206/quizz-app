import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateQuizDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
