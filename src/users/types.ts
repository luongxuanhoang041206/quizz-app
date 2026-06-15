export interface XpCalcParams {
  score: number;
  totalQuestions: number;
  isPerfect: boolean;
  currentStreak: number;
}

export interface LevelComputeResult {
  newLevel: number;
  newCurrentXp: number;
  newNextXp: number;
  leveledUp: boolean;
}
