import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReservaDto } from '../../../../core/interfaces/reserva.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReservaService } from '../../service/reserva.service';
import { ReciboService, Recibo } from '../../../../core/services/recibo.service';
import { PdfService } from '../../../../core/services/pdf.service';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';

interface ColumnConfig {
  key: keyof ReservaDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-reserva-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './reserva-list.html',
})
export class ReservaList implements OnInit {
  reservas = signal<ReservaDto[]>([]);
  allReservas = signal<ReservaDto[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  reservaSeleccionada = signal<ReservaDto | null>(null);
  mostrarModal = signal<boolean>(false);

  archivosSeleccionados = signal<File[]>([]);
  maxArchivos = 3;
  archivosCargando = signal<boolean>(false);
  reservaIdParaArchivos = signal<number | null>(null);

  recibosReserva = signal<Recibo[]>([]);
  recibosCargando = signal<boolean>(true);

  sortColumn = signal<keyof ReservaDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'id', label: 'Reserva', sortable: true },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'fechaInicio', label: 'Inicio', sortable: true },
    { key: 'fechaVencimiento', label: 'Vence', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private reservaSvc = inject(ReservaService);
  private notificationService = inject(NotificationService);
  private reciboSvc = inject(ReciboService);
  private pdfService = inject(PdfService);
  private urbanizacionContext = inject(UrbanizacionContextService);

  filteredReservas = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const urbanizacionActiva = this.urbanizacionContext.urbanizacion();
    let reservas = this.allReservas();

    if (urbanizacionActiva) {
      reservas = reservas.filter((reserva) => {
        const urbanizacionNombre = this.getUrbanizacionNombre(reserva);
        return urbanizacionNombre === urbanizacionActiva.nombre;
      });
    }

    if (term) {
      reservas = reservas.filter(
        (reserva: ReservaDto) =>
          reserva.cliente?.fullName?.toLowerCase().includes(term) ||
          reserva.asesor?.fullName?.toLowerCase().includes(term) ||
          reserva.lote?.numeroLote?.toLowerCase().includes(term) ||
          reserva.estado?.toLowerCase().includes(term)
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return reservas;

    return [...reservas].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      if (column === 'cliente') {
        aValue = a.cliente?.fullName;
        bValue = b.cliente?.fullName;
      }

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (column === 'fechaInicio' || column === 'fechaVencimiento') {
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

  ngOnInit(): void {
    this.obtenerReservas();
  }

  private getUrbanizacionNombre(reserva: ReservaDto): string {
    return reserva.lote?.urbanizacion?.nombre || '';
  }

  obtenerReservas() {
    this.cargando.set(true);
    this.error.set(null);

    this.reservaSvc.getAll().subscribe({
      next: (reservas) => {
        this.reservas.set(reservas);
        this.allReservas.set(reservas);
        this.total.set(reservas.length);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las reservas');
        this.cargando.set(false);
      },
    });
  }

  cambiarOrden(columna: keyof ReservaDto) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof ReservaDto): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  verDetalles(reserva: ReservaDto) {
    this.reservaSeleccionada.set(reserva);
    this.mostrarModal.set(true);
    if (reserva.id) {
      this.cargarRecibosReserva(reserva.id);
    }
  }

  cargarRecibosReserva(reservaId: number): void {
    this.recibosCargando.set(true);
    this.reciboSvc.obtenerPorReserva(reservaId).subscribe({
      next: (recibos) => {
        this.recibosReserva.set(recibos);
        this.recibosCargando.set(false);
      },
      error: () => {
        this.notificationService.showError('No se pudieron cargar los recibos de la reserva');
        this.recibosCargando.set(false);
      },
    });
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.reservaSeleccionada.set(null);
    this.archivosSeleccionados.set([]);
    this.reservaIdParaArchivos.set(null);
    this.recibosReserva.set([]);
  }

  eliminarReserva(id: number) {
    this.notificationService.confirmDelete('¿Está seguro que desea eliminar esta reserva?').then((result) => {
      if (result.isConfirmed) {
        this.reservaSvc.delete(id).subscribe({
          next: () => {
            this.reservas.update((list) => list.filter((r) => r.id !== id));
            this.allReservas.update((list) => list.filter((r) => r.id !== id));
            this.total.update((total) => total - 1);
            this.notificationService.showSuccess('Reserva eliminada correctamente');
            if (this.reservaSeleccionada()?.id === id) {
              this.cerrarModal();
            }
          },
          error: () => {
            this.notificationService.showError('No se pudo eliminar la reserva');
          },
        });
      }
    });
  }

  generarPdfReservas() {
    this.pdfService.generarPdfReservas(this.allReservas());
  }

  generarPdfReservaIndividual(reserva: ReservaDto) {
    this.pdfService.generarPdfReservaIndividual(reserva);
  }

  getEstadoBadgeClass(estado: string): string {
    const classes = {
      ACTIVA: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      VENCIDA: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CANCELADA: 'px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700',
      CONVERTIDA_EN_VENTA: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
    };
    return classes[estado as keyof typeof classes] || classes['ACTIVA'];
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

  getReservasPaginadas(): ReservaDto[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredReservas().slice(startIndex, endIndex);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  formatFecha(fecha: string | Date): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onFileChange(event: any) {
    const files: FileList | null = event.target.files;
    if (files) {
      const nuevosArchivos = Array.from(files);
      const archivosActuales = this.archivosSeleccionados();
      const archivosFinales = [...archivosActuales, ...nuevosArchivos];

      if (archivosFinales.length > this.maxArchivos) {
        this.notificationService.showError(`Solo puedes subir un máximo de ${this.maxArchivos} archivos.`);
        return;
      }

      this.archivosSeleccionados.set(archivosFinales);
    }
  }

  eliminarArchivo(index: number) {
    const archivosActuales = this.archivosSeleccionados();
    archivosActuales.splice(index, 1);
    this.archivosSeleccionados.set([...archivosActuales]);
  }

  prepararSubidaArchivos(reservaId: number) {
    this.reservaIdParaArchivos.set(reservaId);
    this.archivosSeleccionados.set([]);
  }

  subirArchivosModal() {
    if (this.archivosSeleccionados().length === 0) {
      this.notificationService.showError('No hay archivos seleccionados para subir.');
      return;
    }

    const reservaId = this.reservaIdParaArchivos();
    if (!reservaId) {
      this.notificationService.showError('No se puede subir archivos: ID de reserva no disponible.');
      return;
    }

    this.archivosCargando.set(true);

    this.reciboSvc.subirRecibosGenerales(this.archivosSeleccionados(), {
      tipoOperacion: 'RESERVA',
      reservaId: reservaId,
      observaciones: 'Subido desde listado de reservas',
    }).subscribe({
      next: () => {
        this.archivosCargando.set(false);
        this.notificationService.showSuccess('Archivos subidos exitosamente.');
        this.archivosSeleccionados.set([]);
        this.cargarRecibosReserva(reservaId);
      },
      error: (error) => {
        this.archivosCargando.set(false);
        this.notificationService.showError('Error al subir los archivos: ' + (error?.error?.message || 'Error desconocido'));
      },
    });
  }

  descargarRecibo(recibo: Recibo) {
    this.reciboSvc.descargarRecibo(recibo);
  }

  eliminarRecibo(recibo: Recibo) {
    this.notificationService.confirmDelete('¿Está seguro que desea eliminar este archivo?').then((result) => {
      if (result.isConfirmed) {
        this.reciboSvc.eliminarRecibo(recibo.id).subscribe({
          next: () => {
            this.notificationService.showSuccess('Archivo eliminado exitosamente.');
            this.cargarRecibosReserva(this.reservaSeleccionada()!.id);
          },
          error: () => {
            this.notificationService.showError('No se pudo eliminar el archivo.');
          },
        });
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}