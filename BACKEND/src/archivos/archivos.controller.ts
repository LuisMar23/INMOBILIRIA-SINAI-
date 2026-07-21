import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
  UploadedFiles,
} from '@nestjs/common';
import { ArchivosService } from './archivos.service';
import { CreateArchivoDto } from './dto/create-archivo.dto';
import { UpdateArchivoDto } from './dto/update-archivo.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { extname, join } from 'path';
import { diskStorage } from 'multer';

@Controller('archivos')
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) {}

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/tmp',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  async uploadArchivos(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateArchivoDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }

    console.log('📦 Body recibido (raw):', dto);
    const normalizedDto = {
      ...dto,
      ventaId: dto.ventaId ? Number(dto.ventaId) : undefined,
      reservaId: dto.reservaId ? Number(dto.reservaId) : undefined,
      loteId: dto.loteId ? Number(dto.loteId) : undefined,
      urbanizacionId: dto.urbanizacionId
        ? Number(dto.urbanizacionId)
        : undefined,
      propiedadId: dto.propiedadId ? Number(dto.propiedadId) : undefined,
    };

    let folder = 'otros';
    if (normalizedDto.ventaId) folder = 'ventas';
    else if (normalizedDto.reservaId) folder = 'reservas';
    else if (normalizedDto.loteId) folder = 'lotes';
    else if (normalizedDto.urbanizacionId) folder = 'urbanizaciones';
    else if (normalizedDto.propiedadId) folder = 'propiedades';

    const targetPath = `./uploads/${folder}`;
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    const movedFiles = files.map((file) => {
      const oldPath = file.path;
      const newPath = `${targetPath}/${file.filename}`;
      fs.renameSync(oldPath, newPath);
      console.log(`✅ Movido: ${oldPath} → ${newPath}`);
      return { ...file, path: newPath };
    });

    if (movedFiles.length === 1) {
      const file = movedFiles[0];
      return this.archivosService.create({
        ...normalizedDto,
        urlArchivo: `/uploads/${folder}/${file.filename}`,
        tipoArchivo: file.mimetype,
        nombreArchivo: file.originalname,
      });
    } else {
      return this.archivosService.createMultiple(
        normalizedDto,
        movedFiles,
        folder,
      );
    }
  }

  @Post('update')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const { ventaId, reservaId, loteId, urbanizacionId, propiedadId } =
            req.body;
          let folder = 'otros';

          if (ventaId) folder = 'ventas';
          else if (reservaId) folder = 'reservas';
          else if (loteId) folder = 'lotes';
          else if (urbanizacionId) folder = 'urbanizaciones';
          else if (propiedadId) folder = 'propiedades';

          const uploadPath = `./uploads/${folder}`;
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  async updateArchivos(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateArchivoDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }

    let folder = 'otros';
    const where: any = {};
    if (dto.ventaId)
      ((folder = 'ventas'), (where.ventaId = Number(dto.ventaId)));
    else if (dto.reservaId)
      ((folder = 'reservas'), (where.reservaId = Number(dto.reservaId)));
    else if (dto.loteId)
      ((folder = 'lotes'), (where.loteId = Number(dto.loteId)));
    else if (dto.urbanizacionId)
      ((folder = 'urbanizaciones'),
        (where.urbanizacionId = Number(dto.urbanizacionId)));
    else if (dto.propiedadId)
      ((folder = 'propiedades'), (where.propiedadId = Number(dto.propiedadId)));
    else {
      throw new BadRequestException(
        'Debe especificar ventaId, reservaId, loteId, urbanizacionId o propiedadId',
      );
    }
    const prisma = this.archivosService.prisma;

    const existentes = await prisma.archivo.findMany({ where });

    for (const archivo of existentes) {
      const filePath = join(process.cwd(), archivo.urlArchivo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.archivo.deleteMany({ where });

    if (files.length === 1) {
      const file = files[0];
      return this.archivosService.create({
        ...dto,
        urlArchivo: `/uploads/${folder}/${file.filename}`,
        tipoArchivo: file.mimetype,
        nombreArchivo: file.originalname,
      });
    } else {
      const nuevos = await Promise.all(
        files.map((file) =>
          this.archivosService.create({
            ...dto,
            urlArchivo: `/uploads/${folder}/${file.filename}`,
            tipoArchivo: file.mimetype,
            nombreArchivo: file.originalname,
          }),
        ),
      );
      return nuevos;
    }
  }

  @Get()
  findAll() {
    return this.archivosService.findAll();
  }

  @Get('venta/:id')
  findByVenta(@Param('id', ParseIntPipe) id: number) {
    return this.archivosService.findByVenta(id);
  }

  @Get('reserva/:id')
  findByReserva(@Param('id', ParseIntPipe) id: number) {
    return this.archivosService.findByReserva(id);
  }

  @Get('propiedad/:id')
  findByPropiedad(@Param('id', ParseIntPipe) id: number) {
    return this.archivosService.findByPropiedad(id);
  }

  @Get('lote/:id')
  findByLote(@Param('id', ParseIntPipe) id: number) {
    return this.archivosService.findByLote(id);
  }

  @Get('urbanizacion/:id')
  findByUrbanizacion(@Param('id', ParseIntPipe) id: number) {
    return this.archivosService.findByUrbanizacion(id);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    console.log(id);
    return this.archivosService.remove(id);
  }
}
