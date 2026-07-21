import { Module } from '@nestjs/common';

import { PrismaService } from 'src/config/prisma.service';
import { ReportesClientesController } from './reportes-clientes-service.controller';
import { ReportesClientesService } from './reportes-clientes-service.service';


@Module({

  controllers: [ReportesClientesController],
  providers: [ReportesClientesService,PrismaService],
})
export class ReportesClientesModule {}