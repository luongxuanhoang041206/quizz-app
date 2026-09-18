import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  ChallengeRewardTier,
  ChallengeRewardType,
} from '../challenge.types';

export class CreateChallengeRewardDto {
  @IsEnum(ChallengeRewardTier)
  tier!: ChallengeRewardTier;

  @IsEnum(ChallengeRewardType)
  type!: ChallengeRewardType;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  config!: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}