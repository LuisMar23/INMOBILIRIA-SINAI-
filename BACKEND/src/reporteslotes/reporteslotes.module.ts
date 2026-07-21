import { Module } from '@nestjs/common';
import { ReportesLotesController } from './reporteslotes.controller';
import { ReportesLotesService } from './reporteslotes.service';
import { PrismaService } from 'src/config/prisma.service';

@Module({
  controllers: [ReportesLotesController],
  providers: [ReportesLotesService,PrismaService],
})
export class ReporteslotesModule {}
