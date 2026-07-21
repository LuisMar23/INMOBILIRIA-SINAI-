import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Caja } from '../../../core/interfaces/caja.interface';

@Injectable({
  providedIn: 'root',
})
export class CajaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/caja`;

  cajas = signal<Caja[]>([]);
  cargando = signal(false);

  cargarCajas() {
    this.cargando.set(true);
    this.http.get<Caja[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.cajas.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      },
    });
  }

  crearCaja(data: { nombre: string; montoInicial: number; usuarioAperturaId: number }) {
    return this.http.post<Caja>(this.apiUrl, data);
  }

  abrirCaja(id: number, montoInicial: number) {
    return this.http.post<Caja>(`${this.apiUrl}/${id}/abrir`, { montoInicial });
  }

  cerrarCaja(id: number) {
    return this.http.post<Caja>(`${this.apiUrl}/${id}/cerrar`, {});
  }

  obtenerCaja(id: number) {
    return this.http.get<Caja>(`${this.apiUrl}/${id}`);
  }
}
