import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropiedadDto } from '../../../../core/interfaces/propiedad.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { PropiedadService } from '../../service/propiedad.service';
import { ArchivosComponent } from '../../../../components/archivos/archivos/archivos';
import { AuthService } from '../../../../components/services/auth.service';

interface ColumnConfig {
  key: keyof PropiedadDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-propiedad-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ArchivosComponent],
  templateUrl: './propiedad-list.html',
})
export class PropiedadList implements OnInit {
  propiedades = signal<PropiedadDto[]>([]);
  allPropiedades = signal<PropiedadDto[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  propiedadSeleccionada = signal<PropiedadDto | null>(null);
  mostrarModal = signal<boolean>(false);

  sortColumn = signal<keyof PropiedadDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'nombre', label: 'Propiedad', sortable: true },
    { key: 'tipo', label: 'Tipo', sortable: true },
    { key: 'ciudad', label: 'Ciudad', sortable: true },
    { key: 'tamano', label: 'Tamaño', sortable: true },
    { key: 'precio', label: 'Precio', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
    { key: 'estadoPropiedad', label: 'Estado Propiedad', sortable: true },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private propiedadSvc = inject(PropiedadService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  currentUser = this.authService.getCurrentUser();

  filteredPropiedades = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let propiedades = this.allPropiedades();

    if (term) {
      propiedades = propiedades.filter(
        (propiedad: PropiedadDto) =>
          propiedad.nombre?.toLowerCase().includes(term) ||
          propiedad.tipo?.toLowerCase().includes(term) ||
          propiedad.tipoInmueble?.toLowerCase().includes(term) ||
          propiedad.ciudad?.toLowerCase().includes(term) ||
          propiedad.estado?.toLowerCase().includes(term) ||
          propiedad.estadoPropiedad?.toLowerCase().includes(term) ||
          propiedad.descripcion?.toLowerCase().includes(term)
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return propiedades;

    return [...propiedades].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aString = aValue.toString().toLowerCase();
      const bString = bValue.toString().toLowerCase();

      if (direction === 'asc') {
        return aString.localeCompare(bString);
      } else {
        return bString.localeCompare(aString);
      }
    });
  });

  ngOnInit(): void {
    this.obtenerPropiedades();
  }

  obtenerPropiedades() {
    this.cargando.set(true);
    this.error.set(null);
    this.propiedadSvc.getAll().subscribe({
      next: (propiedades) => {
        const propiedadesConIndicador = propiedades.map(propiedad => ({
          ...propiedad,
          esMiPropiedad: propiedad.encargadoId === this.currentUser?.id
        }));
        this.propiedades.set(propiedadesConIndicador);
        this.allPropiedades.set(propiedadesConIndicador);
        this.total.set(propiedades.length);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar propiedades:', err);
        this.error.set('No se pudieron cargar las propiedades');
        this.cargando.set(false);
      },
    });
  }

  getEncargadoBadgeClass(propiedad: PropiedadDto): string {
    if (propiedad.encargadoId === this.currentUser?.id) {
      return 'px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200';
    }
    if (!propiedad.encargadoId) {
      return 'px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200';
    }
    return 'px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200';
  }

  getEncargadoText(propiedad: PropiedadDto): string {
    if (propiedad.encargadoId === this.currentUser?.id) {
      return '👤 Mi propiedad';
    }
    if (!propiedad.encargadoId) {
      return '📦 Sin encargado';
    }
    return '👥 Otro asesor';
  }

  puedeAsignarEncargado(propiedad: PropiedadDto): boolean {
    return propiedad.tipo === 'CASA' || propiedad.tipo === 'DEPARTAMENTO';
  }

  cambiarOrden(columna: keyof PropiedadDto) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof PropiedadDto): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  verDetalles(propiedad: PropiedadDto) {
    this.propiedadSeleccionada.set(propiedad);
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.propiedadSeleccionada.set(null);
  }

  eliminarPropiedad(id: number) {
    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar esta propiedad?')
      .then((result) => {
        if (result.isConfirmed) {
          this.propiedadSvc.delete(id).subscribe({
            next: () => {
              this.propiedades.update((list) => list.filter((p) => p.id !== id));
              this.allPropiedades.update((list) => list.filter((p) => p.id !== id));
              this.total.update((total) => total - 1);
              this.notificationService.showSuccess('Propiedad eliminada correctamente');
              if (this.propiedadSeleccionada()?.id === id) {
                this.cerrarModal();
              }
            },
            error: (err) => {
              console.error('Error al eliminar propiedad:', err);
              this.notificationService.showError('No se pudo eliminar la propiedad');
            },
          });
        }
      });
  }

  abrirMapa(propiedad: PropiedadDto) {
    if (propiedad.ubicacion) {
      window.open(propiedad.ubicacion, '_blank', 'noopener,noreferrer');
    } else {
      this.notificationService.showWarning('Esta propiedad no tiene ubicación registrada');
    }
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      DISPONIBLE: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      RESERVADO: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      VENDIDO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CON_OFERTA: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
      ALQUILADO: 'px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700',
      ANTICRETICO: 'px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700',
    };
    return classes[estado] || classes['DISPONIBLE'];
  }

  getTipoBadgeClass(tipo: string): string {
    const classes: { [key: string]: string } = {
      CASA: 'px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700',
      CUARTO: 'px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700',
      DEPARTAMENTO: 'px-3 py-1 rounded-full text-xs font-bold bg-pink-100 text-pink-700',
      GARZONIER: 'px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700',
    };
    return classes[tipo] || classes['CASA'];
  }

  getTipoInmuebleBadgeClass(tipoInmueble: string): string {
    const classes: { [key: string]: string } = {
      LOTE: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
      PROPIEDAD: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
    };
    return classes[tipoInmueble] || classes['PROPIEDAD'];
  }

  getEstadoPropiedadBadgeClass(estadoPropiedad: string): string {
    const classes: { [key: string]: string } = {
      VENTA: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
      ALQUILER: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      ANTICREDITO: 'px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700',
    };
    return classes[estadoPropiedad] || classes['VENTA'];
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((v) => v + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((v) => v - 1);
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  totalPages() {
    return Math.ceil(this.total() / this.pageSize());
  }

  pageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  rangeStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    const end = this.currentPage() * this.pageSize();
    return end > this.total() ? this.total() : end;
  }

  getPropiedadesPaginadas(): PropiedadDto[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredPropiedades().slice(startIndex, endIndex);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  tieneUbicacion(propiedad: PropiedadDto): boolean {
    return !!propiedad.ubicacion;
  }

  mostrarUploader = signal(false);
  abrirModalSubirArchivos(propiedad: PropiedadDto) {
    this.propiedadSeleccionada.set(propiedad);
    this.mostrarUploader.set(true);
  }

  cerrarModalUploader() {
    this.mostrarUploader.set(false);
    this.propiedadSeleccionada.set(null);
  }

  onSubidaCompleta() {
    this.cerrarModalUploader();
    this.notificationService.showSuccess('Archivos subidos correctamente');
    this.obtenerPropiedades();
  }
}