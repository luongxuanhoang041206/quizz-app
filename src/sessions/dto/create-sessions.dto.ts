import { IsUUID } from "class-validator";

export class CreateSessionDto {
    @IsUUID()
    quiz_id!: string;
}