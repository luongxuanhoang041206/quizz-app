import { Module } from '@nestjs/common';
import { CardanoService } from './cardano.service';
import { CardanoController } from './cardano.controller';

@Module({
  controllers:[CardanoController],
  providers: [CardanoService],
  exports: [CardanoService],
})
export class CardanoModule {}

