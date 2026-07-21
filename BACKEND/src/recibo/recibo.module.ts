import { Module } from '@nestjs/common';
import { ReciboService } from './recibo.service';
import { ReciboController } from './recibo.controller';
import { PrismaService } from 'src/config/prisma.service';

@Module({
  controllers: [ReciboController],
  providers: [ReciboService, PrismaService],
  exports: [ReciboService],

})
export class ReciboModule {}