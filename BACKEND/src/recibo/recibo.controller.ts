import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseInterceptors,
  ParseIntPipe,
  UploadedFiles,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateReciboDto } from './dto/create-recibo.dto';
import { UpdateReciboDto } from './dto/update-recibo.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TipoOperacion } from 'generated/prisma';
import type { Request } from 'express';
import { ReciboService } from './recibo.service';

@Controller('recibos')
export class ReciboController {
  constructor(private readonly reciboService: ReciboService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/recibos',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  async uploadRecibos(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateReciboDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }

    const usuarioRegistroId = req.user?.['id'];
    if (!usuarioRegistroId) {
      throw new BadRequestException(
        'Usuario no autenticado o ID no encontrado',
      );
    }

    if (files.length === 1) {
      const file = files[0];
      return this.reciboService.create(
        {
          ...dto,
          ventaId: dto.ventaId ? Number(dto.ventaId) : undefined,
          reservaId: dto.reservaId ? Number(dto.reservaId) : undefined,
          pagoPlanPagoId: dto.pagoPlanPagoId
            ? Number(dto.pagoPlanPagoId)
            : undefined,
          urlArchivo: `/uploads/recibos/${file.filename}`,
          tipoArchivo: file.mimetype,
          nombreArchivo: file.originalname,
          observaciones: dto.observaciones,
        },
        usuarioRegistroId,
      );
    } else {
      return this.reciboService.createMultiple(dto, files, usuarioRegistroId);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('plan-pago/upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/recibos/plan-pago',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  async uploadRecibosPlanPago(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: { pagoPlanPagoId: number; observaciones?: string },
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }

    const usuarioRegistroId = req.user?.['id'];
    if (!usuarioRegistroId) {
      throw new BadRequestException(
        'Usuario no autenticado o ID no encontrado',
      );
    }

    const createReciboDto: CreateReciboDto = {
      tipoOperacion: TipoOperacion.VENTA,
      pagoPlanPagoId: Number(dto.pagoPlanPagoId),
      urlArchivo: '',
      tipoArchivo: '',
      nombreArchivo: '',
      observaciones: dto.observaciones,
    };

    if (files.length === 1) {
      const file = files[0];
      return this.reciboService.create(
        {
          ...createReciboDto,
          urlArchivo: `/uploads/recibos/plan-pago/${file.filename}`,
          tipoArchivo: file.mimetype,
          nombreArchivo: file.originalname,
        },
        usuarioRegistroId,
      );
    } else {
      return this.reciboService.createMultiple(
        createReciboDto,
        files,
        usuarioRegistroId,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll() {
    return this.reciboService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('venta/:id')
  findByVenta(@Param('id', ParseIntPipe) id: number) {
    return this.reciboService.findByVenta(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('reserva/:id')
  findByReserva(@Param('id', ParseIntPipe) id: number) {
    return this.reciboService.findByReserva(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('plan-pago/:id')
  findByPlan(@Param('id', ParseIntPipe) id: number) {
    return this.reciboService.findByPagoPlan(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReciboDto) {
    return this.reciboService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reciboService.remove(id);
  }
}
