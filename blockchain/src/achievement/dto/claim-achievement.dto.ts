import { IsUUID } from 'class-validator';

export class ClaimAchievementDto {
  /**
   * The UUID of the achievement record to claim.
   * Must belong to the authenticated user — ownership is enforced server-side.
   * Wallet address is resolved from the DB; do not supply it from the client.
   */
  @IsUUID()
  achievement_id!: string;
}
