import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { LoteService } from '../../../lote/service/lote.service';
import { ReservaService } from '../../service/reserva.service';
import { AuthService } from '../../../../components/services/auth.service';
import { ReciboService, Recibo } from '../../../../core/services/recibo.service';
import { UpdateReservaDto } from '../../../../core/interfaces/reserva.interface';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';

@Component({
  selector: 'app-reserva-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reserva-edit.html',
  providers: [DatePipe],
})
export class ReservaEdit implements OnInit {
  reservaForm: FormGroup;
  reservaId: number | null = null;
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  reservaData: any = null;
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);
  fechaVencimientoCalculada = signal<string>('');

  archivosSeleccionados = signal<File[]>([]);
  maxArchivos = 3;
  archivosCargando = signal<boolean>(false);
  recibosReserva = signal<Recibo[]>([]);
  recibosCargando = signal<boolean>(true);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private reservaSvc = inject(ReservaService);
  private loteSvc = inject(LoteService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);
  private authService = inject(AuthService);
  private reciboSvc = inject(ReciboService);
  private urbanizacionContext = inject(UrbanizacionContextService);

  constructor() {
    this.reservaForm = this.crearFormularioReserva();
  }

  ngOnInit(): void {
    this.obtenerReserva();
    this.setupFechaListener();
  }

  private getCurrentTimeLaPaz(): Date {
    const now = new Date();
    const offsetLaPaz = -4 * 60;
    const laPazTime = new Date(now.getTime() + (offsetLaPaz - now.getTimezoneOffset()) * 60 * 1000);
    return laPazTime;
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  crearFormularioReserva(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      fechaInicio: ['', Validators.required],
      estado: ['ACTIVA'],
    });
  }

  setupFechaListener(): void {
    this.reservaForm.get('fechaInicio')?.valueChanges.subscribe((fecha) => {
      if (fecha) {
        const fechaInicio = new Date(fecha);
        const fechaVencimiento = new Date(fechaInicio);
        fechaVencimiento.setHours(fechaVencimiento.getHours() + 24);
        this.fechaVencimientoCalculada.set(this.formatDateForInput(fechaVencimiento));
      } else {
        this.fechaVencimientoCalculada.set('');
      }
    });
  }

  cargarClientes(): void {
    this.authService.getClientes().subscribe({
      next: (response: any) => {
        let clientes: any[] = [];
        if (response.data && Array.isArray(response.data.clientes)) {
          clientes = response.data.clientes;
        } else if (response.data && Array.isArray(response.data)) {
          clientes = response.data;
        } else if (Array.isArray(response)) {
          clientes = response;
        }
        this.clientes.set(clientes);
      },
      error: () => {
        this.notificationService.showError('No se pudieron cargar los clientes');
      },
    });
  }

  cargarLotesDisponibles(loteActualId?: number): void {
    const currentUser = this.authService.getCurrentUser();
    const rolesFullAccess = ['ADMINISTRADOR', 'SECRETARIA'];
    const urbanizacionActiva = this.urbanizacionContext.urbanizacion();

    this.reservaSvc.getLotesDisponibles().subscribe({
      next: (lotes: LoteDto[]) => {
        let lotesFiltrados = lotes;
        if (!rolesFullAccess.includes(currentUser?.role)) {
          lotesFiltrados = lotes.filter(
            (lote) => lote.encargadoId?.toString() === currentUser?.id?.toString()
          );
        }
        if (urbanizacionActiva) {
          lotesFiltrados = lotesFiltrados.filter(
            (lote) => lote.urbanizacion?.id === urbanizacionActiva.id
          );
        }
        if (loteActualId) {
          const loteActual = lotes.find(l => l.id === loteActualId);
          if (loteActual && !lotesFiltrados.some(l => l.id === loteActualId)) {
            lotesFiltrados = [...lotesFiltrados, loteActual];
          }
        }
        this.lotes.set(lotesFiltrados);
      },
      error: () => {
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  obtenerReserva(): void {
    this.reservaId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.reservaId) {
      this.error.set('ID de reserva no válido');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.reservaSvc.getById(this.reservaId).subscribe({
      next: (reserva: any) => {
        if (reserva) {
          this.reservaData = reserva;
          this.cargarDatosAdicionales(reserva);
        } else {
          this.error.set('No se encontró la reserva');
          this.cargando.set(false);
        }
      },
      error: () => {
        this.error.set('No se pudo cargar la reserva');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosAdicionales(reserva: any): void {
    const loteActualId = reserva.lote?.id || reserva.inmuebleId;
    this.cargarClientes();
    this.cargarLotesDisponibles(loteActualId);

    setTimeout(() => {
      this.cargarDatosFormulario(reserva);
      this.cargarRecibosReserva();
      this.cargando.set(false);
    }, 500);
  }

  cargarDatosFormulario(reserva: any): void {
    const clienteId = reserva.cliente?.id || reserva.clienteId;
    const inmuebleId = reserva.lote?.id || reserva.inmuebleId;

    const fechaInicio = new Date(reserva.fechaInicio);
    const fechaInicioFormateada = this.formatDateForInput(fechaInicio);

    this.reservaForm.patchValue({
      clienteId: clienteId?.toString() || '',
      inmuebleTipo: reserva.inmuebleTipo || 'LOTE',
      inmuebleId: inmuebleId?.toString() || '',
      fechaInicio: fechaInicioFormateada,
      estado: reserva.estado || 'ACTIVA',
    });

    const fechaVencimiento = new Date(fechaInicio);
    fechaVencimiento.setHours(fechaVencimiento.getHours() + 24);
    this.fechaVencimientoCalculada.set(this.formatDateForInput(fechaVencimiento));

    const clienteSeleccionado = this.clientes().find((c) => c.id === clienteId);
    const loteSeleccionado = this.lotes().find((l) => l.id === inmuebleId);

    if (clienteSeleccionado) {
      this.searchCliente.set(clienteSeleccionado.fullName || '');
    }
    if (loteSeleccionado) {
      this.searchLote.set(
        `${loteSeleccionado.numeroLote} - ${loteSeleccionado.urbanizacion?.nombre || 'Independiente'}`
      );
    }
  }

  cargarRecibosReserva(): void {
    if (!this.reservaId) return;
    this.recibosCargando.set(true);
    this.reciboSvc.obtenerPorReserva(this.reservaId).subscribe({
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

  filteredClientes() {
    const search = this.searchCliente().toLowerCase();
    if (!search) return this.clientes();
    return this.clientes().filter(
      (cliente) =>
        cliente.fullName?.toLowerCase().includes(search) ||
        cliente.ci?.toLowerCase().includes(search) ||
        cliente.email?.toLowerCase().includes(search)
    );
  }

  filteredLotes() {
    const search = this.searchLote().toLowerCase();
    if (!search) return this.lotes();
    return this.lotes().filter(
      (lote) =>
        lote.numeroLote?.toLowerCase().includes(search) ||
        lote.urbanizacion?.nombre?.toLowerCase().includes(search)
    );
  }

  selectCliente(cliente: UserDto) {
    this.reservaForm.patchValue({
      clienteId: cliente.id.toString(),
    });
    this.searchCliente.set(cliente.fullName || '');
    this.showClientesDropdown.set(false);
  }

  selectLote(lote: LoteDto) {
    this.reservaForm.patchValue({
      inmuebleId: lote.id.toString(),
    });
    this.searchLote.set(
      `${lote.numeroLote} - ${lote.urbanizacion?.nombre || 'Independiente'}`
    );
    this.showLotesDropdown.set(false);
  }

  toggleClientesDropdown() {
    this.showClientesDropdown.set(!this.showClientesDropdown());
    if (this.showClientesDropdown()) {
      this.showLotesDropdown.set(false);
    }
  }

  toggleLotesDropdown() {
    this.showLotesDropdown.set(!this.showLotesDropdown());
    if (this.showLotesDropdown()) {
      this.showClientesDropdown.set(false);
    }
  }

  onClienteBlur() {
    setTimeout(() => {
      this.showClientesDropdown.set(false);
    }, 200);
  }

  onLoteBlur() {
    setTimeout(() => {
      this.showLotesDropdown.set(false);
    }, 200);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  formatFecha(date: any): string {
    if (!date) return 'N/A';
    try {
      return this.datePipe.transform(date, 'dd/MM/yyyy') || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  onSubmit(): void {
    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (!this.reservaId || !this.reservaData) {
      this.notificationService.showError('ID de reserva o datos de reserva no válidos.');
      return;
    }

    const fechaInicio = new Date(this.reservaForm.value.fechaInicio);
    const fechaVencimiento = new Date(fechaInicio);
    fechaVencimiento.setHours(fechaVencimiento.getHours() + 24);

    const fechaInicioOriginal = new Date(this.reservaData.fechaInicio);
    const fechaInicioCambio = Math.abs(fechaInicio.getTime() - fechaInicioOriginal.getTime()) > 60000;

    if (fechaInicioCambio) {
      const ahoraLaPaz = this.getCurrentTimeLaPaz();
      if (fechaInicio < ahoraLaPaz) {
        this.notificationService.showError('La fecha de inicio no puede ser anterior a la fecha actual');
        return;
      }
    }

    this.enviando.set(true);

    const formValue = this.reservaForm.value;
    const dataActualizada: UpdateReservaDto = {};

    if (formValue.clienteId && Number(formValue.clienteId) !== this.reservaData.clienteId) {
      dataActualizada.clienteId = Number(formValue.clienteId);
    }

    if (formValue.inmuebleId && Number(formValue.inmuebleId) !== this.reservaData.inmuebleId) {
      dataActualizada.inmuebleId = Number(formValue.inmuebleId);
    }

    if (formValue.estado && formValue.estado !== this.reservaData.estado) {
      dataActualizada.estado = formValue.estado;
    }

    if (formValue.inmuebleTipo && formValue.inmuebleTipo !== this.reservaData.inmuebleTipo) {
      dataActualizada.inmuebleTipo = formValue.inmuebleTipo;
    }

    if (fechaInicioCambio) {
      dataActualizada.fechaInicio = fechaInicio.toISOString();
      dataActualizada.fechaVencimiento = fechaVencimiento.toISOString();
    }

    if (Object.keys(dataActualizada).length === 0) {
      this.notificationService.showInfo('No hay cambios para actualizar.');
      this.enviando.set(false);
      return;
    }

    this.reservaSvc.update(this.reservaId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Reserva actualizada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/reservas/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al actualizar la reserva');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al actualizar la reserva';
        if (err.status === 400) {
          errorMessage = err.error?.message || 'Datos inválidos.';
        } else if (err.status === 404) {
          errorMessage = 'Reserva no encontrada.';
        } else if (err.status === 403) {
          errorMessage = 'No tiene permisos para actualizar reservas.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/reservas/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      ACTIVA: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      VENCIDA: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CANCELADA: 'px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700',
      CONVERTIDA_EN_VENTA: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
    };
    return classes[estado] || classes['ACTIVA'];
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

  subirArchivos() {
    if (this.archivosSeleccionados().length === 0) {
      this.notificationService.showError('No hay archivos seleccionados para subir.');
      return;
    }

    if (!this.reservaId) {
      this.notificationService.showError('No se puede subir archivos: ID de reserva no disponible.');
      return;
    }

    this.archivosCargando.set(true);

    const usuarioId = this.authService.getCurrentUser()?.id;
    if (!usuarioId) {
      this.notificationService.showError('No se pudo obtener el usuario autenticado.');
      this.archivosCargando.set(false);
      return;
    }

    this.reciboSvc.subirRecibosGenerales(this.archivosSeleccionados(), {
      tipoOperacion: 'RESERVA',
      reservaId: this.reservaId,
      observaciones: 'Subido desde edición de reserva',
    }).subscribe({
      next: () => {
        this.archivosCargando.set(false);
        this.notificationService.showSuccess('Archivos subidos exitosamente.');
        this.archivosSeleccionados.set([]);
        this.cargarRecibosReserva();
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
            this.cargarRecibosReserva();
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