import { Injectable, signal } from '@angular/core';

export interface UrbanizacionActiva {
  id: number;
  uuid: string;
  nombre: string;
  ciudad: string;
}

@Injectable({ providedIn: 'root' })
export class UrbanizacionContextService {
  private _urbanizacion = signal<UrbanizacionActiva | null>(null);

  readonly urbanizacion = this._urbanizacion.asReadonly(); // ← aquí

  get urbanizacionId(): number | null {
    return this._urbanizacion()?.id ?? null;
  }

  set(urb: UrbanizacionActiva) {
    this._urbanizacion.set(urb);
    localStorage.setItem('urbanizacion_activa', JSON.stringify(urb));
  }

  recuperar() {
    const stored = localStorage.getItem('urbanizacion_activa');
    if (stored) this._urbanizacion.set(JSON.parse(stored));
  }

  limpiar() {
    this._urbanizacion.set(null);
    localStorage.removeItem('urbanizacion_activa');
  }
}