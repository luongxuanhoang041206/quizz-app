import { Module } from '@nestjs/common';
import { QuizGradingService } from './quiz-grading.service';

@Module({
  providers: [QuizGradingService],
  exports: [QuizGradingService],
})
export class QuizGradingModule {}
