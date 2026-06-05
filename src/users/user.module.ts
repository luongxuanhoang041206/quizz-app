import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { Passport } from "passport";
import { PassportModule } from "@nestjs/passport";

@Module({
    controllers: [UserController],
    providers: [UserService],
})

export class UserModule {}