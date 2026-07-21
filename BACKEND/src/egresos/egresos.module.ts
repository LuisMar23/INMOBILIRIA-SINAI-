import { Module } from '@nestjs/common';
import { EgresosService } from './egresos.service';
import { EgresosController } from './egresos.controller';
import { PrismaService } from 'src/config/prisma.service';

@Module({
  controllers: [EgresosController],
  providers: [EgresosService,PrismaService],
})
export class EgresosModule {}
