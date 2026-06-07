import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { AttemptsModule } from './attempts/attempts.module';
import { SocialModule } from './social/social.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { QuizModule } from './quizzes/quiz.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UserModule,
    AttemptsModule,
    SocialModule,
    DashboardModule
    QuizModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
