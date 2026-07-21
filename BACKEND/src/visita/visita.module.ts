import { Module } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { VisitasController } from './visita.controller';
import { VisitasService } from './visita.service';

@Module({
  controllers: [VisitasController],
  providers: [VisitasService, PrismaService],
})
export class VisitasModule {}