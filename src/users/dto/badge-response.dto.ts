export class UnlockedBadgeDto {
  id?: string;
  key?: string;
  name?: string;
  description?: string;
  icon_url?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward?: number;
  earned_at?: Date;
}

export class LockedBadgeDto {
  id?: string;
  key?: string;
  name?: string;
  description?: string;
  icon_url?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward?: number;
  condition_type?: string;
  condition_value?: number;
  current_progress?: number;
  progress_percent?: number;
}

export class BadgesResponseDto {
  unlocked?: UnlockedBadgeDto[];
  locked?: LockedBadgeDto[];
}