import { IsString } from "class-validator";

export class UpdateSessionStatusDto {
    @IsString()
    status!: string;
}