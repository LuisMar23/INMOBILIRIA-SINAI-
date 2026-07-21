// egresos.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';


export interface Archivo {
  id: number;
  urlArchivo: string;
  nombreArchivo: string;
  tipoArchivo: string;
  egresoId: number;
}

export interface Egreso {
  id: number;
  descripcion: string;
  monto: number;
  fecha: string;
  categoriaId: number | null;
  cajaId: number;
  urbanizacionId: number | null;
  registradoPor: number;
  metodoPago: string;
  createdAt: string;
  updatedAt: string;
  caja?: { id: number; nombre: string; estado: string; saldoActual: number };
  urbanizacion?: { id: number; nombre: string };
  usuario?: { id: number; nombre: string };
  archivos?: Archivo[];
}

export interface Caja {
  id: number;
  nombre: string;
  estado: string;
  saldoActual: number;
}

export interface EgresoResponse {
  resumen: {
    totalEgresos: number;
    montoTotal: number;
  };
  egresos: Egreso[];
}

@Injectable({ providedIn: 'root' })
export class EgresosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/egresos`;

  getAll(filtros?: any): Observable<EgresoResponse> {
    return this.http.get<EgresoResponse>(this.apiUrl, { params: filtros });
  }

  getOne(id: number): Observable<Egreso> {
    return this.http.get<Egreso>(`${this.apiUrl}/${id}`);
  }

  create(data: any, files?: File[]): Observable<Egreso> {
    const formData = new FormData();
    
    // Agregar campos
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    
    // Agregar archivos
    if (files && files.length) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }
    
    return this.http.post<Egreso>(this.apiUrl, formData);
  }

  update(id: number, data: any, files?: File[]): Observable<Egreso> {
    const formData = new FormData();
    
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    
    if (files && files.length) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }
    
    return this.http.put<Egreso>(`${this.apiUrl}/${id}`, formData);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  removeVoucher(egresoId: number, archivoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${egresoId}/vouchers/${archivoId}`);
  }

  subirArchivos(files: File[]): Observable<{ urls: string[] }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return this.http.post<{ urls: string[] }>(`${this.apiUrl}/upload`, formData);
  }

  getCajasAbiertas(): Observable<Caja[]> {
    return this.http.get<Caja[]>(`${environment.apiUrl}/cajas/abiertas`);
  }
}