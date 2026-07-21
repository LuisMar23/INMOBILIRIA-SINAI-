import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PromocionDto } from '../../../../core/interfaces/promocion.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromocionService } from '../../service/promocion.service';
import { LoteService } from '../../../lote/service/lote.service';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';

interface ColumnConfig {
  key: keyof PromocionDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-promocion-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './promocion-list.html',
})
export class PromocionList implements OnInit {
  promociones = signal<PromocionDto[]>([]);
  allPromociones = signal<PromocionDto[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  promocionSeleccionada = signal<PromocionDto | null>(null);
  mostrarModal = signal<boolean>(false);
  mostrarModalAsignar = signal<boolean>(false);

  lotesDisponibles = signal<LoteDto[]>([]);
  urbanizaciones = signal<UrbanizacionDto[]>([]);
  lotesSeleccionados = signal<number[]>([]);
  urbanizacionSeleccionada = signal<number | null>(null);
  asignarATodos = signal<boolean>(false);
  asignando = signal<boolean>(false);
  busquedaLotes = signal<string>('');
  busquedaUrbanizaciones = signal<string>('');
  modoRemover = signal<boolean>(false);

  sortColumn = signal<keyof PromocionDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'titulo', label: 'Promoción', sortable: true },
    { key: 'descuento', label: 'Descuento', sortable: true },
    { key: 'fechaInicio', label: 'Fecha Inicio', sortable: true },
    { key: 'fechaFin', label: 'Fecha Fin', sortable: true },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private promocionSvc = inject(PromocionService);
  private loteSvc = inject(LoteService);
  private urbanizacionSvc = inject(UrbanizacionService);
  private notificationService = inject(NotificationService);

  filteredPromociones = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let promociones = this.allPromociones();

