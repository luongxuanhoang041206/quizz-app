import { IsEnum, IsOptional } from "class-validator";

export class toggleQuestionDto {
    @IsOptional()
    @IsEnum(['private', 'public'])
    visibility?: 'private' | 'public';
}