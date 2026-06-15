import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

export enum XpPeriod {
    DAY = 'day',
    WEEK = 'week',
    MONTH= 'month'
}

export class XpHistoryQueryDto {
    @IsEnum(XpPeriod)
    @IsOptional()
    period?: XpPeriod = XpPeriod.WEEK;
}

export class CursorPaginationDto {
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}