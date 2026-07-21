import { Module } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CotizacionController } from './cotizacion.controller';
import { CotizacionService } from './cotizacion.service';

@Module({
  controllers: [CotizacionController],
  providers: [CotizacionService, PrismaService],
})
export class CotizacionesModule {}