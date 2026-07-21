import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { ManzanoService } from './manzano.service';
import { ManzanoController } from './manzano.controller';

@Module({
  controllers: [ManzanoController],
  providers: [ManzanoService, PrismaService],
})
export class ManzanoModule {}
