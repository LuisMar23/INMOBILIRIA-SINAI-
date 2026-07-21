import { Module } from '@nestjs/common';
import { CierreService } from './cierre.service';
import { CierreController } from './cierre.controller';
import { PrismaService } from '../config/prisma.service';

@Module({
  controllers: [CierreController],
  providers: [CierreService, PrismaService],
  exports: [CierreService],
})
export class CierreModule {}