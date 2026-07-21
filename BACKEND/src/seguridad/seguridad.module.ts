import { Module } from '@nestjs/common';
import { SeguridadService } from './seguridad.service';
import { SeguridadController } from './seguridad.controller';
import { PrismaService } from 'src/config/prisma.service';

@Module({
  controllers: [SeguridadController],
providers: [SeguridadService, PrismaService],
exports: [SeguridadService],
})
export class SeguridadModule {}
