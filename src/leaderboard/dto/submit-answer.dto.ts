import { Allow, IsNumber, IsString } from "class-validator";

export class SubmitAnswerDto {
    @IsString()
    question_id!: string;

    @Allow()
    answer!: unknown;

    @IsNumber()
    time_taken!: number;
}