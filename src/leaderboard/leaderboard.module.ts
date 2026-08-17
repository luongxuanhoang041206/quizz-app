import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { QuizGradingModule } from 'src/quiz-grading/quiz-grading.module';

@Module({
  imports: [QuizGradingModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}