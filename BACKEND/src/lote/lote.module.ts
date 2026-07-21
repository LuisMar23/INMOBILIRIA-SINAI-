import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { LoteController } from 'src/lote/lote.controller';
import { LoteService } from 'src/lote/lote.service';

@Module({
  controllers: [LoteController],
  providers: [LoteService, PrismaService],
})
export class LotesModule {}
