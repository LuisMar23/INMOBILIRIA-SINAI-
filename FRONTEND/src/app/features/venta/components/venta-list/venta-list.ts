import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { VentaDto, RegistrarPagoDto } from '../../../../core/interfaces/venta.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { VentaService } from '../../service/venta.service';
import { ReciboService, Recibo } from '../../../../core/services/recibo.service';
import { ArchivosComponent } from '../../../../components/archivos/archivos/archivos';
import { environment } from '../../../../../environments/environment';
import { UploadArchivosService } from '../../../../components/services/archivos.service';
import { PdfService } from '../../../../core/services/pdf.service';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';

@Component({
  selector: 'app-venta-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, ArchivosComponent],
  templateUrl: './venta-list.html',
})
export class VentaList implements OnInit {
  urlServer = environment.fileServer;
  ventas = signal<VentaDto[]>([]);
  allVentas = signal<VentaDto[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  mostrarUploader = signal(false);
  ventaSeleccionadaParaArchivos = signal<VentaDto | null>(null);

  archivosSeleccionados = signal<File[]>([]);
  maxArchivos = 6;
  archivosCargando = signal<boolean>(false);

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private ventaSvc = inject(VentaService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private reciboSvc = inject(ReciboService);
  private pdfService = inject(PdfService);
  private archivoService = inject(UploadArchivosService);
  private urbanizacionContext = inject(UrbanizacionContextService);

  urbanizacionActiva = this.urbanizacionContext.urbanizacion;

  ventasFiltradasPorUrbanizacion = computed(() => {
    const urbanizacion = this.urbanizacionActiva();
    const ventas = this.allVentas();
    if (!urbanizacion) return ventas;

    return ventas.filter(venta => {
      if (venta.inmuebleTipo === 'LOTE' && venta.lote?.urbanizacion) {
        return venta.lote.urbanizacion.id === urbanizacion.id;
      }
      else if (venta.inmuebleTipo === 'PROPIEDAD' && venta.propiedad?.urbanizacion) {
        return venta.propiedad.urbanizacion.id === urbanizacion.id;
      }
      return false;
    });
  });

  filteredVentas = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let ventas = this.ventasFiltradasPorUrbanizacion();

    if (term) {
      ventas = ventas.filter(
        (venta: VentaDto) =>
          venta.cliente?.fullName?.toLowerCase().includes(term) ||
          venta.asesor?.fullName?.toLowerCase().includes(term) ||
          venta.lote?.numeroLote?.toLowerCase().includes(term) ||
          venta.propiedad?.nombre?.toLowerCase().includes(term) ||
          venta.estado?.toLowerCase().includes(term) ||
          venta.id?.toString().includes(term)
      );
    }

    return ventas;
  });

  ngOnInit(): void {
    this.urbanizacionContext.recuperar();
    this.obtenerVentas();
  }

  obtenerVentas() {
    this.cargando.set(true);
    this.error.set(null);
    this.ventaSvc.getAll().subscribe({
      next: (response: any) => {
        let ventas: VentaDto[] = [];

        if (response.ventas) {
          ventas = response.ventas;
          if (response.pagination) {
            this.total.set(response.pagination.total);
          } else {
            this.total.set(ventas.length);
          }
        } else if (response.data && response.data.ventas) {
          ventas = response.data.ventas;
          this.total.set(response.data.pagination?.total || ventas.length);
        } else if (Array.isArray(response)) {
          ventas = response;
          this.total.set(ventas.length);
        }

        this.ventas.set(ventas);
        this.allVentas.set(ventas);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar ventas:', err);
        this.error.set('No se pudieron cargar las ventas');
        this.cargando.set(false);
      },
    });
  }

  getTotalPagado(venta: VentaDto): number {
    if (!venta.planPago) return 0;

    if (venta.planPago.total_pagado !== undefined && venta.planPago.total_pagado !== null) {
      return Number(venta.planPago.total_pagado);
    }

    if (venta.planPago.pagos && Array.isArray(venta.planPago.pagos)) {
      return venta.planPago.pagos.reduce(
        (sum: number, pago: any) => sum + Number(pago.monto || 0),
        0
      );
    }

    return 0;
  }

  getSaldoPendiente(venta: VentaDto): number {
    if (!venta.planPago) return 0;

    if (venta.planPago.saldo_pendiente !== undefined && venta.planPago.saldo_pendiente !== null) {
      return Number(venta.planPago.saldo_pendiente);
    }

    const total = Number(venta.planPago.total || 0);
    return Math.max(0, total - this.getTotalPagado(venta));
  }

