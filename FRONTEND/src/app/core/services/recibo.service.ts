import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Recibo {
  id: number;
  uuid: string;
  tipoOperacion: 'VENTA' | 'RESERVA';
  ventaId?: number;
  reservaId?: number;
  pagoPlanPagoId?: number;
  urlArchivo: string;
  tipoArchivo?: string;
  nombreArchivo?: string;
  creado_en: string;
  observaciones?: string;
  usuarioRegistroId: number;
  usuarioRegistro?: any;
  venta?: any;
  reserva?: any;
  pagoPlanPago?: any;
}

@Injectable({
  providedIn: 'root',
})
export class ReciboService {
  private baseUrl = environment.apiUrl + '/recibos';

  constructor(private http: HttpClient) {}

  obtenerTodos(): Observable<Recibo[]> {
    return this.http.get<Recibo[]>(this.baseUrl);
  }

  obtenerPorVenta(ventaId: number): Observable<Recibo[]> {
    return this.http.get<Recibo[]>(`${this.baseUrl}/venta/${ventaId}`);
  }

  obtenerPorReserva(reservaId: number): Observable<Recibo[]> {
    return this.http.get<Recibo[]>(`${this.baseUrl}/reserva/${reservaId}`);
  }

  obtenerPorPlanPago(pagoPlanPagoId: number): Observable<Recibo[]> {
    return this.http.get<Recibo[]>(`${this.baseUrl}/plan-pago/${pagoPlanPagoId}`);
  }

  obtenerPorId(id: number): Observable<Recibo> {
    return this.http.get<Recibo>(`${this.baseUrl}/${id}`);
  }

  subirReciboGeneral(
    file: File,
    dto: {
      tipoOperacion: 'VENTA' | 'RESERVA';
      ventaId?: number;
      reservaId?: number;
      pagoPlanPagoId?: number;
      observaciones?: string;
    }
  ): Observable<Recibo> {
    const formData = new FormData();
    formData.append('files', file);

    Object.entries(dto).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    return this.http.post<Recibo>(`${this.baseUrl}/upload`, formData);
  }

  subirRecibosGenerales(
    files: File[],
    dto: {
      tipoOperacion: 'VENTA' | 'RESERVA';
      ventaId?: number;
      reservaId?: number;
      pagoPlanPagoId?: number;
      observaciones?: string;
    }
  ): Observable<Recibo[]> {
    const formData = new FormData();

    files.forEach((file) => formData.append('files', file));

    Object.entries(dto).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    return this.http.post<Recibo[]>(`${this.baseUrl}/upload`, formData);
  }

  subirReciboPlanPago(
    file: File,
    pagoPlanPagoId: number,
    observaciones?: string
  ): Observable<Recibo> {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('pagoPlanPagoId', pagoPlanPagoId.toString());
    if (observaciones) {
      formData.append('observaciones', observaciones);
    }

    return this.http.post<Recibo>(`${this.baseUrl}/plan-pago/upload`, formData);
  }

  subirRecibosPlanPago(
    files: File[],
    pagoPlanPagoId: number,
    observaciones?: string
  ): Observable<Recibo[]> {
    const formData = new FormData();

    files.forEach((file) => formData.append('files', file));

    formData.append('pagoPlanPagoId', pagoPlanPagoId.toString());
    if (observaciones) {
      formData.append('observaciones', observaciones);
    }

    return this.http.post<Recibo[]>(`${this.baseUrl}/plan-pago/upload`, formData);
  }

  actualizar(id: number, dto: Partial<Recibo>): Observable<Recibo> {
    return this.http.patch<Recibo>(`${this.baseUrl}/${id}`, dto);
  }

  eliminarRecibo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  obtenerUrlCompleta(recibo: Recibo): string {
    return `${environment.apiUrl}${recibo.urlArchivo}`;
  }

  descargarRecibo(recibo: Recibo): void {
    const urlCompleta = this.obtenerUrlCompleta(recibo);
    const link = document.createElement('a');
    link.href = urlCompleta;
    link.download = recibo.nombreArchivo || 'recibo.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  verRecibo(recibo: Recibo): void {
    const urlCompleta = this.obtenerUrlCompleta(recibo);
    window.open(urlCompleta, '_blank');
  }
}
