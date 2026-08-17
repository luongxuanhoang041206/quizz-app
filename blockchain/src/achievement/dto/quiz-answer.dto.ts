import { IsString, IsNumber } from "class-validator";

export class QuizAnswerDto {

    @IsString()
    questionId!: string;

    @IsNumber()
    selectedOption!: number;

    @IsNumber()
    correctOption!: number;

}