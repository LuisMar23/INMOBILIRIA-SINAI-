import { Module } from '@nestjs/common';
import { ArchivosService } from './archivos.service';
import { ArchivosController } from './archivos.controller';
import { PrismaService } from 'src/config/prisma.service';

@Module({
  controllers: [ArchivosController],
  providers: [ArchivosService, PrismaService],
})
export class ArchivosModule {}
