import { Module } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { MovimientosController } from 'src/movimiento/movimiento.controller';
import { MovimientosService } from 'src/movimiento/movimiento.service';

@Module({
  controllers: [MovimientosController],
  providers: [MovimientosService, PrismaService],
  exports: [MovimientosService],
})
export class MovimientoModule {}
