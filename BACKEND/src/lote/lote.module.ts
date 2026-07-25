import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { LoteController, PublicLoteController } from 'src/lote/lote.controller';
import { LoteService } from 'src/lote/lote.service';

@Module({
  controllers: [LoteController, PublicLoteController],
  providers: [LoteService, PrismaService],
})
export class LotesModule {}