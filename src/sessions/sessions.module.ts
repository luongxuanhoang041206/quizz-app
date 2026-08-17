import { Module } from "@nestjs/common";
import { SessionsController } from "./sessions.controller";
import { SessionsService } from "./sessions.service";
import { SessionFinalizeService } from "./session-finalize.service";

@Module({
    controllers: [SessionsController],
    providers: [SessionsService, SessionFinalizeService],
    exports: [SessionsService], // export cho leaderBoard su dung
})
export class SessionsModule {}