export class CategoryStatDto {
  category_id?: string;
  name?: string;
  slug?: string;
  color_hex?: string;
  icon_url?: string | null;
  total_attempts?: number;
  correct_answers?: number;
  total_questions?: number;
  accuracy?: number;
  total_xp_earned?: number;
  last_played_at?: Date | null;
}