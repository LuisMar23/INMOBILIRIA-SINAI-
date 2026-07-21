import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment.prod';
import {
  PropiedadDto,
  CreatePropiedadDto,
  UpdatePropiedadDto,
} from '../../../core/interfaces/propiedad.interface';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class PropiedadService {
  apiUrl = `${environment.apiUrl}/propiedades`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PropiedadDto[]> {
    return this.http.get<ApiResponse<PropiedadDto[]>>(this.apiUrl).pipe(
      map((response) => {
        if (response.success && response.data) {
          return Array.isArray(response.data) ? response.data : [response.data];
        }
        return [];
      })
    );
  }

  getById(id: number): Observable<PropiedadDto> {
    return this.http.get<ApiResponse<PropiedadDto>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Error al obtener la propiedad');
      })
    );
  }

  getUsuariosEncargados(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/usuarios-encargados`).pipe(
      map((response) => {
        if (response.success && response.data) {
          return Array.isArray(response.data) ? response.data : [response.data];
        }
        return [];
      })
    );
  }

  create(propiedad: CreatePropiedadDto): Observable<any> {

    console.log(propiedad)
    const propiedadData = {
      ...propiedad,
      tamano: Number(propiedad.tamano),
      precio: Number(propiedad.precio),
      habitaciones: propiedad.habitaciones ? Number(propiedad.habitaciones) : undefined,
      banos: propiedad.banos ? Number(propiedad.banos) : undefined,
      encargadoId: propiedad.encargadoId ? Number(propiedad.encargadoId) : undefined,
    };

    return this.http.post<ApiResponse<any>>(this.apiUrl, propiedadData).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al crear la propiedad');
      })
    );
  }

  update(id: number, propiedad: UpdatePropiedadDto): Observable<any> {
    const propiedadData: any = {};

    if (propiedad.tipo !== undefined) propiedadData.tipo = propiedad.tipo;
    if (propiedad.nombre !== undefined) propiedadData.nombre = propiedad.nombre;
    if (propiedad.tamano !== undefined) propiedadData.tamano = Number(propiedad.tamano);
    if (propiedad.precio !== undefined) propiedadData.precio = Number(propiedad.precio);
    if (propiedad.ubicacion !== undefined) propiedadData.ubicacion = propiedad.ubicacion;
    if (propiedad.ciudad !== undefined) propiedadData.ciudad = propiedad.ciudad;
    if (propiedad.descripcion !== undefined) propiedadData.descripcion = propiedad.descripcion;
    if (propiedad.habitaciones !== undefined)
      propiedadData.habitaciones = propiedad.habitaciones
        ? Number(propiedad.habitaciones)
        : undefined;
    if (propiedad.banos !== undefined)
      propiedadData.banos = propiedad.banos ? Number(propiedad.banos) : undefined;
    if (propiedad.estado !== undefined) propiedadData.estado = propiedad.estado;
    if (propiedad.estadoPropiedad !== undefined)
      propiedadData.estadoPropiedad = propiedad.estadoPropiedad;
    if (propiedad.encargadoId !== undefined) propiedadData.encargadoId = propiedad.encargadoId ? Number(propiedad.encargadoId) : null;

    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, propiedadData).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al actualizar la propiedad');
      })
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al eliminar la propiedad');
      })
    );
  }

  asignarEncargado(id: number, encargadoId: number): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/asignar-encargado`, { encargadoId }).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al asignar encargado');
      })
    );
  }

  quitarEncargado(id: number): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/quitar-encargado`, {}).pipe(
      map((response) => {
        if (response.success) {
          return response;
        }
        throw new Error(response.message || 'Error al quitar encargado');
      })
    );
  }
}