import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CierreCaja } from '../../../core/interfaces/caja.interface';

@Injectable({
  providedIn: 'root',
})
export class CierreService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/cierre`;

  cierres = signal<CierreCaja[]>([]);
  cargando = signal(false);

  crearCierre(payload: {
    cajaId: number;
    saldoReal: number;
    observaciones?: string;
    tipo?: 'TOTAL' | 'PARCIAL';
  }) {
    return this.http.post<CierreCaja>(this.apiUrl, payload);
  }

  listarPorCaja(cajaId: number) {
    this.cargando.set(true);
    this.http.get<CierreCaja[]>(`${this.apiUrl}/caja/${cajaId}`).subscribe({
      next: (data) => {
        this.cierres.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  obtenerUltimoCierre(cajaId: number) {
    return this.http.get<CierreCaja>(`${this.apiUrl}/caja/${cajaId}/ultimo`);
  }
}
