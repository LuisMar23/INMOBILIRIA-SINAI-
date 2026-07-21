// create-reporteslote.dto.ts

export class ManzanoDto {
  id: number;
  uuid: string;
  nombre: string;
}

export class LoteReporteDto {
  id: number;
  uuid: string;
  numeroLote: string;
  manzano: ManzanoDto | null; // ahora es objeto, no string
  superficieM2: number;
  precioBase: number;
  ubicacion: string | null;
  ciudad: string;
  estado: string;
  esIndependiente: boolean;
  urbanizacion: {
    id: number;
    nombre: string;
    ubicacion: string;
  } | null;
}

export class ReporteLotesResponseDto {
  data: LoteReporteDto[];
  totalLotes: number;
  generadoEn: Date;
}

export class LoteDetalleDto extends LoteReporteDto {
  totalVentas: number;
  totalReservas: number;
  totalCotizaciones: number;
  encargado: string | null;
}

export class ReporteLotesDetalleResponseDto {
  data: LoteDetalleDto[];
  totalLotes: number;
  totalSuperficieM2: number;
  totalPrecioBase: number;
  generadoEn: Date;
}