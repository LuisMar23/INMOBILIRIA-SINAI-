import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateArchivoDto } from './dto/create-archivo.dto';
import { UpdateArchivoDto } from './dto/update-archivo.dto';
import { PrismaService } from 'src/config/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ArchivosService {
  constructor(public readonly prisma: PrismaService) {}

  async create(
    dto: CreateArchivoDto & {
      urlArchivo: string;
      tipoArchivo: string;
      nombreArchivo: string;
    },
  ) {
    if (
      !dto.ventaId &&
      !dto.reservaId &&
      !dto.loteId &&
      !dto.urbanizacionId &&
      !dto.propiedadId
    ) {
      throw new BadRequestException(
        'Debe especificar ventaId, reservaId, loteId, urbanizacionId o propiedadId',
      );
    }

    return this.prisma.archivo.create({
      data: {
        ventaId: dto.ventaId ? Number(dto.ventaId) : null,
        reservaId: dto.reservaId ? Number(dto.reservaId) : null,
        loteId: dto.loteId ? Number(dto.loteId) : null,
        urbanizacionId: dto.urbanizacionId ? Number(dto.urbanizacionId) : null,
        propiedadId: dto.propiedadId ? Number(dto.propiedadId) : null,
        urlArchivo: dto.urlArchivo,
        tipoArchivo: dto.tipoArchivo,
        nombreArchivo: dto.nombreArchivo,
      },
    });
  }

  async createMultiple(
    dto: CreateArchivoDto,
    files: Express.Multer.File[],
    folder: string,
  ) {
    if (
      !dto.ventaId &&
      !dto.reservaId &&
      !dto.loteId &&
      !dto.urbanizacionId &&
      !dto.propiedadId
    ) {
      throw new BadRequestException(
        'Debe especificar ventaId, reservaId, loteId, urbanizacionId o propiedadId',
      );
    }

    const documentos = files.map((file) => ({
      ventaId: dto.ventaId ? Number(dto.ventaId) : null,
      reservaId: dto.reservaId ? Number(dto.reservaId) : null,
      loteId: dto.loteId ? Number(dto.loteId) : null,
      urbanizacionId: dto.urbanizacionId ? Number(dto.urbanizacionId) : null,
      propiedadId: dto.propiedadId ? Number(dto.propiedadId) : null,
      urlArchivo: `/uploads/${folder}/${file.filename}`,
      tipoArchivo: file.mimetype,
      nombreArchivo: file.originalname,
    }));

    return Promise.all(
      documentos.map((doc) =>
        this.prisma.archivo.create({
          data: doc,
        }),
      ),
    );
  }

  async findAll() {
    return this.prisma.archivo.findMany({
      include: {
        venta: true,
        reserva: true,
        lote: true,
        urbanizacion: true,
        propiedad: true,
      },
      orderBy: { creado_en: 'desc' },
    });
  }

  async findByVenta(ventaId: number) {
    return this.prisma.archivo.findMany({
      where: { ventaId },
      orderBy: { creado_en: 'desc' },
    });
  }

  async findByReserva(reservaId: number) {
    return this.prisma.archivo.findMany({
      where: { reservaId },
      orderBy: { creado_en: 'desc' },
    });
  }

  async findByPropiedad(propiedadId: number) {
    return this.prisma.archivo.findMany({
      where: { propiedadId },
      orderBy: { creado_en: 'desc' },
    });
  }

  async findByLote(loteId: number) {
    return this.prisma.archivo.findMany({
      where: { loteId },
      orderBy: { creado_en: 'desc' },
    });
  }

  async findByUrbanizacion(urbanizacionId: number) {
    return this.prisma.archivo.findMany({
      where: { urbanizacionId },
      orderBy: { creado_en: 'desc' },
    });
  }

  async update(id: number, dto: UpdateArchivoDto) {
    const archivo = await this.prisma.archivo.findUnique({ where: { id } });
    if (!archivo) throw new NotFoundException('Archivo no encontrado');

    return this.prisma.archivo.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    const archivo = await this.prisma.archivo.findUnique({ where: { id } });
    if (!archivo) throw new NotFoundException('Archivo no encontrado');

    if (archivo.urlArchivo) {
      const filePath = path.join(process.cwd(), archivo.urlArchivo);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {}
    }
    return this.prisma.archivo.delete({ where: { id } });
  }
}
