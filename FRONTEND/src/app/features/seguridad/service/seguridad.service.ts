import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SeguridadService {
  private apiUrl = `${environment.apiUrl}/seguridad`;

  constructor(private http: HttpClient) {}

  getModulos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/modulos`);
  }

  getPermisosPorRole(role: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/permisos/${role}`);
  }

  updatePermisosRole(role: string, permisos: any[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/permisos/${role}`, { permisos });
  }

  getUrbanizacionesUsuario(usuarioId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/usuarios/${usuarioId}/urbanizaciones`);
  }

  asignarUrbanizaciones(usuarioId: number, urbanizacionIds: number[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/usuarios/${usuarioId}/urbanizaciones`, { urbanizacionIds });
  }

  removerUrbanizacion(usuarioId: number, urbanizacionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/usuarios/${usuarioId}/urbanizaciones/${urbanizacionId}`);
  }
}