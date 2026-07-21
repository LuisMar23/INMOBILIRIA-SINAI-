import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { VentaDto } from '../../../core/interfaces/venta.interface';

@Injectable({ providedIn: 'root' })
export class CobrosService {
  private apiUrl = `${environment.apiUrl}/ventas/cobros`;

  constructor(private http: HttpClient) {}

  obtenerVentas(filtros: {
    cliente?: string;
    lote?: string;
    urbanizacion?: string;
    encargado?: string;
  }): Observable<VentaDto[]> {
    let params = new HttpParams();
    if (filtros.cliente) params = params.set('cliente', filtros.cliente);
    if (filtros.lote) params = params.set('lote', filtros.lote);
    if (filtros.urbanizacion) params = params.set('urbanizacion', filtros.urbanizacion);
    if (filtros.encargado) params = params.set('encargado', filtros.encargado);

    return this.http
      .get<{ success: boolean; data: { ventas: VentaDto[] } }>(this.apiUrl, { params })
      .pipe(map((res) => (res.success ? res.data.ventas : [])));
  }
}
