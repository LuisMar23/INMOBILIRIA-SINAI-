// services/egresos.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment.prod';
import {
  EgresosResponse,
  Egreso,
  ReporteCategoriasResponse,
  ReporteCajasResponse,
  CategoriaContable,
  CajaResumen,
  FiltrosEgresoDto,
  CreateEgresoDto,
  UpdateEgresoDto,
} from '../../../core/interfaces/egresos.interface';

@Injectable({ providedIn: 'root' })
export class EgresosService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/egresos`;

  // ── Signals de estado ──
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // ── Signals de datos ──
  egresos = signal<EgresosResponse | null>(null);
  egresoSeleccionado = signal<Egreso | null>(null);
  reporteCategorias = signal<ReporteCategoriasResponse | null>(null);
  reporteCajas = signal<ReporteCajasResponse | null>(null);
  categorias = signal<CategoriaContable[]>([]);
  cajas = signal<CajaResumen[]>([]);

  // ── CRUD ──

  getEgresos(filtros: FiltrosEgresoDto = {}) {
    this.loading.set(true);
    this.error.set(null);
    const params = this.buildParams(filtros);
    return this.http
      .get<EgresosResponse>(this.baseUrl, { params })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.egresos.set(data),
        error: (err) => this.error.set(err.error?.message ?? err.message),
      });
  }

  createEgreso(dto: CreateEgresoDto) {
    this.loading.set(true);
    this.error.set(null);
    return this.http.post<Egreso>(this.baseUrl, dto).pipe(finalize(() => this.loading.set(false)));
  }

  updateEgreso(id: number, dto: UpdateEgresoDto) {
    this.loading.set(true);
    this.error.set(null);
    return this.http
      .put<Egreso>(`${this.baseUrl}/${id}`, dto)
      .pipe(finalize(() => this.loading.set(false)));
  }

  deleteEgreso(id: number) {
    this.loading.set(true);
    this.error.set(null);
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/${id}`)
      .pipe(finalize(() => this.loading.set(false)));
  }

  // ── Reportes ──

  getReporteCategorias(filtros: FiltrosEgresoDto = {}) {
    this.loading.set(true);
    const params = this.buildParams(filtros);
    return this.http
      .get<ReporteCategoriasResponse>(`${this.baseUrl}/reporte/categorias`, { params })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.reporteCategorias.set(data),
        error: (err) => this.error.set(err.error?.message ?? err.message),
      });
  }

  getReporteCajas(filtros: FiltrosEgresoDto = {}) {
    this.loading.set(true);
    const params = this.buildParams(filtros);
    return this.http
      .get<ReporteCajasResponse>(`${this.baseUrl}/reporte/cajas`, { params })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.reporteCajas.set(data),
        error: (err) => this.error.set(err.error?.message ?? err.message),
      });
  }

  // ── Catálogos ──

  getCategorias() {
    return this.http
      .get<CategoriaContable[]>(`${environment.apiUrl}/categorias-contables`)
      .subscribe({ next: (data) => this.categorias.set(data) });
  }

  getCajas() {
    return this.http
      .get<CajaResumen[]>(`${environment.apiUrl}/caja`)
      .subscribe({ next: (data) => this.cajas.set(data) });
  }

  // ── Helper ──

  private buildParams(filtros: FiltrosEgresoDto): HttpParams {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, v.toString());
      }
    });
    return params;
  }
}
