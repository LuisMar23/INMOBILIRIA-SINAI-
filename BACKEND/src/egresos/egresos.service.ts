import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { CreateEgresoDto, FiltrosEgresoDto } from './dto/create-egreso.dto';
import { UpdateEgresoDto } from './dto/update-egreso.dto';
import { PrismaService } from 'src/config/prisma.service';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class EgresosService {
  constructor(private prisma: PrismaService) {}

// create: agregar urbanizacionId y vouchers
 async create(dto: CreateEgresoDto, usuarioId: number, files?: Express.Multer.File[]) {
  // Convertir los IDs a número
  const cajaId = Number(dto.cajaId);
  const urbanizacionId = dto.urbanizacionId ? Number(dto.urbanizacionId) : null;
  const categoriaId = dto.categoriaId ? Number(dto.categoriaId) : null;
  
  const caja = await this.prisma.caja.findUnique({ where: { id: cajaId } });
  if (!caja) throw new NotFoundException('Caja no encontrada');
  if (caja.estado === 'CERRADA') throw new BadRequestException('La caja está cerrada');
  if (Number(caja.saldoActual) < Number(dto.monto))
    throw new BadRequestException('Saldo insuficiente en caja');

  if (urbanizacionId) {
    const urb = await this.prisma.urbanizacion.findUnique({ where: { id: urbanizacionId } });
    if (!urb) throw new NotFoundException('Urbanización no encontrada');
  }

  return this.prisma.$transaction(async (tx) => {
    const egreso = await tx.egreso.create({
      data: {
        descripcion: dto.descripcion,
        monto: Number(dto.monto),
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
        categoriaId: categoriaId,
        cajaId: cajaId,
        urbanizacionId: urbanizacionId,
        registradoPor: usuarioId,
      },
      include: { categoria: true, usuario: true, caja: true, urbanizacion: true },
    });

    // Guardar archivos subidos
    if (files && files.length) {
      const archivosData = files.map(file => ({
        urlArchivo: `/uploads/egresos/${file.filename}`,
        egresoId: egreso.id,
        tipoArchivo: 'voucher',
        nombreArchivo: file.originalname,
      }));
      
      await tx.archivo.createMany({ data: archivosData });
    }

    await tx.movimientoCaja.create({
      data: {
        cajaId: cajaId,
        usuarioId,
        tipo: 'EGRESO',
        monto: Number(dto.monto),
        descripcion: dto.descripcion,
        referencia: `EGRESO-${egreso.id}`,
        egresoId: egreso.id,
        metodoPago: dto.metodoPago ?? 'EFECTIVO',
      },
    });

    await tx.caja.update({
      where: { id: cajaId },
      data: { saldoActual: { decrement: Number(dto.monto) } },
    });

    return egreso;
  });
}

// findAll: filtro por urbanizacionId y sinUrbanizacion
async findAll(filtros: FiltrosEgresoDto) {
  const where: any = {};

  if (filtros.fechaInicio || filtros.fechaFin) {
    where.fecha = {};
    if (filtros.fechaInicio) where.fecha.gte = new Date(filtros.fechaInicio);
    if (filtros.fechaFin)    where.fecha.lte = new Date(filtros.fechaFin);
  }
  if (filtros.categoriaId)    where.categoriaId    = Number(filtros.categoriaId);
  if (filtros.cajaId)         where.cajaId         = Number(filtros.cajaId);
  if (filtros.usuarioId)      where.registradoPor  = Number(filtros.usuarioId);
  if (filtros.urbanizacionId) where.urbanizacionId = Number(filtros.urbanizacionId);
  if (filtros.sinUrbanizacion) where.urbanizacionId = null;   // ← Gtos Generales

  const [egresos, total] = await Promise.all([
    this.prisma.egreso.findMany({
      where,
      include: {
        categoria:    true,
        usuario:      true,
        caja:         true,
        urbanizacion: true,     // ← NUEVO
        archivos:     true,     // ← NUEVO (vouchers)
      },
      orderBy: { fecha: 'desc' },
    }),
    this.prisma.egreso.aggregate({
      where,
      _sum:   { monto: true },
      _count: true,
    }),
  ]);

  return {
    resumen: {
      totalEgresos: total._count,
      montoTotal:   total._sum.monto ?? 0,
    },
    egresos,
  };
}

// findOne: incluir urbanizacion y archivos
async findOne(id: number) {
  const egreso = await this.prisma.egreso.findUnique({
    where:   { id },
    include: {
      categoria:      true,
      usuario:        true,
      caja:           true,
      urbanizacion:   true,   // ← NUEVO
      archivos:       true,   // ← NUEVO
      movimientosCaja: true,
    },
  });
  if (!egreso) throw new NotFoundException('Egreso no encontrado');
  return egreso;
}

// update: soportar urbanizacionId y vouchers nuevos
async update(id: number, dto: UpdateEgresoDto, usuarioId: number, files?: Express.Multer.File[]) {
  const egreso = await this.prisma.egreso.findUnique({
    where: { id },
    include: { movimientosCaja: true },
  });
  if (!egreso) throw new NotFoundException('Egreso no encontrado');

  const montoAnterior = Number(egreso.monto);
  const montoNuevo = dto.monto ? Number(dto.monto) : montoAnterior;
  const cajaId = dto.cajaId ? Number(dto.cajaId) : egreso.cajaId;
  const urbanizacionId = dto.urbanizacionId ? Number(dto.urbanizacionId) : undefined;

  if (cajaId) {
    const caja = await this.prisma.caja.findUnique({ where: { id: cajaId } });
    if (!caja) throw new NotFoundException('Caja no encontrada');
    if (caja.estado === 'CERRADA') throw new BadRequestException('La caja está cerrada');
    const diferencia = montoNuevo - montoAnterior;
    if (diferencia > 0 && Number(caja.saldoActual) < diferencia)
      throw new BadRequestException('Saldo insuficiente en caja');
  }

  return this.prisma.$transaction(async (tx) => {
    if (egreso.cajaId && dto.monto) {
      await tx.caja.update({
        where: { id: egreso.cajaId },
        data: { saldoActual: { increment: montoAnterior } },
      });
    }

    await tx.movimientoCaja.deleteMany({ where: { egresoId: id } });

    // Agregar nuevos archivos si vienen
    if (files && files.length) {
      const archivosData = files.map(file => ({
        urlArchivo: `/uploads/egresos/${file.filename}`,
        egresoId: id,
        tipoArchivo: 'voucher',
        nombreArchivo: file.originalname,
      }));
      await tx.archivo.createMany({ data: archivosData });
    }

    const egresoActualizado = await tx.egreso.update({
      where: { id },
      data: {
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.monto !== undefined && { monto: Number(dto.monto) }),
        ...(dto.fecha !== undefined && { fecha: new Date(dto.fecha) }),
        ...(dto.categoriaId !== undefined && { categoriaId: dto.categoriaId ? Number(dto.categoriaId) : null }),
        ...(dto.cajaId !== undefined && { cajaId: Number(dto.cajaId) }),
        ...(urbanizacionId !== undefined && { urbanizacionId: urbanizacionId || null }),
      },
      include: { categoria: true, usuario: true, caja: true, urbanizacion: true, archivos: true },
    });

    if (cajaId) {
      await tx.movimientoCaja.create({
        data: {
          cajaId,
          usuarioId,
          tipo: 'EGRESO',
          monto: montoNuevo,
          descripcion: dto.descripcion ?? egreso.descripcion,
          referencia: `EGRESO-${id}`,
          egresoId: id,
          metodoPago: dto.metodoPago ?? 'EFECTIVO',
        },
      });
      await tx.caja.update({
        where: { id: cajaId },
        data: { saldoActual: { decrement: montoNuevo } },
      });
    }

    return egresoActualizado;
  });
}

  // ─── Eliminar Egreso ────────────────────────────────────────────
  async remove(id: number) {
    const egreso = await this.prisma.egreso.findUnique({
      where: { id },
    });
    if (!egreso) throw new NotFoundException('Egreso no encontrado');

    return this.prisma.$transaction(async (tx) => {
      // Eliminar movimientos de caja vinculados
      await tx.movimientoCaja.deleteMany({
        where: { egresoId: id },
      });

      // Revertir saldo en caja
      if (egreso.cajaId) {
        await tx.caja.update({
          where: { id: egreso.cajaId },
          data:  { saldoActual: { increment: egreso.monto } },
        });
      }

      await tx.egreso.delete({ where: { id } });

      return { message: 'Egreso eliminado y caja actualizada correctamente' };
    });
  }
  async removeVoucher(egresoId: number, archivoId: number) {
    const archivo = await this.prisma.archivo.findFirst({
      where: { id: archivoId, egresoId },
    });
    if (!archivo) throw new NotFoundException('Voucher no encontrado');
    
    // Eliminar archivo físico
    const filePath = join(process.cwd(), archivo.urlArchivo);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await this.prisma.archivo.delete({ where: { id: archivoId } });
    return { message: 'Voucher eliminado correctamente' };
  }

  async reportePorCaja(filtros: FiltrosEgresoDto) {
    const where: any = {};
    if (filtros.fechaInicio || filtros.fechaFin) {
      where.fecha = {};
      if (filtros.fechaInicio) where.fecha.gte = new Date(filtros.fechaInicio);
      if (filtros.fechaFin)    where.fecha.lte = new Date(filtros.fechaFin);
    }

    const egresos = await this.prisma.egreso.findMany({
      where,
      include: { caja: true },
    });

    const mapa = new Map<number, any>();
    for (const e of egresos) {
      if (!e.cajaId) continue;
      if (!mapa.has(e.cajaId)) {
        mapa.set(e.cajaId, {
          caja:         e.caja,
          totalEgresos: 0,
          montoTotal:   0,
        });
      }
      const g = mapa.get(e.cajaId);
      g.totalEgresos++;
      g.montoTotal += Number(e.monto);
    }

    const cajas = Array.from(mapa.values());
    const montoTotal = cajas.reduce((s, c) => s + c.montoTotal, 0);

    return { resumen: { montoTotal, totalCajas: cajas.length }, cajas };
  }
}