    if (term) {
      promociones = promociones.filter(
        (promocion: PromocionDto) =>
          promocion.titulo?.toLowerCase().includes(term) ||
          promocion.descripcion?.toLowerCase().includes(term) ||
          promocion.urbanizacion?.nombre?.toLowerCase().includes(term)
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return promociones;

    return [...promociones].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (column === 'fechaInicio' || column === 'fechaFin') {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        return direction === 'asc' ? aDate - bDate : bDate - aDate;
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

  lotesFiltrados = computed(() => {
    const busqueda = this.busquedaLotes().toLowerCase();
    if (!busqueda) return this.lotesDisponibles();

    return this.lotesDisponibles().filter(
      (lote) =>
        lote.numeroLote.toLowerCase().includes(busqueda) ||
        lote.urbanizacion?.nombre.toLowerCase().includes(busqueda) ||
        lote.ciudad.toLowerCase().includes(busqueda)
    );
  });

  urbanizacionesFiltradas = computed(() => {
    const busqueda = this.busquedaUrbanizaciones().toLowerCase();
    if (!busqueda) return this.urbanizaciones();

    return this.urbanizaciones().filter((urbanizacion) =>
      urbanizacion.nombre.toLowerCase().includes(busqueda)
    );
  });

  ngOnInit(): void {
    this.obtenerPromociones();
    this.cargarDatosAsignacion();
  }

  obtenerPromociones() {
    this.cargando.set(true);
    this.error.set(null);
    this.promocionSvc.getAll().subscribe({
      next: (promociones) => {
        this.promociones.set(promociones);
        this.allPromociones.set(promociones);
        this.total.set(promociones.length);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar promociones:', err);
        this.error.set('No se pudieron cargar las promociones');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosAsignacion() {
    this.promocionSvc.getLotesDisponibles().subscribe({
      next: (lotes) => {
        this.lotesDisponibles.set(lotes);
      },
      error: (err) => {
        console.error('Error al cargar lotes:', err);
        this.loteSvc.getAll().subscribe({
          next: (lotes) => {
            this.lotesDisponibles.set(lotes.filter((lote) => lote.estado === 'DISPONIBLE'));
          },
        });
      },
    });

    this.urbanizacionSvc.getAll(1, 100).subscribe({
      next: (response) => {
        this.urbanizaciones.set(response.data);
      },
      error: (err) => {
        console.error('Error al cargar urbanizaciones:', err);
      },
    });
  }

  cambiarOrden(columna: keyof PromocionDto) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof PromocionDto): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  verDetalles(promocion: PromocionDto) {
    this.promocionSeleccionada.set(promocion);
    this.mostrarModal.set(true);
  }

  abrirModalAsignar(promocion: PromocionDto) {
    this.promocionSeleccionada.set(promocion);

    const lotesActuales = promocion.lotesAfectados?.map((lp) => lp.loteId) || [];
    this.lotesSeleccionados.set([...lotesActuales]);

    this.urbanizacionSeleccionada.set(promocion.urbanizacionId || null);
    this.asignarATodos.set(promocion.aplicadaATodos || false);
    this.modoRemover.set(false);
    this.busquedaLotes.set('');
    this.busquedaUrbanizaciones.set('');
    this.mostrarModalAsignar.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.promocionSeleccionada.set(null);
  }

  cerrarModalAsignar() {
    this.mostrarModalAsignar.set(false);
    this.promocionSeleccionada.set(null);
    this.lotesSeleccionados.set([]);
    this.urbanizacionSeleccionada.set(null);
    this.asignarATodos.set(false);
    this.modoRemover.set(false);
    this.busquedaLotes.set('');
    this.busquedaUrbanizaciones.set('');
  }

  toggleLoteSeleccionado(loteId: number): void {
    const seleccionados = this.lotesSeleccionados();
    if (seleccionados.includes(loteId)) {
      this.lotesSeleccionados.set(seleccionados.filter((id) => id !== loteId));
    } else {
      this.lotesSeleccionados.set([...seleccionados, loteId]);
    }
  }

  estaLoteSeleccionado(loteId: number): boolean {
    return this.lotesSeleccionados().includes(loteId);
  }

  onUrbanizacionChange(): void {
    if (this.urbanizacionSeleccionada()) {
      this.asignarATodos.set(false);
      this.modoRemover.set(false);
    }
  }

  onAsignarATodosChange(): void {
    if (this.asignarATodos()) {
      this.urbanizacionSeleccionada.set(null);
      this.modoRemover.set(false);
    }
  }

  onLotesEspecificosChange(): void {
    this.asignarATodos.set(false);
    this.urbanizacionSeleccionada.set(null);
    this.modoRemover.set(false);
  }

  activarModoRemover(): void {
    this.modoRemover.set(true);
    this.asignarATodos.set(false);
    this.urbanizacionSeleccionada.set(null);

    const promocion = this.promocionSeleccionada();
    if (promocion?.lotesAfectados) {
      this.lotesSeleccionados.set(promocion.lotesAfectados.map((lp) => lp.loteId));
    }
  }

  seleccionarTodosLotes(): void {
    const todosLotesIds = this.lotesFiltrados().map((lote) => lote.id);
    const seleccionadosActuales = this.lotesSeleccionados();
    const nuevosSeleccionados = [...new Set([...seleccionadosActuales, ...todosLotesIds])];
    this.lotesSeleccionados.set(nuevosSeleccionados);
  }

  deseleccionarTodosLotes(): void {
    const lotesFiltradosIds = this.lotesFiltrados().map((lote) => lote.id);
    const seleccionadosActuales = this.lotesSeleccionados();
    const nuevosSeleccionados = seleccionadosActuales.filter(
      (id) => !lotesFiltradosIds.includes(id)
    );
    this.lotesSeleccionados.set(nuevosSeleccionados);
  }

  removerAsignacion(): void {
    const promocion = this.promocionSeleccionada();
    if (!promocion || this.lotesSeleccionados().length === 0) return;

    this.asignando.set(true);
    this.promocionSvc.removerLotes(promocion.id, this.lotesSeleccionados()).subscribe({
      next: (response: any) => {
        this.asignando.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Lotes removidos de la promoción correctamente');
          this.cerrarModalAsignar();
          this.obtenerPromociones();
        } else {
          this.notificationService.showError(response.message || 'Error al remover los lotes');
        }
      },
      error: (err) => {
        this.asignando.set(false);
        this.notificationService.showError('Error al remover los lotes de la promoción');
      },
    });
  }

  removerUrbanizacion(): void {
    const promocion = this.promocionSeleccionada();
    if (!promocion || !this.urbanizacionSeleccionada()) return;

    this.asignando.set(true);
    this.promocionSvc.removerLotes(promocion.id, []).subscribe({
      next: (response: any) => {
        this.asignando.set(false);
        if (response.success) {
          this.notificationService.showSuccess(
            'Urbanización removida de la promoción correctamente'
          );
          this.cerrarModalAsignar();
          this.obtenerPromociones();
        } else {
          this.notificationService.showError(
            response.message || 'Error al remover la urbanización'
          );
        }
      },
      error: (err) => {
        this.asignando.set(false);
        this.notificationService.showError('Error al remover la urbanización de la promoción');
      },
    });
  }

  removerTodosLotes(): void {
    const promocion = this.promocionSeleccionada();
    if (!promocion) return;

    this.asignando.set(true);
    this.promocionSvc.removerLotes(promocion.id, []).subscribe({
      next: (response: any) => {
        this.asignando.set(false);
        if (response.success) {
          this.notificationService.showSuccess(
            'Todos los lotes removidos de la promoción correctamente'
          );
          this.cerrarModalAsignar();
          this.obtenerPromociones();
        } else {
          this.notificationService.showError(
            response.message || 'Error al remover todos los lotes'
          );
        }
      },
      error: (err) => {
        this.asignando.set(false);
        this.notificationService.showError('Error al remover todos los lotes de la promoción');
      },
    });
  }

  asignarPromocion(): void {
    const promocion = this.promocionSeleccionada();
    if (!promocion) return;

    this.asignando.set(true);

    if (this.asignarATodos()) {
      this.promocionSvc.asignarTodosLotes(promocion.id).subscribe({
        next: (response: any) => {
          this.asignando.set(false);
          if (response.success) {
            this.notificationService.showSuccess(
              'Promoción asignada a todos los lotes correctamente'
            );
            this.cerrarModalAsignar();
            this.obtenerPromociones();
          } else {
            this.notificationService.showError(response.message || 'Error al asignar la promoción');
          }
        },
        error: (err) => {
          this.asignando.set(false);
          this.notificationService.showError('Error al asignar la promoción a todos los lotes');
        },
      });
    } else if (this.urbanizacionSeleccionada()) {
      this.promocionSvc
        .asignarUrbanizacion(promocion.id, this.urbanizacionSeleccionada()!)
        .subscribe({
          next: (response: any) => {
            this.asignando.set(false);
            if (response.success) {
              this.notificationService.showSuccess(
                'Promoción asignada a la urbanización correctamente'
              );
              this.cerrarModalAsignar();
              this.obtenerPromociones();
            } else {
              this.notificationService.showError(
                response.message || 'Error al asignar la promoción'
              );
            }
          },
          error: (err) => {
            this.asignando.set(false);
            this.notificationService.showError('Error al asignar la promoción a la urbanización');
          },
        });
    } else if (this.lotesSeleccionados().length > 0) {
      this.promocionSvc.asignarLotes(promocion.id, this.lotesSeleccionados()).subscribe({
        next: (response: any) => {
          this.asignando.set(false);
          if (response.success) {
            this.notificationService.showSuccess(
              'Promoción asignada a los lotes seleccionados correctamente'
            );
            this.cerrarModalAsignar();
            this.obtenerPromociones();
          } else {
            this.notificationService.showError(response.message || 'Error al asignar la promoción');
          }
        },
        error: (err) => {
          this.asignando.set(false);
          this.notificationService.showError(
            'Error al asignar la promoción a los lotes seleccionados'
          );
        },
      });
    } else {
      this.notificationService.showError('Seleccione al menos una opción de asignación');
      this.asignando.set(false);
    }
  }

  eliminarPromocion(id: number) {
    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar esta promoción?')
      .then((result) => {
        if (result.isConfirmed) {
          this.promocionSvc.delete(id).subscribe({
            next: (response: any) => {
              if (response.success === true) {
                this.promociones.update((list) => list.filter((p) => p.id !== id));
                this.allPromociones.update((list) => list.filter((p) => p.id !== id));
                this.total.update((total) => total - 1);
                this.notificationService.showSuccess('Promoción eliminada correctamente');
                if (this.promocionSeleccionada()?.id === id) {
                  this.cerrarModal();
                }
              } else {
                this.notificationService.showError(
                  response.message || 'No se pudo eliminar la promoción'
                );
              }
            },
            error: (err) => {
              console.error('Error al eliminar promoción:', err);
              this.notificationService.showError('No se pudo eliminar la promoción');
            },
          });
        }
      });
  }

  getAplicaAText(promocion: PromocionDto): string {
    if (promocion.aplicadaATodos) {
      return 'Todos los lotes';
    } else if (promocion.urbanizacionId) {
      return `Urbanización: ${promocion.urbanizacion?.nombre}`;
    } else if (promocion.lotesAfectados && promocion.lotesAfectados.length > 0) {
      return `${promocion.lotesAfectados.length} lote(s)`;
    } else {
      return 'Sin asignar';
    }
  }

  getAplicaABadgeClass(promocion: PromocionDto): string {
    if (promocion.aplicadaATodos) {
      return 'px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700';
    } else if (promocion.urbanizacionId) {
      return 'px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700';
    } else if (promocion.lotesAfectados && promocion.lotesAfectados.length > 0) {
      return 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700';
    } else {
      return 'px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700';
    }
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

  getPromocionesPaginadas(): PromocionDto[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredPromociones().slice(startIndex, endIndex);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }
}
