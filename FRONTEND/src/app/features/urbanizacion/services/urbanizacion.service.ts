// src/app/modules/urbanizacion/services/urbanizacion.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UrbanizacionDto } from '../../../core/interfaces/urbanizacion.interface';
import { environment } from '../../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: any;
}

@Injectable({ providedIn: 'root' })
export class UrbanizacionService {
  private apiUrl = `${environment.apiUrl}/urbanizaciones`;

  constructor(private http: HttpClient) {}

  getAll(
    page: number = 1,
    limit: number = 10
  ): Observable<{ data: UrbanizacionDto[]; pagination: any }> {
    return this.http
      .get<ApiResponse<UrbanizacionDto[]>>(`${this.apiUrl}?page=${page}&limit=${limit}`)
      .pipe(
        map((response) => {
          if (response.success) {
            return {
              data: response.data,
              pagination: response.pagination,
            };
          }
          throw new Error(response.message || 'Error al cargar urbanizaciones');
        })
      );
  }

  getById(id: number): Observable<UrbanizacionDto> {
    return this.http.get<ApiResponse<UrbanizacionDto>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Error al obtener la urbanización');
      })
    );
  }

  create(dto: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, dto).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al crear la urbanización');
      })
    );
  }

  update(id: number, dto: any): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, dto).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al actualizar la urbanización');
      })
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al eliminar la urbanización');
      })
    );
  }

  // getById(id:number):Observable<any>{
  //   return this.http.get<any>(`${this.apiUrl}/${id}`)
  // }
}