  getPorcentajePagado(venta: VentaDto): number {
    if (!venta.planPago || venta.planPago.total === 0) return 0;

    if (
      venta.planPago.porcentaje_pagado !== undefined &&
      venta.planPago.porcentaje_pagado !== null
    ) {
      return Number(venta.planPago.porcentaje_pagado);
    }

    const total = Number(venta.planPago.total || 0);
    return (this.getTotalPagado(venta) / total) * 100;
  }

  generarPdfVentas() {
    this.pdfService.generarPdfVentas(this.allVentas());
  }

  generarPdfVentaIndividual(venta: VentaDto) {
    this.pdfService.generarPdfVentaIndividual(venta);
  }

  totalPages() {
    return Math.ceil(this.filteredVentas().length / this.pageSize());
  }

  getVentasPaginadas(): VentaDto[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredVentas().slice(startIndex, endIndex);
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

  pageArray(): number[] {
    const totalPages = this.totalPages();
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  rangeStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    const end = this.currentPage() * this.pageSize();
    return end > this.filteredVentas().length ? this.filteredVentas().length : end;
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  abrirModalSubirArchivos(venta: VentaDto) {
    this.ventaSeleccionadaParaArchivos.set(venta);
    this.mostrarUploader.set(true);
  }

  cerrarModalUploader() {
    this.mostrarUploader.set(false);
    this.ventaSeleccionadaParaArchivos.set(null);
  }

  onSubidaCompleta() {
    this.cerrarModalUploader();
    this.notificationService.showSuccess('Archivos subidos correctamente');
  }

  eliminarVenta(id: number) {
    this.ventaSvc.obtenerCajasActivas().subscribe({
      next: (cajas) => {
        if (cajas.length > 0) {
          const cajaId = cajas[0].id;
          this.notificationService
            .confirmDelete('¿Está seguro que desea eliminar esta venta?')
            .then((result) => {
              if (result.isConfirmed) {
                this.ventaSvc.delete(id, cajaId).subscribe({
                  next: (response: any) => {
                    if (response.success) {
                      this.ventas.update((list) => list.filter((v) => v.id !== id));
                      this.allVentas.update((list) => list.filter((v) => v.id !== id));
                      this.total.update((total) => total - 1);
                      this.notificationService.showSuccess('Venta eliminada correctamente');
                    } else {
                      this.notificationService.showError(
                        response.message || 'Error al eliminar la venta'
                      );
                    }
                  },
                  error: (err) => {
                    console.error('Error al eliminar venta:', err);
                    let errorMessage = 'No se pudo eliminar la venta';
                    if (err.status === 400) {
                      errorMessage =
                        err.error?.message ||
                        'No se puede eliminar la venta porque tiene documentos asociados';
                    } else if (err.status === 404) {
                      errorMessage = 'Venta no encontrada';
                    } else if (err.error?.message) {
                      errorMessage = err.error.message;
                    }
                    this.notificationService.showError(errorMessage);
                  },
                });
              }
            });
        } else {
          this.notificationService.showError('No hay cajas activas para realizar la operación');
        }
      },
      error: (err) => {
        this.notificationService.showError('Error al obtener cajas activas');
      },
    });
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      PENDIENTE: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      PAGADO: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      CANCELADO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
    };
    return classes[estado] || classes['PENDIENTE'];
  }

  getEstadoPlanPagoClass(estado: string): string {
    const classes: { [key: string]: string } = {
      ACTIVO: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
      PAGADO: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      MOROSO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CANCELADO: 'px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700',
    };
    return classes[estado] || classes['ACTIVO'];
  }

  formatPrecio(precio: number): string {
    return precio.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatPorcentaje(porcentaje: number): string {
    return porcentaje.toFixed(1) + '%';
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'N/A';
      return dateObj.toLocaleDateString('es-BO');
    } catch {
      return 'N/A';
    }
  }

  getInmuebleDisplay(venta: VentaDto): string {
    if (venta.inmuebleTipo === 'LOTE' && venta.lote) {
      return `${venta.lote.numeroLote} - ${venta.lote.urbanizacion?.nombre || ''}`;
    } else if (venta.inmuebleTipo === 'PROPIEDAD' && venta.propiedad) {
      return `${venta.propiedad.nombre} - ${venta.propiedad.tipo}`;
    }
    return '-';
  }

  getNombreUrbanizacionActiva(): string {
    return this.urbanizacionActiva()?.nombre || 'Todas';
  }
}