export class ClienteReporteDto {
  id: number;
  uuid: string;
  fullName: string;
  ci: string;
  email: string | null;
  telefono: string;
  direccion: string | null;
  observaciones: string | null;
  isActive: boolean;
  createdAt: Date;
  totalVentas: number;
  totalReservas: number;
  totalVisitas: number;
  montoTotal: number;
}

export class ReporteClientesResponseDto {
  data: ClienteReporteDto[];
  totalClientes: number;
  generadoEn: Date;
}

export class ReporteClientesPotencialesResponseDto {
  data: ClienteReporteDto[];
  totalMostrados: number;
  totalGeneralBs: number;
  nota: string;
  generadoEn: Date;
}