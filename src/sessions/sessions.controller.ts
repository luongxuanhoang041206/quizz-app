import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { SessionsService } from "./sessions.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import type { AuthUser } from "src/common/decorators/current-user.decorator";

import { UpdateSessionStatusDto } from "./dto/update-session.dto";
@Controller()
export class SessionsController {
    constructor(
        private readonly sessionsService: SessionsService
    ) {}

    @UseGuards(JwtAuthGuard)
    @Post('quizzes/:quizId/sessions')
    createSession(
        @Param('quizId') quizId: string,
        @CurrentUser() user: AuthUser
    ) {
        return this.sessionsService.createSession(quizId, user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('sessions/:code/join')
    joinByCode(@Param('code') code: string, @CurrentUser() user: AuthUser) {
        return this.sessionsService.joinByCode(code, user.id, user.username);
    }

    // @Get('sessions/:code/start')
    // start(@Param('code') code: string) {
    //     return this.sessionsService.start(code);
    // }

    @Get('quizzes/:quizId/sessions')
    getSessionByQuiz(@Param('quizId') quizId: string) {
        return this.sessionsService.getSessionByQuiz(quizId);
    }

    @Get('sessions/:id/status')
    getStatus(
        @Param('id') sessionId: string,
    ) {
        return this.sessionsService.getStatus(sessionId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('sessions/:id/status')
    updateStatus(
        @Param('id') sessionId: string,
        @Body() dto: UpdateSessionStatusDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.sessionsService.updateStatus(sessionId, user.id, dto.status);
    }
}
