import { Module } from '@nestjs/common';
import { ReportesVentasController } from './reportes.controller';
import { ReportesVentasService } from './reportes.service';
import { PrismaService } from 'src/config/prisma.service';

@Module({
  controllers: [ReportesVentasController],
  providers: [ReportesVentasService,PrismaService],
})
export class ReportesModule {}
