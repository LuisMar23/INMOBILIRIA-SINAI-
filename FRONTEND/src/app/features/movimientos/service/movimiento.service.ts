import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Movimiento } from '../../../core/interfaces/caja.interface';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MovimientoService {
  private apiUrl = `${environment.apiUrl}/movimientos`;

  movimientos = signal<Movimiento[]>([]);
  totales = signal<Record<string, number>>({});
  total = signal(0);
  page = signal(1);
  pageSize = signal(10);
  cargando = signal(false);

  constructor(private http: HttpClient) {}

  loadByCaja(cajaId: number, page: number = 1, pageSize: number = 10) {
    this.cargando.set(true);
    this.http
      .get<{
        data: Movimiento[];
        total: number;
        page: number;
        pageSize: number;
      }>(`${this.apiUrl}/caja/${cajaId}?page=${page}&pageSize=${pageSize}`)
      .subscribe({
        next: (res) => {
          this.movimientos.set(res.data);
          this.total.set(res.total);
          this.page.set(res.page);
          this.pageSize.set(res.pageSize);
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
        },
      });
  }
  loadByCajaFiltrado(
    cajaId: number,
    page: number,
    pageSize: number,
    filtros: {
      mes?: number;
      anio?: number;
      tipo?: string;
      metodoPago?: string;
      manzano?: string;
      numeroLote?: string;
    },
  ): Observable<any> {
    let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());

    if (filtros.mes) params = params.set('mes', filtros.mes.toString());
    if (filtros.anio) params = params.set('anio', filtros.anio.toString());
    if (filtros.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros.metodoPago) params = params.set('metodoPago', filtros.metodoPago);
    if (filtros.manzano) params = params.set('manzano', filtros.manzano);
    if (filtros.numeroLote) params = params.set('numeroLote', filtros.numeroLote);

    return this.http.get<any>(`${this.apiUrl}/caja/${cajaId}/filtrado`, { params });
  }
  crearMovimiento(payload: {
    cajaId: number;
    tipo: 'INGRESO' | 'EGRESO';
    monto: number;
    descripcion?: string;
    metodoPago?: string;
    referencia?: string;
  }) {
    return this.http.post<Movimiento>(this.apiUrl, payload);
  }

  loadTotales(cajaId: number) {
    this.http
      .get<Record<string, number>>(`${this.apiUrl}/caja/${cajaId}/totales`)
      .subscribe((res) => this.totales.set(res));
  }

  getResumenCaja(cajaId: number) {
    return this.http.get<any>(`${this.apiUrl}/caja/${cajaId}/resumen`);
  }
// movimiento.service.ts — agrega este método
loadTodosParaPDF(cajaId: number, filtros: any) {
  let params = new HttpParams()
    .set('page', '1')
    .set('limit', '9999'); // sin límite

  if (filtros.mes)        params = params.set('mes', filtros.mes);
  if (filtros.anio)       params = params.set('anio', filtros.anio);
  if (filtros.tipo)       params = params.set('tipo', filtros.tipo);
  if (filtros.metodoPago) params = params.set('metodoPago', filtros.metodoPago);
  if (filtros.manzano)    params = params.set('manzano', filtros.manzano);
  if (filtros.numeroLote) params = params.set('numeroLote', filtros.numeroLote);

  return this.http.get<any>(`${this.apiUrl}/caja/${cajaId}/movimientos`, { params });
}

}
