import { IsJSON, IsOptional, IsString } from "class-validator";

export class CreateRewardDto {
    @IsString() 
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string

    @IsString()
    @IsOptional()
    imageCid?: string;

    @IsJSON()
    @IsOptional()
    metadata?:string
}