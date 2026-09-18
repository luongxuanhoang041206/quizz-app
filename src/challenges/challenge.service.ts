import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CardanoService } from 'blockchain/src/cardano/cardano.service';
import { SUPABASE_CLIENT } from 'src/database/database.module';
import {
  ChallengeEligibilityResponse,
  ChallengeParticipationRow,
  ChallengeParticipationStatus,
  ChallengePublicDetailResponse,
  ChallengeRequirementRow,
  ChallengeRewardRow,
  ChallengeRow,
  ChallengeStatus,
} from './challenge.types';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { CreateChallengeRequirementDto } from './dto/create-challenge-requirement.dto';
import { UpdateChallengeRequirementDto } from './dto/update-challenge-requirement.dto';
import { CreateChallengeRewardDto } from './dto/create-challenge-reward.dto';
import { UpdateChallengeRewardDto } from './dto/update-challenge-reward.dto';
import { validateChallengeRewardConfig } from './helpers/challenge-reward-config.helper';

type UserWalletRow = {
  id: string;
  wallet_address: string | null;
};

type OwnershipLookup = {
  owned: boolean;
  quantity: bigint;
  assetUnit: string;
  address: string;
};

@Injectable()
export class ChallengeService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly cardanoService: CardanoService,
  ) {}

  // ==========================================
  // CHALLENGE CRUD & LIFECYCLE
  // ==========================================

  async createChallenge(
    userId: string,
    dto: CreateChallengeDto,
  ): Promise<ChallengeRow> {
    this.validateDateRange(dto.startAt, dto.endAt);

    if (dto.maxParticipants !== undefined && dto.maxParticipants <= 0) {
      throw new BadRequestException('maxParticipants must be greater than 0');
    }

    const { data, error } = await this.supabase
      .from('challenges')
      .insert({
        title: dto.title.trim(),
        description: dto.description?.trim() ?? null,
        created_by: userId,
        status: ChallengeStatus.DRAFT,
        start_at: dto.startAt ?? null,
        end_at: dto.endAt ?? null,
        max_participants: dto.maxParticipants ?? null,
        reward_claim_deadline: dto.rewardClaimDeadline ?? null,
      })
      .select(
        'id, title, description, created_by, status, start_at, end_at, max_participants, reward_claim_deadline, created_at, updated_at',
      )
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as ChallengeRow;
  }

  async getChallenge(
    challengeId: string,
    currentUserId?: string,
  ): Promise<ChallengePublicDetailResponse> {
    const challenge = await this.loadChallenge(challengeId);

    if (
      challenge.status === ChallengeStatus.DRAFT &&
      challenge.created_by !== currentUserId
    ) {
      throw new NotFoundException('Challenge not found');
    }

    const [requirements, rewards] = await Promise.all([
      this.loadRequirements(challengeId),
      this.loadRewards(challengeId),
    ]);

    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      createdBy: challenge.created_by,
      status: challenge.status,
      startAt: challenge.start_at,
      endAt: challenge.end_at,
      maxParticipants: challenge.max_participants,
      rewardClaimDeadline: challenge.reward_claim_deadline,
      createdAt: challenge.created_at,
      updatedAt: challenge.updated_at,
      requirements: requirements.map((req) => ({
        id: req.id,
        policyId: req.policy_id,
        assetName: req.asset_name,
        minQuantity: req.min_quantity.toString(),
        sortOrder: req.sort_order,
      })),
      rewards: rewards.map((rew) => ({
        id: rew.id,
        tier: rew.tier,
        type: rew.type,
        name: rew.name,
        description: rew.description,
        config: rew.config,
        sortOrder: rew.sort_order,
      })),
    };
  }

  async listPublicChallenges(filter?: {
    status?: ChallengeStatus;
  }): Promise<ChallengeRow[]> {
    if (filter?.status === ChallengeStatus.DRAFT) {
      throw new BadRequestException(
        'Cannot query DRAFT challenges from public endpoint',
      );
    }

    let query = this.supabase
      .from('challenges')
      .select(
        'id, title, description, created_by, status, start_at, end_at, max_participants, reward_claim_deadline, created_at, updated_at',
      );

    if (filter?.status) {
      query = query.eq('status', filter.status);
    } else {
      query = query.in('status', [
        ChallengeStatus.ACTIVE,
        ChallengeStatus.SCHEDULED,
        ChallengeStatus.CLOSED,
      ]);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as ChallengeRow[];
  }

  async listMyChallenges(
    userId: string,
    filter?: { status?: ChallengeStatus },
  ): Promise<ChallengeRow[]> {
    let query = this.supabase
      .from('challenges')
      .select(
        'id, title, description, created_by, status, start_at, end_at, max_participants, reward_claim_deadline, created_at, updated_at',
      )
      .eq('created_by', userId);

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as ChallengeRow[];
  }

  async updateChallenge(
    challengeId: string,
    userId: string,
    dto: UpdateChallengeDto,
  ): Promise<ChallengeRow> {
    const challenge = await this.loadChallenge(challengeId);
    this.assertCreator(challenge, userId);
    this.assertChallengeEditable(challenge);

    const effectiveStartAt =
      dto.startAt !== undefined ? dto.startAt : challenge.start_at;
    const effectiveEndAt =
      dto.endAt !== undefined ? dto.endAt : challenge.end_at;
    this.validateDateRange(effectiveStartAt, effectiveEndAt);

    if (dto.maxParticipants !== undefined && dto.maxParticipants <= 0) {
      throw new BadRequestException('maxParticipants must be greater than 0');
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.title !== undefined) updates.title = dto.title.trim();
    if (dto.description !== undefined)
      updates.description = dto.description?.trim() ?? null;
    if (dto.startAt !== undefined) updates.start_at = dto.startAt;
    if (dto.endAt !== undefined) updates.end_at = dto.endAt;
    if (dto.maxParticipants !== undefined)
      updates.max_participants = dto.maxParticipants;
    if (dto.rewardClaimDeadline !== undefined)
      updates.reward_claim_deadline = dto.rewardClaimDeadline;

    const { data, error } = await this.supabase
      .from('challenges')
      .update(updates)
      .eq('id', challengeId)
      .select(
        'id, title, description, created_by, status, start_at, end_at, max_participants, reward_claim_deadline, created_at, updated_at',
      )
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as ChallengeRow;
  }

  async deleteChallenge(
    challengeId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const challenge = await this.loadChallenge(challengeId);
    this.assertCreator(challenge, userId);
    this.assertChallengeEditable(challenge);

    const { error } = await this.supabase
      .from('challenges')
      .delete()
      .eq('id', challengeId);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async publishChallenge(
    challengeId: string,
    userId: string,
  ): Promise<ChallengeRow> {
    const challenge = await this.loadChallenge(challengeId);
    this.assertCreator(challenge, userId);

    if (challenge.status !== ChallengeStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT challenges can be published');
    }

    if (!challenge.title || challenge.title.trim().length === 0) {
      throw new BadRequestException('Challenge title cannot be empty');
    }

    const [requirements, rewards] = await Promise.all([
      this.loadRequirements(challengeId),
      this.loadRewards(challengeId),
    ]);

    if (requirements.length === 0) {
      throw new BadRequestException(
        'Challenge must have at least one requirement to publish',
      );
    }

    if (rewards.length === 0) {
      throw new BadRequestException(
        'Challenge must have at least one reward to publish',
      );
    }

    const now = new Date();

    if (challenge.end_at && new Date(challenge.end_at) <= now) {
      throw new BadRequestException('Challenge end date cannot be in the past');
    }

    if (
      challenge.start_at &&
      challenge.end_at &&
      new Date(challenge.end_at) <= new Date(challenge.start_at)
    ) {
      throw new BadRequestException('Challenge end date must be after start date');
    }

    if (
      challenge.max_participants !== null &&
      challenge.max_participants <= 0
    ) {
      throw new BadRequestException('maxParticipants must be greater than 0');
    }

    // Validate all reward configs
    for (const reward of rewards) {
      validateChallengeRewardConfig(reward.type, reward.config);
    }

    const newStatus =
      challenge.start_at && new Date(challenge.start_at) > now
        ? ChallengeStatus.SCHEDULED
        : ChallengeStatus.ACTIVE;

    const { data, error } = await this.supabase
      .from('challenges')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', challengeId)
      .select(
        'id, title, description, created_by, status, start_at, end_at, max_participants, reward_claim_deadline, created_at, updated_at',
      )
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as ChallengeRow;
  }

  async cancelChallenge(
    challengeId: string,
    userId: string,
  ): Promise<ChallengeRow> {
    const challenge = await this.loadChallenge(challengeId);
    this.assertCreator(challenge, userId);

    if (
      challenge.status !== ChallengeStatus.SCHEDULED &&
      challenge.status !== ChallengeStatus.ACTIVE
    ) {
      throw new BadRequestException(
        `Cannot cancel challenge with status ${challenge.status}`,
      );
    }

    const { data, error } = await this.supabase
      .from('challenges')
      .update({
        status: ChallengeStatus.CANCELLED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', challengeId)
      .select(
        'id, title, description, created_by, status, start_at, end_at, max_participants, reward_claim_deadline, created_at, updated_at',
      )
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as ChallengeRow;
  }

  // ==========================================
  // REQUIREMENT CRUD
  // ==========================================

  async addRequirement(
    challengeId: string,
    userId: string,
    dto: CreateChallengeRequirementDto,
  ): Promise<ChallengeRequirementRow> {
    const challenge = await this.loadChallenge(challengeId);
    this.assertCreator(challenge, userId);
    this.assertChallengeEditable(challenge);

    const policyId = dto.policyId.trim();
    const assetName = dto.assetName.trim();
    const minQuantity = dto.minQuantity ?? 1;
    const sortOrder = dto.sortOrder ?? 0;

    if (!policyId) {
      throw new BadRequestException('policyId is required');
    }
    if (!assetName) {
      throw new BadRequestException('assetName is required');
    }
    if (minQuantity < 1) {
      throw new BadRequestException('minQuantity must be at least 1');
    }

    const { data, error } = await this.supabase
      .from('challenge_requirements')
      .insert({
        challenge_id: challengeId,
        policy_id: policyId,
        asset_name: assetName,
        min_quantity: minQuantity,
        sort_order: sortOrder,
      })
      .select(
        'id, challenge_id, policy_id, asset_name, min_quantity, sort_order, created_at',
      )
      .single();

    if (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Requirement with this policyId and assetName already exists for this challenge',
        );
      }
      throw new BadRequestException(error.message);
    }

    return data as ChallengeRequirementRow;
  }

  async listRequirements(
    challengeId: string,
  ): Promise<ChallengeRequirementRow[]> {
    return this.loadRequirements(challengeId);
  }

  async updateRequirement(
    challengeId: string,
    requirementId: string,
    userId: string,
    dto: UpdateChallengeRequirementDto,
  ): Promise<ChallengeRequirementRow> {
    const challenge = await this.loadChallenge(challengeId);
    this.assertCreator(challenge, userId);
    this.assertChallengeEditable(challenge);

    const requirement = await this.loadRequirement(challengeId, requirementId);

    const updates: Record<string, unknown> = {};
    if (dto.policyId !== undefined) {
      const policyId = dto.policyId.trim();
      if (!policyId) throw new BadRequestException('policyId cannot be empty');
      updates.policy_id = policyId;
    }
    if (dto.assetName !== undefined) {
      const assetName = dto.assetName.trim();
      if (!assetName) throw new BadRequestException('assetName cannot be empty');
      updates.asset_name = assetName;
    }
    if (dto.minQuantity !== undefined) {
      if (dto.minQuantity < 1) {
        throw new BadRequestException('minQuantity must be at least 1');
      }
      updates.min_quantity = dto.minQuantity;
    }
    if (dto.sortOrder !== undefined) {
      if (dto.sortOrder < 0) {
        throw new BadRequestException('sortOrder cannot be negative');
      }
      updates.sort_order = dto.sortOrder;
    }

    const { data, error } = await this.supabase
      .from('challenge_requirements')
      .update(updates)
      .eq('id', requirement.id)
      .eq('challenge_id', challengeId)
      .select(
        'id, challenge_id, policy_id, asset_name, min_quantity, sort_order, created_at',
      )
      .single();

    if (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Requirement with this policyId and assetName already exists for this challenge',
        );
      }
      throw new BadRequestException(error.message);
    }

    return data as ChallengeRequirementRow;
  }

  async deleteRequirement(
    challengeId: string,
    requirementId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const challenge = await this.loadChallenge(challengeId);
    this.assertCreator(challenge, userId);
    this.assertChallengeEditable(challenge);

    const requirement = await this.loadRequirement(challengeId, requirementId);

    const { error } = await this.supabase
      .from('challenge_requirements')
      .delete()
      .eq('id', requirement.id)
      .eq('challenge_id', challengeId);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  // ==========================================
  // CHALLENGE REWARD CRUD
  // ==========================================

  async addReward(
    challengeId: string,
    userId: string,
    dto: CreateChallengeRewardDto,
  ): Promise<ChallengeRewardRow> {
    const challenge = await this.loadChallenge(challengeId);
    this.assertCreator(challenge, userId);
    this.assertChallengeEditable(challenge);

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Reward name is required');
    }

    validateChallengeRewardConfig(dto.type, dto.config);

    const { data, error } = await this.supabase
      .from('challenge_rewards')
      .insert({
        challenge_id: challengeId,
        tier: dto.tier,
        type: dto.type,
        name,
        description: dto.description?.trim() ?? null,
        config: dto.config,
        sort_order: dto.sortOrder ?? 0,
      })
      .select(
        'id, challenge_id, tier, type, name, description, config, sort_order, created_at, updated_at',
      )
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as ChallengeRewardRow;
  }

  async listRewards(challengeId: string): Promise<ChallengeRewardRow[]> {
    return this.loadRewards(challengeId);
  }

  async updateReward(
    challengeId: string,
    rewardId: string,
    userId: string,
    dto: UpdateChallengeRewardDto,
  ): Promise<ChallengeRewardRow> {
    const challenge = await this.loadChallenge(challengeId);
    this.assertCreator(challenge, userId);
    this.assertChallengeEditable(challenge);

    const reward = await this.loadReward(challengeId, rewardId);

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.tier !== undefined) updates.tier = dto.tier;
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Reward name cannot be empty');
      updates.name = name;
    }
    if (dto.description !== undefined) {
      updates.description = dto.description?.trim() ?? null;
    }
    if (dto.sortOrder !== undefined) {
      if (dto.sortOrder < 0) {
        throw new BadRequestException('sortOrder cannot be negative');
      }
      updates.sort_order = dto.sortOrder;
    }
    if (dto.config !== undefined) {
      validateChallengeRewardConfig(reward.type, dto.config);
      updates.config = dto.config;
    }

    const { data, error } = await this.supabase
      .from('challenge_rewards')
      .update(updates)
      .eq('id', reward.id)
      .eq('challenge_id', challengeId)
      .select(
        'id, challenge_id, tier, type, name, description, config, sort_order, created_at, updated_at',
      )
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as ChallengeRewardRow;
  }

  async deleteReward(
    challengeId: string,
    rewardId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const challenge = await this.loadChallenge(challengeId);
    this.assertCreator(challenge, userId);
    this.assertChallengeEditable(challenge);

    const reward = await this.loadReward(challengeId, rewardId);

    const { error } = await this.supabase
      .from('challenge_rewards')
      .delete()
      .eq('id', reward.id)
      .eq('challenge_id', challengeId);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  // ==========================================
  // GATING & PARTICIPATION
  // ==========================================

  async checkChallengeEligibility(
    challengeId: string,
    userId: string,
  ): Promise<ChallengeEligibilityResponse> {
    const [challenge, requirements, user] = await Promise.all([
      this.loadChallenge(challengeId),
      this.loadRequirements(challengeId),
      this.loadUserWallet(userId),
    ]);

    this.assertChallengeActive(challenge);

    if (!user.wallet_address) {
      throw new BadRequestException('User wallet address is not configured');
    }
    if (requirements.length === 0) {
      return {
        challengeId,
        eligible: true,
        requirementMode: 'ALL',
        requirements: [],
      };
    }

    const ownershipCache = new Map<string, Promise<OwnershipLookup>>();
    const evaluatedRequirements = await Promise.all(
      requirements.map(async (requirement) => {
        const minQuantity = BigInt(requirement.min_quantity);
        const cacheKey = `${requirement.policy_id}:${requirement.asset_name}`;
        let ownershipPromise = ownershipCache.get(cacheKey);

        if (!ownershipPromise) {
          ownershipPromise = this.cardanoService.checkAssetOwnership(
            user.wallet_address as string,
            requirement.policy_id,
            requirement.asset_name,
          );
          ownershipCache.set(cacheKey, ownershipPromise);
        }

        const ownership = await ownershipPromise;
        const satisfied = ownership.quantity >= minQuantity;

        return {
          id: requirement.id,
          policyId: requirement.policy_id,
          assetName: requirement.asset_name,
          minQuantity: minQuantity.toString(),
          owned: ownership.owned,
          quantity: ownership.quantity.toString(),
          assetUnit: ownership.assetUnit,
          satisfied,
        };
      }),
    );

    return {
      challengeId,
      eligible: evaluatedRequirements.every(
        (requirement) => requirement.satisfied,
      ),
      requirementMode: 'ALL',
      requirements: evaluatedRequirements,
    };
  }

  async startChallenge(
    challengeId: string,
    userId: string,
  ): Promise<ChallengeParticipationRow> {
    const challenge = await this.loadChallenge(challengeId);
    this.assertChallengeActive(challenge);

    // Max participants check
    if (challenge.max_participants !== null) {
      const { count, error: countError } = await this.supabase
        .from('challenge_participations')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId);

      if (countError) throw new BadRequestException(countError.message);

      if (count !== null && count >= challenge.max_participants) {
        throw new ForbiddenException(
          'Challenge has reached maximum participants',
        );
      }
    }

    const eligibility = await this.checkChallengeEligibility(
      challengeId,
      userId,
    );

    if (!eligibility.eligible) {
      throw new ForbiddenException({
        message: 'Missing required Badge/NFT',
        eligibility,
      });
    }

    const { data, error } = await this.supabase
      .from('challenge_participations')
      .insert({
        challenge_id: challengeId,
        user_id: userId,
        status: ChallengeParticipationStatus.IN_PROGRESS,
      })
      .select('id, challenge_id, user_id, status, started_at, completed_at')
      .single();

    if (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Challenge already started');
      }
      throw new BadRequestException(error.message);
    }

    return data as ChallengeParticipationRow;
  }

  // ==========================================
  // INTERNAL HELPERS
  // ==========================================

  private async loadChallenge(challengeId: string): Promise<ChallengeRow> {
    const { data, error } = await this.supabase
      .from('challenges')
      .select(
        'id, title, description, created_by, status, start_at, end_at, max_participants, reward_claim_deadline, created_at, updated_at',
      )
      .eq('id', challengeId)
      .single();

    if (error || !data) throw new NotFoundException('Challenge not found');
    return data as ChallengeRow;
  }

  private async loadRequirements(
    challengeId: string,
  ): Promise<ChallengeRequirementRow[]> {
    const { data, error } = await this.supabase
      .from('challenge_requirements')
      .select(
        'id, challenge_id, policy_id, asset_name, min_quantity, sort_order, created_at',
      )
      .eq('challenge_id', challengeId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as ChallengeRequirementRow[];
  }

  private async loadRequirement(
    challengeId: string,
    requirementId: string,
  ): Promise<ChallengeRequirementRow> {
    const { data, error } = await this.supabase
      .from('challenge_requirements')
      .select(
        'id, challenge_id, policy_id, asset_name, min_quantity, sort_order, created_at',
      )
      .eq('id', requirementId)
      .eq('challenge_id', challengeId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Challenge requirement not found');
    }
    return data as ChallengeRequirementRow;
  }

  private async loadRewards(
    challengeId: string,
  ): Promise<ChallengeRewardRow[]> {
    const { data, error } = await this.supabase
      .from('challenge_rewards')
      .select(
        'id, challenge_id, tier, type, name, description, config, sort_order, created_at, updated_at',
      )
      .eq('challenge_id', challengeId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as ChallengeRewardRow[];
  }

  private async loadReward(
    challengeId: string,
    rewardId: string,
  ): Promise<ChallengeRewardRow> {
    const { data, error } = await this.supabase
      .from('challenge_rewards')
      .select(
        'id, challenge_id, tier, type, name, description, config, sort_order, created_at, updated_at',
      )
      .eq('id', rewardId)
      .eq('challenge_id', challengeId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Challenge reward not found');
    }
    return data as ChallengeRewardRow;
  }

  private async loadUserWallet(userId: string): Promise<UserWalletRow> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, wallet_address')
      .eq('id', userId)
      .single();

    if (error || !data) throw new NotFoundException('User not found');

    const user = data as UserWalletRow;
    if (!user.wallet_address) {
      throw new BadRequestException('User wallet address is not configured');
    }

    return user;
  }

  private assertCreator(challenge: ChallengeRow, userId: string) {
    if (challenge.created_by !== userId) {
      throw new ForbiddenException(
        'You are not authorized to modify this challenge',
      );
    }
  }

  private assertChallengeEditable(challenge: ChallengeRow) {
    if (challenge.status !== ChallengeStatus.DRAFT) {
      throw new ForbiddenException(
        `Challenge cannot be modified in status ${challenge.status}`,
      );
    }
  }

  private assertChallengeActive(challenge: ChallengeRow) {
    const now = new Date();

    if (challenge.status !== ChallengeStatus.ACTIVE) {
      throw new ForbiddenException('Challenge is not active');
    }

    if (challenge.start_at && new Date(challenge.start_at) > now) {
      throw new ForbiddenException('Challenge has not started');
    }

    if (challenge.end_at && new Date(challenge.end_at) <= now) {
      throw new ForbiddenException('Challenge is closed');
    }
  }

  private validateDateRange(
    startAt?: string | null,
    endAt?: string | null,
  ) {
    if (startAt && endAt) {
      if (new Date(endAt) <= new Date(startAt)) {
        throw new BadRequestException(
          'Challenge end date must be after start date',
        );
      }
    }
  }

  private isUniqueViolation(error: { code?: string; message?: string }) {
    return (
      error.code === '23505' ||
      error.message?.toLowerCase().includes('duplicate') ||
      error.message?.toLowerCase().includes('unique')
    );
  }
}
