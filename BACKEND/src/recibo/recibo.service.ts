import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReciboDto } from './dto/create-recibo.dto';
import { UpdateReciboDto } from './dto/update-recibo.dto';
import { PrismaService } from 'src/config/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReciboService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReciboDto, usuarioRegistroId: number) {
    const relacionCount = [
      dto.ventaId,
      dto.reservaId,
      dto.pagoPlanPagoId,
    ].filter(Boolean).length;
    if (relacionCount !== 1) {
      throw new Error(
        'Debe proporcionar exactamente un ID relacionado: ventaId, reservaId o pagoPlanPagoId.',
      );
    }

    return this.prisma.recibo.create({
      data: {
        ...dto,
        usuarioRegistroId,
      },
    });
  }

  async createMultiple(
    dto: CreateReciboDto,
    files: Express.Multer.File[],
    usuarioRegistroId: number,
  ) {
    const relacionCount = [
      dto.ventaId,
      dto.reservaId,
      dto.pagoPlanPagoId,
    ].filter(Boolean).length;
    if (relacionCount !== 1) {
      throw new Error(
        'Debe proporcionar exactamente un ID relacionado: ventaId, reservaId o pagoPlanPagoId.',
      );
    }

    const recibos = await Promise.all(
      files.map((file) =>
        this.prisma.recibo.create({
          data: {
            ...dto,
            urlArchivo: `/uploads/recibos/${file.filename}`,
            tipoArchivo: file.mimetype,
            nombreArchivo: file.originalname,
            usuarioRegistroId,
          },
        }),
      ),
    );

    return recibos;
  }

  async findAll() {
    return this.prisma.recibo.findMany({
      include: {
        venta: true,
        reserva: true,
        pagoPlanPago: true,
        usuarioRegistro: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { creado_en: 'desc' },
    });
  }

  async findByVenta(ventaId: number) {
    return this.prisma.recibo.findMany({
      where: { ventaId },
      include: {
        usuarioRegistro: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { creado_en: 'desc' },
    });
  }

  async findByReserva(reservaId: number) {
    return this.prisma.recibo.findMany({
      where: { reservaId },
      include: {
        usuarioRegistro: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { creado_en: 'desc' },
    });
  }

  async findByPagoPlan(pagoPlanPagoId: number) {
    return this.prisma.recibo.findMany({
      where: { pagoPlanPagoId },
      include: {
        usuarioRegistro: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { creado_en: 'desc' },
    });
  }

  async update(id: number, dto: UpdateReciboDto) {
    const recibo = await this.prisma.recibo.findUnique({ where: { id } });
    if (!recibo) throw new NotFoundException('Recibo no encontrado');

    const updateData = { ...dto };
    if (updateData.urlArchivo) {
      const oldFilePath = path.join(process.cwd(), recibo.urlArchivo);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    return this.prisma.recibo.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number) {
    const recibo = await this.prisma.recibo.findUnique({ where: { id } });
    if (!recibo) throw new NotFoundException('Recibo no encontrado');

    if (recibo.urlArchivo) {
      const filePath = path.join(process.cwd(), recibo.urlArchivo);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error eliminando archivo:', err);
      }
    }

    return this.prisma.recibo.delete({ where: { id } });
  }
}
