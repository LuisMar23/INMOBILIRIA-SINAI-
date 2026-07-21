import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { LoteService } from '../../../lote/service/lote.service';
import { ReservaService } from '../../service/reserva.service';
import { AuthService } from '../../../../components/services/auth.service';
import { CreateReservaDto } from '../../../../core/interfaces/reserva.interface';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';

@Component({
  selector: 'app-reserva-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reserva-create.html',
})
export class ReservaCreate implements OnInit {
  reservaForm: FormGroup;
  enviando = signal<boolean>(false);
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);
  fechaVencimientoCalculada = signal<string>('');

  router = inject(Router);
  private fb = inject(FormBuilder);
  private reservaSvc = inject(ReservaService);
  private loteSvc = inject(LoteService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private urbanizacionContext = inject(UrbanizacionContextService);

  constructor() {
    this.reservaForm = this.crearFormularioReserva();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarLotesDisponibles();
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

  cargarLotesDisponibles(): void {
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
        this.lotes.set(lotesFiltrados);
      },
      error: () => {
        this.notificationService.showError('No se pudieron cargar los lotes');
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

  onSubmit(): void {
    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    const fechaInicio = new Date(this.reservaForm.value.fechaInicio);
    const ahoraLaPaz = this.getCurrentTimeLaPaz();

    if (fechaInicio < ahoraLaPaz) {
      this.notificationService.showError('La fecha de inicio no puede ser anterior a la fecha actual');
      return;
    }

    const fechaVencimiento = new Date(fechaInicio);
    fechaVencimiento.setHours(fechaVencimiento.getHours() + 24);

    this.enviando.set(true);

    const reservaData: CreateReservaDto = {
      clienteId: Number(this.reservaForm.value.clienteId),
      inmuebleTipo: this.reservaForm.value.inmuebleTipo,
      inmuebleId: Number(this.reservaForm.value.inmuebleId),
      fechaInicio: fechaInicio.toISOString(),
      fechaVencimiento: fechaVencimiento.toISOString(),
      estado: this.reservaForm.value.estado,
    };

    this.reservaSvc.create(reservaData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Reserva creada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/reservas/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al crear la reserva');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al crear la reserva';
        if (err.status === 400) {
          errorMessage = err.error?.message || 'Datos inválidos.';
        } else if (err.status === 403) {
          errorMessage = 'No tiene permisos para crear reservas.';
        } else if (err.status === 404) {
          errorMessage = 'Recurso no encontrado.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      DISPONIBLE: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      RESERVADO: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      VENDIDO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CON_OFERTA: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
    };
    return classes[estado] || classes['DISPONIBLE'];
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