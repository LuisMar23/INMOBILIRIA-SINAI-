import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faShieldHalved,
  faKey,
  faBuilding,
  faCubes,
  faSave,
  faSpinner,
  faChevronDown,
  faChevronUp,
  faTimes,
  faUsers,
  faToggleOn,
  faToggleOff,
} from '@fortawesome/free-solid-svg-icons';
import { NotificationService } from '../../../core/services/notification.service';
import { UrbanizacionService } from '../../urbanizacion/services/urbanizacion.service';
import { UserService } from '../../users/services/users.service';
import { SeguridadService } from '../service/seguridad.service';

@Component({
  selector: 'app-seguridad',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './seguridad-component.html',
})
export class SeguridadComponent implements OnInit {
  faShieldHalved = faShieldHalved;
  faKey = faKey;
  faBuilding = faBuilding;
  faCubes = faCubes;
  faSave = faSave;
  faSpinner = faSpinner;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faTimes = faTimes;
  faUsers = faUsers;
  faToggleOn = faToggleOn;
  faToggleOff = faToggleOff;

  private seguridadService = inject(SeguridadService);
  private urbanizacionService = inject(UrbanizacionService);
  private userService = inject(UserService);
  private notification = inject(NotificationService);

  tabActivo = signal<'permisos' | 'Asignar Proyectos' | 'modulos'>('permisos');

  // Permisos
  roles = ['ADMINISTRADOR', 'ASESOR', 'SECRETARIA'];
  roleSeleccionado = signal<string>('ASESOR');
  modulos = signal<any[]>([]);
  // moduloId → tieneAcceso
  permisosActuales = signal<Record<number, boolean>>({});
  guardandoPermisos = signal(false);
  cargandoPermisos = signal(false);

  // Urbanizaciones
  usuarios = signal<any[]>([]);
  usuarioSeleccionado = signal<any>(null);
  todasUrbanizaciones = signal<any[]>([]);
  urbAsignadas = signal<any[]>([]);
  guardandoUrb = signal(false);
  cargandoUrb = signal(false);
  urbParaAgregar = signal<number | null>(null);

  // Módulos expandidos
  modulosExpanded = signal<Set<number>>(new Set());
  ngOnInit(): void {
    this.cargarPermisosPorRole(this.roleSeleccionado()); // esto ya trae módulos + permisos
    this.cargarUsuarios();
    this.cargarTodasUrbanizaciones();
  }

  cambiarTab(tab: 'permisos' | 'Asignar Proyectos' | 'modulos'): void {
    this.tabActivo.set(tab);
    // Carga módulos solo cuando entra a esa tab
    if (tab === 'modulos' && this.modulos().length === 0) {
      this.cargarModulos();
    }
  }

  // ── Módulos ──────────────────────────────────────────────────

  cargarModulos(): void {
    // Solo para la tab "Módulos" — vista informativa
    this.seguridadService.getModulos().subscribe({
      next: (res) => this.modulos.set(res.data?.modulos ?? []),
      error: () => this.notification.showError('Error al cargar módulos'),
    });
  }

  toggleModulo(id: number): void {
    const set = new Set(this.modulosExpanded());
    set.has(id) ? set.delete(id) : set.add(id);
    this.modulosExpanded.set(set);
  }

  isExpanded(id: number): boolean {
    return this.modulosExpanded().has(id);
  }

  // ── Permisos ─────────────────────────────────────────────────

  seleccionarRole(role: string): void {
    this.roleSeleccionado.set(role);
    this.cargarPermisosPorRole(role);
  }

  cargarPermisosPorRole(role: string): void {
    this.cargandoPermisos.set(true);
    this.seguridadService.getPermisosPorRole(role).subscribe({
      next: (res) => {
        const modulosConPermisos = res.data?.modulos ?? [];

        // Usás los módulos que ya vienen del endpoint de permisos
        this.modulos.set(modulosConPermisos);

        const map: Record<number, boolean> = {};
        modulosConPermisos.forEach((m: any) => {
          map[m.id] = m.tieneAcceso;
          m.hijos?.forEach((h: any) => (map[h.id] = h.tieneAcceso));
        });

        this.permisosActuales.set(map);
        this.cargandoPermisos.set(false);
      },
      error: () => {
        this.notification.showError('Error al cargar permisos');
        this.cargandoPermisos.set(false);
      },
    });
  }

  getPermiso(moduloId: number): boolean {
    return this.permisosActuales()[moduloId] ?? false;
  }

