// src/promocion/promocion.module.ts
import { Module } from '@nestjs/common';
import { PromocionService } from './promocion.service';
import { PromocionController } from './promocion.controller';
import { PrismaService } from 'src/config/prisma.service';

@Module({
  controllers: [PromocionController],
  providers: [PromocionService, PrismaService],
})
export class PromocionModule {}
