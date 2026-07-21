import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { VentaDto, RegistrarPagoDto, Cuota } from '../../../../core/interfaces/venta.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { VentaService } from '../../service/venta.service';
import { ReciboService, Recibo } from '../../../../core/services/recibo.service';
import { PdfService } from '../../../../core/services/pdf.service';
import { AnticipoPdfService } from '../../../../core/services/pdf-anticipo.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-venta-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './venta-detail.html',
  providers: [DatePipe],
})
export class VentaDetail implements OnInit {
  ventaId = signal<number | null>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  ventaData = signal<VentaDto | null>(null);

  mostrarFormPago = signal<boolean>(false);
  enviandoPago = signal<boolean>(false);

  archivosSeleccionados = signal<File[]>([]);
  maxArchivos = 6;
  archivosCargando = signal<boolean>(false);

  recibosVenta = signal<Recibo[]>([]);
  recibosCargando = signal<boolean>(true);

  cronograma = signal<Cuota[]>([]);

  pagoForm: FormGroup;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ventaSvc = inject(VentaService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private reciboSvc = inject(ReciboService);
  private pdfService = inject(PdfService);
  private datePipe = inject(DatePipe);
  private anticipoPdfService = inject(AnticipoPdfService);

  constructor() {
    this.pagoForm = this.crearPagoForm();
  }

  archivosVenta = computed(() => this.ventaData()?.archivos ?? []);

  esImagen(archivo: any): boolean {
    return archivo?.tipoArchivo?.startsWith('image/');
  }

  getUrlArchivo(archivo: any): string {
    if (!archivo?.urlArchivo) return '';
    if (archivo.urlArchivo.startsWith('http')) return archivo.urlArchivo;
    return `${environment.fileServer}${archivo.urlArchivo}`;
  }
  totalPagado = computed(() => {
    const planPago = this.ventaData()?.planPago;
    if (!planPago) return 0;
    if (planPago.total_pagado !== undefined && planPago.total_pagado !== null) {
      return Number(planPago.total_pagado);
    }
    if (planPago.pagos && Array.isArray(planPago.pagos)) {
      return planPago.pagos.reduce((sum: number, pago: any) => sum + Number(pago.monto || 0), 0);
    }
    return 0;
  });

  saldoPendiente = computed(() => {
    const planPago = this.ventaData()?.planPago;
    if (!planPago) return 0;
    if (planPago.saldo_pendiente !== undefined && planPago.saldo_pendiente !== null) {
      return Number(planPago.saldo_pendiente);
    }
    const total = Number(planPago.total || 0);
    return Math.max(0, total - this.totalPagado());
  });

  porcentajePagado = computed(() => {
    const planPago = this.ventaData()?.planPago;
    if (!planPago || planPago.total === 0) return 0;
    if (planPago.porcentaje_pagado !== undefined && planPago.porcentaje_pagado !== null) {
      return Number(planPago.porcentaje_pagado);
    }
    const total = Number(planPago.total || 0);
    return (this.totalPagado() / total) * 100;
  });

  montoMaximoPago = computed(() => {
    return this.saldoPendiente();
  });

  ngOnInit(): void {
    this.obtenerVenta();
  }

  crearPagoForm(): FormGroup {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    return this.fb.group({
      monto: [0, [Validators.required, Validators.min(0.01)]],
      fecha_pago: [fechaHoy, Validators.required],
      observacion: [''],
      metodoPago: ['EFECTIVO', Validators.required],
    });
  }

  obtenerVenta(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('ID de venta no válido');
      this.cargando.set(false);
      return;
    }
    this.ventaId.set(id);
    this.cargando.set(true);
    this.ventaSvc.getById(id).subscribe({
      next: (venta: VentaDto) => {
        if (venta) {
          this.ventaData.set(venta);
          this.cargarRecibosVenta(venta.id);
          this.cargarCronograma(venta.id);
          this.cargando.set(false);
        } else {
          this.error.set('No se encontró la venta');
          this.cargando.set(false);
        }
      },
      error: (err: any) => {
        console.error('Error obteniendo venta:', err);
        this.error.set('No se pudo cargar la venta');
        this.cargando.set(false);
      },
    });
  }

  cargarCronograma(ventaId: number): void {
    this.ventaSvc.obtenerCronograma(ventaId).subscribe({
      next: (response) => {
        if (response.success && response.data.cronograma) {
          this.cronograma.set(response.data.cronograma);
        } else {
          this.cronograma.set([]);
        }
      },
      error: (err) => {
        console.error('Error cargando cronograma:', err);
        this.cronograma.set([]);
      },
    });
  }

  cargarRecibosVenta(ventaId: number): void {
    this.recibosCargando.set(true);
    this.reciboSvc.obtenerPorVenta(ventaId).subscribe({
      next: (recibos) => {
        this.recibosVenta.set(recibos);
        this.recibosCargando.set(false);
      },
      error: (err) => {
        this.notificationService.showError('No se pudieron cargar los recibos de la venta');
        this.recibosCargando.set(false);
      },
    });
  }