  togglePermiso(moduloId: number): void {
    const map = { ...this.permisosActuales() };
    const nuevoValor = !map[moduloId];
    map[moduloId] = nuevoValor;

    // Si desactivás un padre, desactivá todos sus hijos
    const padre = this.modulos().find((m) => m.id === moduloId);
    if (padre && !nuevoValor) {
      padre.hijos?.forEach((h: any) => (map[h.id] = false));
    }

    // Si activás un hijo, activá el padre
    if (nuevoValor) {
      const esPadre = this.modulos().some((m) => m.id === moduloId);
      if (!esPadre) {
        const padre = this.modulos().find((m) => m.hijos?.some((h: any) => h.id === moduloId));
        if (padre) map[padre.id] = true;
      }
    }

    this.permisosActuales.set(map);
  }

  guardarPermisos(): void {
    this.guardandoPermisos.set(true);
    const permisos = Object.entries(this.permisosActuales()).map(([moduloId, tieneAcceso]) => ({
      moduloId: Number(moduloId),
      tieneAcceso,
    }));

    this.seguridadService.updatePermisosRole(this.roleSeleccionado(), permisos).subscribe({
      next: () => {
        this.guardandoPermisos.set(false);
        this.notification.showSuccess(`Permisos de ${this.roleSeleccionado()} guardados`);
      },
      error: () => {
        this.guardandoPermisos.set(false);
        this.notification.showError('Error al guardar permisos');
      },
    });
  }

  // ── Urbanizaciones ───────────────────────────────────────────

  cargarUsuarios(): void {
    this.userService.getAll().subscribe({
      next: (res) => this.usuarios.set(res.data?.users ?? []),
      error: () => {},
    });
  }

  cargarTodasUrbanizaciones(): void {
    this.urbanizacionService.getAll().subscribe({
      next: (res) => this.todasUrbanizaciones.set(res.data),
      error: () => {},
    });
  }

  seleccionarUsuario(usuario: any): void {
    this.usuarioSeleccionado.set(usuario);
    this.cargandoUrb.set(true);
    this.seguridadService.getUrbanizacionesUsuario(usuario.id).subscribe({
      next: (res) => {
        this.urbAsignadas.set(res.data?.urbanizaciones ?? []);
        this.cargandoUrb.set(false);
      },
      error: () => this.cargandoUrb.set(false),
    });
  }

  get urbDisponibles(): any[] {
    const ids = this.urbAsignadas().map((u) => u.id);
    return this.todasUrbanizaciones().filter((u) => !ids.includes(u.id));
  }

  agregarUrbanizacion(): void {
    const id = this.urbParaAgregar();
    const usuario = this.usuarioSeleccionado();
    if (!id || !usuario) return;

    const urb = this.todasUrbanizaciones().find((u) => u.id === id);
    if (!urb) return;

    // Actualiza local primero (optimistic)
    const nuevasUrbs = [...this.urbAsignadas(), urb];
    this.urbAsignadas.set(nuevasUrbs);
    this.urbParaAgregar.set(null);

    // Persiste en backend
    this.seguridadService
      .asignarUrbanizaciones(
        usuario.id,
        nuevasUrbs.map((u) => u.id),
      )
      .subscribe({
        next: () => this.notification.showSuccess('Urbanización asignada'),
        error: () => {
          // Revertir si falla
          this.urbAsignadas.set(this.urbAsignadas().filter((u) => u.id !== id));
          this.notification.showError('Error al asignar urbanización');
        },
      });
  }
  quitarUrbanizacion(urbId: number): void {
    const usuario = this.usuarioSeleccionado();
    if (!usuario) return;

    // Optimistic update
    const anteriores = this.urbAsignadas();
    this.urbAsignadas.set(anteriores.filter((u) => u.id !== urbId));

    this.seguridadService.removerUrbanizacion(usuario.id, urbId).subscribe({
      error: () => {
        // Revertir si falla
        this.urbAsignadas.set(anteriores);
        this.notification.showError('Error al quitar urbanización');
      },
    });
  }
  guardarUrbanizaciones(): void {
    const usuario = this.usuarioSeleccionado();
    if (!usuario) return;
    this.guardandoUrb.set(true);
    this.seguridadService
      .asignarUrbanizaciones(
        usuario.id,
        this.urbAsignadas().map((u) => u.id),
      )
      .subscribe({
        next: () => {
          this.guardandoUrb.set(false);
          this.notification.showSuccess('Urbanizaciones guardadas correctamente');
        },
        error: () => {
          this.guardandoUrb.set(false);
          this.notification.showError('Error al guardar urbanizaciones');
        },
      });
  }

  getRoleBadge(role: string): string {
    const map: Record<string, string> = {
      ADMINISTRADOR: 'bg-red-100 text-red-700',
      ASESOR: 'bg-blue-100 text-blue-700',
      SECRETARIA: 'bg-emerald-100 text-emerald-700',
      USUARIO: 'bg-gray-100 text-gray-600',
    };
    return map[role] ?? 'bg-gray-100 text-gray-600';
  }
}
