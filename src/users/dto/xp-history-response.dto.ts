import { XpPeriod } from "./query.dto";

export class XpDataPointDto {
  date?: string;       // ISO date 'YYYY-MM-DD'
  xp?: number;
}

export class XpHistoryDto {
  period?: XpPeriod;
  data?: XpDataPointDto[];
  total_xp_period?: number;
}