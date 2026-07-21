// egresos.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { EgresosService } from './egresos.service';
import { CreateEgresoDto, FiltrosEgresoDto } from './dto/create-egreso.dto';
import { UpdateEgresoDto } from './dto/update-egreso.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@UseGuards(JwtAuthGuard)
@Controller('egresos')
export class EgresosController {
  constructor(private readonly egresosService: EgresosService) {}

  // POST /egresos (con archivos)
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/egresos',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateEgresoDto,
    @Req() req: any,
  ) {
    return this.egresosService.create(dto, req.user.id, files);
  }

  // GET /egresos
  @Get()
  findAll(@Query() filtros: FiltrosEgresoDto) {
    return this.egresosService.findAll(filtros);
  }

  // GET /egresos/reporte/cajas
  @Get('reporte/cajas')
  reportePorCaja(@Query() filtros: FiltrosEgresoDto) {
    return this.egresosService.reportePorCaja(filtros);
  }

  // GET /egresos/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.egresosService.findOne(id);
  }

  // PUT /egresos/:id (con archivos)
  @Put(':id')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/egresos',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UpdateEgresoDto,
    @Req() req: any,
  ) {
    return this.egresosService.update(id, dto, req.user.id, files);
  }

  // DELETE /egresos/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.egresosService.remove(id);
  }

  // DELETE /egresos/:id/voucher/:archivoId
  @Delete(':id/voucher/:archivoId')
  removeVoucher(
    @Param('id', ParseIntPipe) id: number,
    @Param('archivoId', ParseIntPipe) archivoId: number,
  ) {
    return this.egresosService.removeVoucher(id, archivoId);
  }
}