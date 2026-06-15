import { Injectable } from "@nestjs/common";

@Injectable()
export class XpService {
    private xpRequiredForLevcel(level: number): number {
        return level * 1000;
    }

    calculate(params: {
        score: number; totalQuestions: number;
        isPerfect: boolean; currentStreak: number;
    }): number {
        const baseXp = 50;
        const scoreBonus = Math.floor(params.score * 0.5);
         const perfectBonus  = params.isPerfect ? 50 : 0;
        const streakMult    = Math.min(1 + params.currentStreak * 0.05, 2.0);
        return Math.floor((baseXp + scoreBonus + perfectBonus) * streakMult);
    }

    computeLevel(totalXp: number, currentLevel: number): {
        newLevel: number; newCurrentXp: number; newNextXp: number; leveledUp: boolean;
    } {
        let level = currentLevel;
        let remaining = totalXp;

        for(let l = 1; l < level ;l++) remaining -= this.xpRequiredForLevcel(l);

        while(remaining >= this.xpRequiredForLevcel(level)) {
            remaining -= this.xpRequiredForLevcel(level);
            level++;
        }

        return {
            newLevel: level,
            newCurrentXp: remaining,
            newNextXp: this.xpRequiredForLevcel(level),
            leveledUp: level > currentLevel,
        };
    }
}