import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/UpdateUserDto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  getUser(@Param('id') userId: string) {
    return this.userService.getUser(userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  updateUser(@Param('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(userId, dto);
  }

  @Get(':id/quizzes')
  userQuizz(@Param('id') userId: string) {
    return this.userService.userQuizz(userId);
  }

  @Get(':id/attempts')
  userQuizzAttemps(@Param('id') userId: string) {
    return this.userService.userQuizzAttemps(userId);
  }
}
