import { Controller } from "@nestjs/common";
import { CardanoService } from "./cardano.service";
import { Get, Query } from "@nestjs/common";

@Controller('cardano')
export class CardanoController {
    constructor(private readonly cardanoService: CardanoService) {}

    @Get('ownership')
    async checkOwnership(
        @Query('address') address : string,
        @Query('policyId') policyId : string,
        @Query('assetName') assetName: string,
    ) {
        return this.cardanoService.checkAssetOwnership(address, policyId, assetName);
    }
}