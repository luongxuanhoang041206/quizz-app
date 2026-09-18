import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdateChallengeRequirementDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  policyId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  assetName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
