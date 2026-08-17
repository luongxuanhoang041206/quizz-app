import { Module } from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { AttemptsController } from './attempts.controller';
import { UserModule } from 'src/users/user.module';
import { QuizGradingModule } from 'src/quiz-grading/quiz-grading.module';

@Module({
  imports: [UserModule, QuizGradingModule],
  controllers: [AttemptsController],
  providers: [AttemptsService],
})
export class AttemptsModule {}
