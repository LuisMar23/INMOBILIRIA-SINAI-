import { Module } from '@nestjs/common';
import { ReportesFinancierosController } from './reportes-financiero.controller';
import { ReportesFinancierosService } from './reportes-financiero.service';
import { PrismaService } from 'src/config/prisma.service';



@Module({

  controllers: [ReportesFinancierosController],
  providers: [ReportesFinancierosService,PrismaService],
})
export class ReportesFinancierosModule {}