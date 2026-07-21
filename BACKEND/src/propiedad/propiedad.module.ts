import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { PropiedadController } from './propiedad.controller';
import { PropiedadService } from './propiedad.service';

@Module({
  controllers: [PropiedadController],
  providers: [PropiedadService, PrismaService],
})
export class PropiedadModule {}
