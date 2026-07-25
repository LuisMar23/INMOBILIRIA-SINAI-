import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { PropiedadController, PublicPropiedadController } from './propiedad.controller';
import { PropiedadService } from './propiedad.service';

@Module({
  controllers: [PropiedadController, PublicPropiedadController],
  providers: [PropiedadService, PrismaService],
})
export class PropiedadModule {}