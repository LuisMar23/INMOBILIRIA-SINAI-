import { Module } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { ReservasController } from './reserva.controller';
import { ReservasService } from './reserva.service';

@Module({
  controllers: [ReservasController],
  providers: [ReservasService, PrismaService],
})
export class ReservasModule {}