import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class PermisosStateService {
  private permisos = signal<Record<string, boolean>>({});

  cargar(permisosMap: Record<string, boolean>) {
    this.permisos.set(permisosMap);
    localStorage.setItem('permisos', JSON.stringify(permisosMap));
  }

  recuperar() {
    const stored = localStorage.getItem('permisos') ?? sessionStorage.getItem('permisos');
    if (stored) this.permisos.set(JSON.parse(stored));
  }

  tieneAcceso(clave: string): boolean {
    return this.permisos()[clave] ?? false;
  }

  limpiar() {
    this.permisos.set({});
    localStorage.removeItem('permisos');
    sessionStorage.removeItem('permisos');
  }
}