import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { use } from "passport";
import { UpdateUserDto } from "./dto/UpdateUserDto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService
    ) {}

    @Get(':id')
    getUser(@Param('id') userId: string) {
        return this.userService.getUser(userId);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    updateUser(@Param('id') userId: string, @Body() dto: UpdateUserDto) {
        return this.userService.updateUser(userId, dto);
    }

    @Get(':id')
    userQuizz(@Param('id') userId: string) {
        return this.userService.userQuizz(userId);
    }

    @Get(':id')
    userQuizzAttemps(@Param('id') userId: string) {
        return this.userService.userQuizzAttemps(userId);
    }
}