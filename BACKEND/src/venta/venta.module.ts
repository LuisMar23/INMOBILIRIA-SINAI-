import { Module } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { VentasService } from './venta.service';
import { VentasController } from './venta.controller';

@Module({
  controllers: [VentasController],
  providers: [VentasService, PrismaService],
  exports: [VentasService],
})
export class VentasModule {}
