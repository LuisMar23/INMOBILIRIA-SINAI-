import { Module } from '@nestjs/common';
import { SedeController } from './sedes.controller';
import { SedeService } from './sedes.service';
import { PrismaService } from 'src/config/prisma.service';


@Module({
  controllers: [SedeController],
  providers: [SedeService,PrismaService],
})
export class SedesModule {}
