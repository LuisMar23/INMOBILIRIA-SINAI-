import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CotizacionDto } from '../../../../core/interfaces/cotizacion.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { CotizacionService } from '../../service/cotizacion.service';
import { AuthService } from '../../../../components/services/auth.service';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';

interface ColumnConfig {
  key: keyof CotizacionDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-cotizacion-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cotizacion-list.html',
})
export class CotizacionList implements OnInit {
  cotizaciones = signal<CotizacionDto[]>([]);
  allCotizaciones = signal<CotizacionDto[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  cotizacionSeleccionada = signal<CotizacionDto | null>(null);
  mostrarModal = signal<boolean>(false);

  sortColumn = signal<keyof CotizacionDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'nombreCliente', label: 'Cliente', sortable: true },
    { key: 'asesor', label: 'Asesor', sortable: true },
    { key: 'lote', label: 'Lote', sortable: true },
    { key: 'precioOfertado', label: 'Precio Ofertado', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private cotizacionSvc = inject(CotizacionService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private urbanizacionContext = inject(UrbanizacionContextService);

  filteredCotizaciones = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const urbanizacionActiva = this.urbanizacionContext.urbanizacion();
    let cotizaciones = this.allCotizaciones();

    if (urbanizacionActiva) {
      cotizaciones = cotizaciones.filter(
        (cotizacion) => cotizacion.lote?.urbanizacion?.id === urbanizacionActiva.id
      );
    }

    if (term) {
      cotizaciones = cotizaciones.filter(
        (cotizacion: CotizacionDto) =>
          cotizacion.nombreCliente?.toLowerCase().includes(term) ||
          cotizacion.contactoCliente?.toLowerCase().includes(term) ||
          cotizacion.detalle?.toLowerCase().includes(term) ||
          cotizacion.asesor?.fullName?.toLowerCase().includes(term) ||
          cotizacion.lote?.numeroLote?.toLowerCase().includes(term) ||
          cotizacion.estado?.toLowerCase().includes(term),
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return cotizaciones;

    return [...cotizaciones].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      if (column === 'asesor') {
        aValue = a.asesor?.fullName;
        bValue = b.asesor?.fullName;
      }
      if (column === 'lote') {
        aValue = a.lote?.numeroLote;
        bValue = b.lote?.numeroLote;
      }

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
    this.urbanizacionContext.recuperar();
    this.obtenerCotizaciones();
  }

  obtenerCotizaciones() {
    this.cargando.set(true);
    this.error.set(null);
    this.cotizacionSvc.getAll().subscribe({
      next: (cotizaciones) => {
        this.cotizaciones.set(cotizaciones);
        this.allCotizaciones.set(cotizaciones);
        this.total.set(cotizaciones.length);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set('No se pudieron cargar las cotizaciones');
        this.cargando.set(false);
      },
    });
  }

  cambiarOrden(columna: keyof CotizacionDto) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof CotizacionDto): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  verDetalles(cotizacion: CotizacionDto) {
    this.cotizacionSeleccionada.set(cotizacion);
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.cotizacionSeleccionada.set(null);
  }

  eliminarCotizacion(id: number) {
    const currentUser = this.authService.getCurrentUser();
    const rolesPermitidos = ['ASESOR', 'ADMINISTRADOR', 'SECRETARIA'];

    if (!currentUser || !rolesPermitidos.includes(currentUser.role)) {
      this.notificationService.showError(
        'Solo los asesores, administradores y secretarias pueden eliminar cotizaciones',
      );
      return;
    }

    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar esta cotización?')
      .then((result) => {
        if (result.isConfirmed) {
          this.cotizacionSvc.delete(id).subscribe({
            next: () => {
              this.cotizaciones.update((list) => list.filter((c) => c.id !== id));
              this.allCotizaciones.update((list) => list.filter((c) => c.id !== id));
              this.total.update((total) => total - 1);
              this.notificationService.showSuccess('Cotización eliminada correctamente');
              if (this.cotizacionSeleccionada()?.id === id) {
                this.cerrarModal();
              }
            },
            error: (err) => {
              let errorMessage = 'No se pudo eliminar la cotización';
              if (err.status === 403) {
                errorMessage =
                  'No tienes permisos para eliminar cotizaciones. Se requiere rol de ASESOR, ADMINISTRADOR o SECRETARIA';
              }
              this.notificationService.showError(errorMessage);
            },
          });
        }
      });
  }

  getEstadoBadgeClass(estado: string): string {
    const classes = {
      PENDIENTE: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      ACEPTADA: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      RECHAZADA: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
    };
    return classes[estado as keyof typeof classes] || classes['PENDIENTE'];
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

  getCotizacionesPaginadas(): CotizacionDto[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredCotizaciones().slice(startIndex, endIndex);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  formatMonto(monto: number | string | undefined | null): string {
    if (monto === undefined || monto === null) return '0';

    let numero: number;
    if (typeof monto === 'string') {
      numero = parseFloat(monto);
      if (isNaN(numero)) return '0';
    } else {
      numero = monto;
    }

    if (Number.isInteger(numero)) {
      return numero.toString();
    }

    const formatted = numero.toFixed(2);

    if (formatted.endsWith('.00')) {
      return formatted.slice(0, -3);
    }

    return formatted;
  }
}