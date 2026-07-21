import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { CotizacionService } from '../../service/cotizacion.service';
import { LoteService } from '../../../lote/service/lote.service';
import { AuthService } from '../../../../components/services/auth.service';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';

@Component({
  selector: 'app-cotizacion-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './cotizacion-create.html',
})
export class CotizacionCreate implements OnInit {
  cotizacionForm: FormGroup;
  enviando = signal<boolean>(false);
  lotes = signal<LoteDto[]>([]);
  searchLote = signal<string>('');
  showLotesDropdown = signal<boolean>(false);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private cotizacionSvc = inject(CotizacionService);
  private loteSvc = inject(LoteService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private urbanizacionContext = inject(UrbanizacionContextService);

  constructor() {
    this.cotizacionForm = this.crearFormularioCotizacion();
  }

  ngOnInit(): void {
    this.cargarLotes();
  }

  crearFormularioCotizacion(): FormGroup {
    return this.fb.group({
      nombreCliente: ['', Validators.required],
      contactoCliente: ['', Validators.required],
      detalle: [''],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      precioOfertado: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['PENDIENTE'],
    });
  }

  cargarLotes(): void {
    const urbanizacionActiva = this.urbanizacionContext.urbanizacion();

    this.loteSvc.getAll().subscribe({
      next: (response: any) => {
        let lotes: any[] = [];

        if (response.data && Array.isArray(response.data)) {
          lotes = response.data;
        } else if (Array.isArray(response)) {
          lotes = response;
        } else {
          this.notificationService.showWarning('No se pudieron cargar los lotes');
          return;
        }

        let lotesDisponibles = lotes.filter(
          (lote) => lote.estado === 'DISPONIBLE' || lote.estado === 'CON_OFERTA'
        );

        if (urbanizacionActiva) {
          lotesDisponibles = lotesDisponibles.filter(
            (lote) => lote.urbanizacion?.id === urbanizacionActiva.id
          );
        }

        this.lotes.set(lotesDisponibles);

        if (lotesDisponibles.length === 0) {
          this.notificationService.showWarning('No hay lotes disponibles para cotización');
        }
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los lotes disponibles');
      },
    });
  }

  filteredLotes() {
    const search = this.searchLote().toLowerCase();
    if (!search) return this.lotes();

    return this.lotes().filter(
      (lote) =>
        lote.numeroLote?.toLowerCase().includes(search) ||
        lote.urbanizacion?.nombre?.toLowerCase().includes(search) ||
        this.formatMonto(lote.precioBase)?.toLowerCase().includes(search)
    );
  }

  selectLote(lote: LoteDto) {
    this.cotizacionForm.patchValue({
      inmuebleId: lote.id.toString(),
    });
    this.searchLote.set(
      `${lote.numeroLote} - ${lote.urbanizacion?.nombre} - $${this.formatMonto(lote.precioBase)}`
    );
    this.showLotesDropdown.set(false);
  }

  toggleLotesDropdown() {
    this.showLotesDropdown.set(!this.showLotesDropdown());
  }

  onLoteBlur() {
    setTimeout(() => {
      this.showLotesDropdown.set(false);
    }, 200);
  }

  onSubmit(): void {
    if (this.cotizacionForm.invalid) {
      this.cotizacionForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    const rolesPermitidos = ['ASESOR', 'ADMINISTRADOR', 'SECRETARIA'];

    if (!currentUser || !rolesPermitidos.includes(currentUser.role)) {
      this.notificationService.showError(
        'Solo los asesores, administradores y secretarias pueden crear cotizaciones'
      );
      return;
    }

    this.enviando.set(true);

    const cotizacionData = {
      ...this.cotizacionForm.value,
      inmuebleId: Number(this.cotizacionForm.value.inmuebleId),
      precioOfertado: Number(this.cotizacionForm.value.precioOfertado),
      inmuebleTipo: 'LOTE',
    };

    this.cotizacionSvc.create(cotizacionData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);

        if (response.success) {
          this.notificationService.showSuccess('Cotización creada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/cotizaciones/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al crear la cotización');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);

        let errorMessage = 'Error al crear la cotización';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 403) {
          errorMessage =
            'No tienes permisos para crear cotizaciones. Se requiere rol de ASESOR, ADMINISTRADOR o SECRETARIA';
        } else if (err.status === 404) {
          errorMessage = 'Lote no encontrado';
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