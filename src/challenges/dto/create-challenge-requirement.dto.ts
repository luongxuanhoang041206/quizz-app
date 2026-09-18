import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateChallengeRequirementDto {
  @IsString()
  @IsNotEmpty()
  policyId!: string;

  @IsString()
  @IsNotEmpty()
  assetName!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
