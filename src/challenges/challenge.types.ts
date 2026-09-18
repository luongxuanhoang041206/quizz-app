export enum ChallengeStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum ChallengeParticipationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum ChallengeRewardTier {
  WINNER = 'WINNER',
  RUNNER_UP = 'RUNNER_UP',
  TOP_10 = 'TOP_10',
  PARTICIPATION = 'PARTICIPATION',
  SPECIAL = 'SPECIAL',
}

export enum ChallengeRewardType {
  NFT = 'NFT',
  TOKEN = 'TOKEN',
  POINTS = 'POINTS',
  ACCESS = 'ACCESS',
  EXTERNAL = 'EXTERNAL',
}

export type ChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  status: ChallengeStatus;
  start_at: string | null;
  end_at: string | null;
  max_participants: number | null;
  reward_claim_deadline: string | null;
  created_at: string;
  updated_at: string;
};

export type ChallengeRequirementRow = {
  id: string;
  challenge_id: string;
  policy_id: string;
  asset_name: string;
  min_quantity: string | number | bigint;
  sort_order: number;
  created_at: string;
};

export type ChallengeRewardRow = {
  id: string;
  challenge_id: string;
  tier: ChallengeRewardTier;
  type: ChallengeRewardType;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ChallengeRequirementEligibility = {
  id: string;
  policyId: string;
  assetName: string;
  minQuantity: string;
  owned: boolean;
  quantity: string;
  assetUnit: string;
  satisfied: boolean;
};

export type ChallengeEligibilityResponse = {
  challengeId: string;
  eligible: boolean;
  requirementMode: 'ALL';
  requirements: ChallengeRequirementEligibility[];
};

export type ChallengeParticipationRow = {
  id: string;
  challenge_id: string;
  user_id: string;
  status: ChallengeParticipationStatus;
  started_at: string;
  completed_at: string | null;
};

export type ChallengePublicDetailResponse = {
  id: string;
  title: string;
  description: string | null;
  createdBy: string;
  status: ChallengeStatus;
  startAt: string | null;
  endAt: string | null;
  maxParticipants: number | null;
  rewardClaimDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  requirements: Array<{
    id: string;
    policyId: string;
    assetName: string;
    minQuantity: string;
    sortOrder: number;
  }>;
  rewards: Array<{
    id: string;
    tier: ChallengeRewardTier;
    type: ChallengeRewardType;
    name: string;
    description: string | null;
    config: Record<string, unknown>;
    sortOrder: number;
  }>;
};
