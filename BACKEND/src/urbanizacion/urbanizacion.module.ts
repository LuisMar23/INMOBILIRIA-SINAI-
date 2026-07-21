import { Module } from '@nestjs/common';
import { UrbanizacionService } from './urbanizacion.service';
import { UrbanizacionController } from './urbanizacion.controller';
import { PrismaService } from 'src/config/prisma.service';

@Module({
  controllers: [UrbanizacionController],
  providers: [UrbanizacionService,PrismaService],
  exports:[UrbanizacionService]
})
export class UrbanizacionModule {}
