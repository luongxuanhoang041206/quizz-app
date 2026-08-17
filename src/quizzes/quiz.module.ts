import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { RolesGuard } from 'src/common/guard/roles.guard';

@Module({
  controllers: [QuizController],
  providers: [QuizService, RolesGuard],
})
export class QuizModule {}
