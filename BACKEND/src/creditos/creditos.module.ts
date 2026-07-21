import { Module } from '@nestjs/common';
import { CreditosService } from './creditos.service';
import { CreditosController } from './creditos.controller';
import { PrismaService } from 'src/config/prisma.service';

@Module({

  controllers: [CreditosController],
  providers: [CreditosService,PrismaService],
})
export class CreditosModule {}
