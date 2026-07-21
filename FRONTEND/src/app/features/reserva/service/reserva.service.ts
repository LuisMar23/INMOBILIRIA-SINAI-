import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { CreateReservaDto, ReservaDto, UpdateReservaDto } from '../../../core/interfaces/reserva.interface';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ReservasResponse {
  reservas: ReservaDto[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ReservaService {
  apiUrl = `${environment.apiUrl}/reservas`;

  constructor(private http: HttpClient) {}

  getAll(clienteId?: number, estado?: string): Observable<ReservaDto[]> {
    let url = this.apiUrl;
    const params = [];
    if (clienteId) params.push(`clienteId=${clienteId}`);
    if (estado) params.push(`estado=${estado}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<ApiResponse<ReservaDto[]>>(url).pipe(
      map((response) => response.data)
    );
  }

  getLotesDisponibles(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/lotes/disponibles`).pipe(
      map((response) => response.data)
    );
  }

  getById(id: number): Observable<ReservaDto> {
    return this.http.get<ApiResponse<ReservaDto>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response.data)
    );
  }

  getByCliente(clienteId: number): Observable<ReservaDto[]> {
    return this.http.get<ApiResponse<ReservaDto[]>>(`${this.apiUrl}/cliente/${clienteId}`).pipe(
      map((response) => response.data)
    );
  }

  create(reserva: CreateReservaDto): Observable<any> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, reserva).pipe(
      map((response) => response)
    );
  }

  update(id: number, reserva: UpdateReservaDto): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, reserva).pipe(
      map((response) => response)
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response)
    );
  }

  subirRecibosReserva(reservaId: number, files: File[], usuarioRegistroId: number): Observable<any> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('reservaId', reservaId.toString());
    formData.append('usuarioRegistroId', usuarioRegistroId.toString());

    return this.http.post<any>(`${environment.apiUrl}/recibos/reserva/upload`, formData).pipe(
      map((response) => response)
    );
  }

  obtenerRecibosPorReserva(reservaId: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/recibos/reserva/${reservaId}`).pipe(
      map((response) => response)
    );
  }

  eliminarReciboReserva(reciboId: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/recibos/${reciboId}`).pipe(
      map((response) => response)
    );
  }
}