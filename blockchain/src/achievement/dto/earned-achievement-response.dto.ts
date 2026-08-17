import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EarnedRewardDto {
  @ApiProperty({ example: 'reward-uuid-1234' })
  id!: string;

  @ApiProperty({ example: 'Cardano Beginner' })
  name!: string;

  @ApiPropertyOptional({ example: 'Completed Cardano Basics' })
  description?: string;

  @ApiProperty({ example: 'ipfs://QmXyz123...' })
  image!: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  metadata?: any;

  @ApiPropertyOptional({ example: 'CIP25' })
  policyType?: string;

  @ApiPropertyOptional({ example: 'a0b1c2d3e4f5...' })
  policyId?: string;

  @ApiPropertyOptional({ example: '43617264616e6f...' })
  assetName?: string;
}

export class EarnedAchievementDto {
  @ApiProperty({ example: 'achievement-uuid-5678' })
  id!: string;

  @ApiProperty({ example: 'SUCCESS' })
  status!: string;

  @ApiProperty({ example: 'quiz-uuid-9012' })
  quizId!: string;

  @ApiProperty({ type: EarnedRewardDto })
  reward!: EarnedRewardDto;

  @ApiPropertyOptional({ example: '0x123456789abcdef...' })
  txHash?: string;

  @ApiPropertyOptional({ example: '2026-08-16T21:00:00.000Z' })
  mintedAt?: string;
}
