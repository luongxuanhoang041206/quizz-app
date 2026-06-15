export class ActivityLogDto {
  id?: string;
  type?: string;
  metadata?: Record<string, unknown>;
  created_at?: Date;
}
