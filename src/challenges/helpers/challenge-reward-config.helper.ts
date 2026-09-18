import { BadRequestException } from '@nestjs/common';
import { ChallengeRewardType } from '../challenge.types';

type RewardConfig = Record<string, unknown>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0;
  }

  if (typeof value === 'string') {
    return /^\d+$/.test(value.trim()) && BigInt(value.trim()) > 0n;
  }

  return false;
}

function requireString(config: RewardConfig, field: string): string {
  const value = config[field];

  if (!isNonEmptyString(value)) {
    throw new BadRequestException(
      `Challenge reward config.${field} is required and must be a non-empty string`,
    );
  }

  return value.trim();
}

function requirePositiveInteger(config: RewardConfig, field: string): void {
  const value = config[field];

  if (!isPositiveInteger(value)) {
    throw new BadRequestException(
      `Challenge reward config.${field} must be a positive integer`,
    );
  }
}

function validateNftConfig(config: RewardConfig): void {
  requireString(config, 'policyId');
  requireString(config, 'assetName');
}

function validateTokenConfig(config: RewardConfig): void {
  requireString(config, 'policyId');
  requireString(config, 'assetName');
  requirePositiveInteger(config, 'amount');
}

function validatePointsConfig(config: RewardConfig): void {
  requirePositiveInteger(config, 'amount');
}

function validateAccessConfig(config: RewardConfig): void {
  requireString(config, 'accessType');
  requireString(config, 'reference');
}

function validateExternalConfig(config: RewardConfig): void {
  requireString(config, 'provider');
  requireString(config, 'reference');

  if (
    config.instructions !== undefined &&
    !isNonEmptyString(config.instructions)
  ) {
    throw new BadRequestException(
      'Challenge reward config.instructions must be a non-empty string',
    );
  }
}

/**
 * Validate the config structure according to reward type.
 */
export function validateChallengeRewardConfig(
  type: ChallengeRewardType,
  config: unknown,
): asserts config is RewardConfig {
  if (
    typeof config !== 'object' ||
    config === null ||
    Array.isArray(config)
  ) {
    throw new BadRequestException('Challenge reward config must be an object');
  }

  const rewardConfig = config as RewardConfig;

  switch (type) {
    case ChallengeRewardType.NFT:
      validateNftConfig(rewardConfig);
      break;

    case ChallengeRewardType.TOKEN:
      validateTokenConfig(rewardConfig);
      break;

    case ChallengeRewardType.POINTS:
      validatePointsConfig(rewardConfig);
      break;

    case ChallengeRewardType.ACCESS:
      validateAccessConfig(rewardConfig);
      break;

    case ChallengeRewardType.EXTERNAL:
      validateExternalConfig(rewardConfig);
      break;

    default:
      throw new BadRequestException(
        `Unsupported challenge reward type: ${String(type)}`,
      );
  }
}