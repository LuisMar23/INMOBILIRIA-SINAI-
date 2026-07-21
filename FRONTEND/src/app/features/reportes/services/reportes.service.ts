// services/reportes.service.ts
import { Injectable, inject, signal, Signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import {
  ReporteVentasResponse,
  DetalleVenta,
  VentasPorVendedorResponse,
  CuotasPorCobrarResponse,
  VentasCompletadasResponse,
  VentasPorClienteResponse,
  FiltrosClienteDto,
  FiltrosReporteDto,
} from '../../../core/interfaces/reportes.interface';
import { environment } from '../../../../environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/reportes/ventas`;

  // Estados globales con signals
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Datos de reportes con tipos específicos
  reporteVentas = signal<ReporteVentasResponse | null>(null);
  detalleVentas = signal<DetalleVenta[] | null>(null);
  ventasPorVendedor = signal<VentasPorVendedorResponse | null>(null);
  cuotasPorCobrar = signal<CuotasPorCobrarResponse | null>(null);
  ventasCompletadas = signal<VentasCompletadasResponse | null>(null);
  ventasPorCliente = signal<VentasPorClienteResponse | null>(null);

  getReporteVentas(filtros: FiltrosReporteDto) {
    this.loading.set(true);
    this.error.set(null);

    const params = this.buildParams(filtros);

    return this.http
      .get<ReporteVentasResponse>(`${this.baseUrl}/reporte`, { params })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.reporteVentas.set(data),
        error: (err) => this.error.set(err.message),
      });
  }

  getDetalleVentas(filtros: FiltrosReporteDto) {
    this.loading.set(true);
    const params = this.buildParams(filtros);

    return this.http
      .get<DetalleVenta[]>(`${this.baseUrl}/detalle`, { params })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.detalleVentas.set(data),
        error: (err) => this.error.set(err.message),
      });
  }

  getVentasPorVendedor(filtros: FiltrosReporteDto) {
    this.loading.set(true);
    const params = this.buildParams(filtros);

    return this.http
      .get<VentasPorVendedorResponse>(`${this.baseUrl}/por-vendedor`, { params })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.ventasPorVendedor.set(data),
        error: (err) => this.error.set(err.message),
      });
  }

  getCuotasPorCobrar(filtros: FiltrosReporteDto) {
    this.loading.set(true);
    const params = this.buildParams(filtros);

    return this.http
      .get<CuotasPorCobrarResponse>(`${this.baseUrl}/cuotas-por-cobrar`, { params })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.cuotasPorCobrar.set(data),
        error: (err) => this.error.set(err.message),
      });
  }

  getVentasCompletadas(filtros: FiltrosReporteDto) {
    this.loading.set(true);
    const params = this.buildParams(filtros);

    return this.http
      .get<VentasCompletadasResponse>(`${this.baseUrl}/completadas`, { params })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.ventasCompletadas.set(data),
        error: (err) => this.error.set(err.message),
      });
  }

  getVentasPorCliente(filtros: FiltrosClienteDto) {
    this.loading.set(true);
    const params = new HttpParams()
      .set('clienteId', filtros.clienteId.toString())
      .set('fechaInicio', filtros.fechaInicio || '')
      .set('fechaFin', filtros.fechaFin || '');

    return this.http
      .get<VentasPorClienteResponse>(`${this.baseUrl}/por-cliente`, { params })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.ventasPorCliente.set(data),
        error: (err) => this.error.set(err.message),
      });
  }

  private buildParams(filtros: FiltrosReporteDto): HttpParams {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return params;
  }
// En ReportesService — agrega:
manzanas = signal<string[]>([]);

getManzanas() {
  return this.http
    .get<ReporteVentasResponse>(`${this.baseUrl}/reporte`, {})
    .subscribe({
      next: (data) => {
        const set = new Set(
          (data.ventas ?? [])
            .map(v => v.lote?.manzano)
            .filter((m): m is string => !!m)
        );
        this.manzanas.set(Array.from(set).sort());
      }
    });
}

}
