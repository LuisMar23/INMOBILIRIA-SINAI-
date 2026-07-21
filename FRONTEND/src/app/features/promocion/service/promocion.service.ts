import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PromocionDto } from '../../../core/interfaces/promocion.interface';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: any;
}

@Injectable({
  providedIn: 'root',
})
export class PromocionService {
  apiUrl = `${environment.apiUrl}/promociones`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PromocionDto[]> {
    return this.http
      .get<ApiResponse<PromocionDto[]>>(this.apiUrl)
      .pipe(map((response) => response.data || []));
  }

  getById(id: number): Observable<PromocionDto> {
    return this.http
      .get<ApiResponse<PromocionDto>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  create(promocion: any): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(this.apiUrl, promocion)
      .pipe(map((response) => response));
  }

  update(id: number, promocion: any): Observable<any> {
    return this.http
      .patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, promocion)
      .pipe(map((response) => response));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response));
  }

  asignarLotes(promocionId: number, lotesIds: number[]): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/${promocionId}/asignar-lotes`, { lotesIds })
      .pipe(map((response) => response));
  }

  asignarUrbanizacion(promocionId: number, urbanizacionId: number): Observable<any> {
    return this.http
      .put<ApiResponse<any>>(
        `${this.apiUrl}/${promocionId}/asignar-urbanizacion/${urbanizacionId}`,
        {}
      )
      .pipe(map((response) => response));
  }

  asignarTodosLotes(promocionId: number): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/${promocionId}/asignar-todos-lotes`, {})
      .pipe(map((response) => response));
  }

  removerLotes(promocionId: number, lotesIds: number[]): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/${promocionId}/remover-lotes`, { lotesIds })
      .pipe(map((response) => response));
  }

  getLotesDisponibles(): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/lotes-disponibles`)
      .pipe(map((response) => response.data || []));
  }

  getPromocionesActivas(): Observable<PromocionDto[]> {
    return this.http
      .get<ApiResponse<PromocionDto[]>>(`${this.apiUrl}/activas`)
      .pipe(map((response) => response.data || []));
  }
}