  toggleFormPago(): void {
    this.mostrarFormPago.set(!this.mostrarFormPago());
  }

  registrarPago(): void {
    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos del pago correctamente.');
      return;
    }

    const venta = this.ventaData();
    if (!venta?.planPago) {
      this.notificationService.showError('No hay plan de pago para esta venta.');
      return;
    }

    const monto = Number(this.pagoForm.value.monto);
    const saldoPendiente = this.saldoPendiente();

    if (monto <= 0) {
      this.notificationService.showError('El monto debe ser mayor a cero.');
      return;
    }

    if (monto > saldoPendiente) {
      this.notificationService.showError(
        `El monto no puede ser mayor al saldo pendiente (${this.formatPrecio(saldoPendiente)})`,
      );
      return;
    }

    const fechaPago = new Date(this.pagoForm.value.fecha_pago);
    const hoy = new Date();
    const maxFechaPermitida = new Date(hoy);
    maxFechaPermitida.setDate(maxFechaPermitida.getDate() + 90);

    if (fechaPago > maxFechaPermitida) {
      this.notificationService.showError(
        'La fecha de pago no puede ser más de 90 días en el futuro',
      );
      return;
    }

    this.enviandoPago.set(true);

    const pagoData: RegistrarPagoDto = {
      plan_pago_id: venta.planPago.id_plan_pago!,
      monto: monto,
      fecha_pago: this.pagoForm.value.fecha_pago,
      observacion: this.pagoForm.value.observacion || '',
      metodoPago: this.pagoForm.value.metodoPago,
    };

    this.ventaSvc.crearPagoPlan(pagoData).subscribe({
      next: (response: any) => {
        this.enviandoPago.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Pago registrado exitosamente!');
          this.pagoForm.reset();
          this.mostrarFormPago.set(false);
          this.obtenerVenta();

          const hoy = new Date();
          const fechaHoy = hoy.toISOString().split('T')[0];
          this.pagoForm.patchValue({
            fecha_pago: fechaHoy,
            metodoPago: 'EFECTIVO',
            monto: 0,
            observacion: '',
          });
        } else {
          this.notificationService.showError(response.message || 'Error al registrar el pago');
        }
      },
      error: (err: any) => {
        this.enviandoPago.set(false);
        let errorMessage = 'Error al registrar el pago';
        if (err.status === 400) {
          errorMessage = err.error?.message || 'Datos inválidos para el pago. Verifique la fecha.';
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  eliminarVenta(): void {
    const id = this.ventaId();
    if (!id) return;

    this.ventaSvc.obtenerCajasActivas().subscribe({
      next: (cajas) => {
        if (cajas.length === 0) {
          this.notificationService.showError('No hay cajas disponibles para realizar la operación');
          return;
        }

        const cajaId = cajas[0].id;

        this.notificationService
          .confirmDelete('¿Está seguro que desea eliminar esta venta?')
          .then((result) => {
            if (result.isConfirmed) {
              this.ventaSvc.delete(id, cajaId).subscribe({
                next: (response: any) => {
                  if (response.success) {
                    this.notificationService.showSuccess('Venta eliminada correctamente');
                    this.router.navigate(['/ventas/lista']);
                  } else {
                    this.notificationService.showError(
                      response.message || 'Error al eliminar la venta',
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
      },
      error: (err) => {
        this.notificationService.showError('Error al obtener cajas activas');
      },
    });
  }

  generarPdfVenta() {
    const venta = this.ventaData();
    if (venta) {
      this.pdfService.generarPdfVentaIndividual(venta);
    }
  }

  descargarAnticipo() {
    const venta = this.ventaData();
    if (venta && venta.lote) {
      this.anticipoPdfService.generarAnticipoPdf(venta);
    }
  }

  descargarRecibo(recibo: Recibo) {
    this.reciboSvc.descargarRecibo(recibo);
  }

  eliminarRecibo(recibo: Recibo) {
    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar este archivo?')
      .then((result) => {
        if (result.isConfirmed) {
          this.reciboSvc.eliminarRecibo(recibo.id).subscribe({
            next: () => {
              this.notificationService.showSuccess('Archivo eliminado exitosamente.');
              const ventaId = this.ventaId();
              if (ventaId) {
                this.cargarRecibosVenta(ventaId);
              }
            },
            error: (err) => {
              this.notificationService.showError('No se pudo eliminar el archivo.');
            },
          });
        }
      });
  }

  volverAlListado(): void {
    this.router.navigate(['/ventas/lista']);
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

  // MODIFICACIÓN: Se agregó el estado 'PARCIAL'
  getEstadoCuotaClass(estado: string): string {
    const classes: { [key: string]: string } = {
      PENDIENTE: 'bg-yellow-100 text-yellow-700',
      PAGADA: 'bg-green-100 text-green-700',
      VENCIDA: 'bg-red-100 text-red-700',
      PARCIAL: 'bg-blue-100 text-blue-700',
    };
    return classes[estado] || classes['PENDIENTE'];
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
      return this.datePipe.transform(date, 'dd/MM/yyyy') || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatFecha(fecha: string | Date): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
