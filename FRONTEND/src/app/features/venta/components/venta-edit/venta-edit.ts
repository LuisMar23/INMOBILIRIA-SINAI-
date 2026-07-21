import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { PropiedadDto } from '../../../../core/interfaces/propiedad.interface';
import { Caja } from '../../../../core/interfaces/caja.interface';
import { LoteService } from '../../../lote/service/lote.service';
import { PropiedadService } from '../../../propiedad/service/propiedad.service';
import { AuthService } from '../../../../components/services/auth.service';
import { VentaService } from '../../service/venta.service';
import { ReciboService, Recibo } from '../../../../core/services/recibo.service';
import {
  VentaDto,
  UpdateVentaDto,
  RegistrarPagoDto,
  Cuota,
} from '../../../../core/interfaces/venta.interface';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';

@Component({
  selector: 'app-venta-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './venta-edit.html',
  providers: [DatePipe],
})
export class VentaEdit implements OnInit {
  ventaForm: FormGroup;
  pagoForm: FormGroup;
  montoInicialForm: FormGroup;

  ventaId = signal<number | null>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  enviandoPago = signal<boolean>(false);
  enviandoEditarPago = signal<boolean>(false);
  enviandoMontoInicial = signal<boolean>(false);
  ventaData = signal<VentaDto | null>(null);

  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  propiedades = signal<PropiedadDto[]>([]);
  cajasActivas = signal<Caja[]>([]);

  mostrarFormPago = signal<boolean>(false);
  mostrarFormEditarPago = signal<boolean>(false);
  mostrarFormMontoInicial = signal<boolean>(false);
  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  searchPropiedad = signal<string>('');
  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);
  showPropiedadesDropdown = signal<boolean>(false);

  pagoSeleccionado = signal<any>(null);

  archivosSeleccionados = signal<File[]>([]);
  maxArchivos = 6;
  archivosCargando = signal<boolean>(false);

  recibosVenta = signal<Recibo[]>([]);
  recibosCargando = signal<boolean>(true);

  cronograma = signal<Cuota[]>([]);
asesores = signal<UserDto[]>([]);
searchAsesor = signal<string>('');
showAsesoresDropdown = signal<boolean>(false);
// ── Bloque Principal ──
mostrarFormPrincipal = signal<boolean>(false);
enviandoPrincipal = signal<boolean>(false);
principalForm: FormGroup;
adicionalForm: FormGroup;

// ── Bloque Adicional ──
mostrarFormAdicional = signal<boolean>(false);
enviandoAdicional = signal<boolean>(false);
filteredAsesores = computed(() => {
  const search = this.searchAsesor().toLowerCase();
  const asesores = this.asesores();
  if (!search) return asesores;
  return asesores.filter(
    (a) =>
      a.fullName?.toLowerCase().includes(search) ||
      (a.email && a.email.toLowerCase().includes(search)),
  );
});

// Solo un ADMINISTRADOR puede reasignar el asesor (regla igual que el backend)
esAdministrador = computed(() => this.authService.getCurrentUser()?.role === 'ADMINISTRADOR');
  filteredClientes = computed(() => {
    const search = this.searchCliente().toLowerCase();
    const clientes = this.clientes();
    if (!search) return clientes;
    return clientes.filter(
      (cliente) =>
        cliente.fullName?.toLowerCase().includes(search) ||
        (cliente.ci && cliente.ci.toLowerCase().includes(search)) ||
        (cliente.email && cliente.email.toLowerCase().includes(search)),
    );
  });

  filteredLotes = computed(() => {
    const search = this.searchLote().toLowerCase();
    const lotes = this.lotes();
    if (!search) return lotes;
    return lotes.filter(
      (lote) =>
        lote.numeroLote?.toLowerCase().includes(search) ||
        (lote.urbanizacion?.nombre && lote.urbanizacion.nombre.toLowerCase().includes(search)) ||
        lote.precioBase?.toString().includes(search),
    );
  });

  filteredPropiedades = computed(() => {
    const search = this.searchPropiedad().toLowerCase();
    const propiedades = this.propiedades();
    if (!search) return propiedades;
    return propiedades.filter(
      (propiedad) =>
        propiedad.nombre?.toLowerCase().includes(search) ||
        propiedad.ubicacion?.toLowerCase().includes(search) ||
        propiedad.ciudad?.toLowerCase().includes(search) ||
        propiedad.tipo?.toLowerCase().includes(search) ||
        propiedad.precio?.toString().includes(search),
    );
  });

  tienePlanPago = computed(() => {
    const venta = this.ventaData();
    return !!venta?.planPago;
  });

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
    if (!planPago) return 0;
    if (planPago.porcentaje_pagado !== undefined && planPago.porcentaje_pagado !== null) {
      return Number(planPago.porcentaje_pagado);
    }
    const total = Number(planPago.total || 0);
    if (total === 0) return 0;
    return (this.totalPagado() / total) * 100;
  });

  montoMaximoPago = computed(() => {
    return this.saldoPendiente();
  });

  private router = inject(Router);
  private fb = inject(FormBuilder);
  private ventaSvc = inject(VentaService);
  private loteSvc = inject(LoteService);
  private propiedadSvc = inject(PropiedadService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);
  private authService = inject(AuthService);
  private reciboSvc = inject(ReciboService);
  private urbanizacionContext = inject(UrbanizacionContextService);

  constructor() {
    this.ventaForm = this.crearFormularioVenta();
    this.pagoForm = this.crearPagoForm();
    this.montoInicialForm = this.crearMontoInicialForm();
      this.principalForm = this.crearPrincipalForm();       // 👈 nuevo
  this.adicionalForm = this.crearAdicionalForm(); 
  }

  ngOnInit(): void {
    this.obtenerVenta();
    this.cargarCajasActivas();
      if (this.esAdministrador()) {
    this.cargarAsesores();
  }
  }

  crearFormularioVenta(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
        asesorId: [''],
      precioFinal: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['PENDIENTE'],
      observaciones: [''],
    });
  }
  crearPrincipalForm(): FormGroup {
  return this.fb.group({
    modalidad: ['', Validators.required],
    numeroCuotas: [null, [Validators.required, Validators.min(1)]],
    fechaPrimeraCuota: ['', Validators.required],
  });
}

crearAdicionalForm(): FormGroup {
  const hoy = new Date().toISOString().split('T')[0];
  return this.fb.group({
    activo: [false],
    montoAdicional: [0, [Validators.min(0)]],
    modalidad: [''],
    cantidadPagos: [null],
    fechaInicio: [hoy],
  });
}
tieneCuotasTocadas(tipo: 'INICIAL' | 'PRINCIPAL' | 'ADICIONAL'): boolean {
  return this.cronograma().some(
    (c: any) => c.tipo === tipo && ['PAGADA', 'PARCIAL'].includes(c.estado),
  );
}
editarPrincipal(): void {
  const venta = this.ventaData();
  if (!venta?.planPago) {
    this.notificationService.showError('No hay plan de pago para esta venta.');
    return;
  }

  if (this.tieneCuotasTocadas('PRINCIPAL')) {
    this.notificationService.showError(
      'No se puede editar el Principal: ya tiene cuotas pagadas o con abono parcial.',
    );
    return;
  }

  const plan = venta.planPago;
  this.principalForm.patchValue({
    modalidad: plan.modalidadPrincipal || '',
    numeroCuotas: plan.numeroCuotas || plan.cantidad_cuotas_principal || null,
    fechaPrimeraCuota: plan.fechaPrimeraCuota
      ? new Date(plan.fechaPrimeraCuota).toISOString().split('T')[0]
      : '',
  });

  this.mostrarFormPrincipal.set(true);
}

actualizarPrincipal(): void {
  if (this.principalForm.invalid) {
    this.principalForm.markAllAsTouched();
    this.notificationService.showError('Complete todos los campos del Principal correctamente.');
    return;
  }

  const venta = this.ventaData();
  const planPagoId = venta?.planPago?.id_plan_pago;
  if (!planPagoId) {
    this.notificationService.showError('No se encontró el plan de pago.');
    return;
  }

  this.enviandoPrincipal.set(true);
  const raw = this.principalForm.value;

  const payload = {
    principal: {
      modalidad: raw.modalidad,
      numeroCuotas: Number(raw.numeroCuotas),
      fechaPrimeraCuota: raw.fechaPrimeraCuota,
    },
  };

  this.ventaSvc.actualizarPlanPago(planPagoId, payload).subscribe({
    next: (response: any) => {
      this.enviandoPrincipal.set(false);
      if (response.success) {
        this.notificationService.showSuccess('Bloque Principal actualizado exitosamente!');
        this.mostrarFormPrincipal.set(false);
        this.obtenerVenta();
      } else {
        this.notificationService.showError(response.message || 'Error al actualizar el Principal');
      }
    },
    error: (err: any) => {
      this.enviandoPrincipal.set(false);
      console.error('Error al actualizar Principal:', err);
      let errorMessage = 'Error al actualizar el Principal';
      if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.status === 400) {
        errorMessage = 'Datos inválidos para el Principal.';
      }
      this.notificationService.showError(errorMessage);
    },
  });
}

cancelarEdicionPrincipal(): void {
  this.mostrarFormPrincipal.set(false);
  this.principalForm.reset({
    modalidad: '',
    numeroCuotas: null,
    fechaPrimeraCuota: '',
  });
}
editarAdicional(): void {
  const venta = this.ventaData();
  if (!venta?.planPago) {
    this.notificationService.showError('No hay plan de pago para esta venta.');
    return;
  }

  if (this.tieneCuotasTocadas('ADICIONAL')) {
    this.notificationService.showError(
      'No se puede editar el Adicional: ya tiene cuotas pagadas o con abono parcial.',
    );
    return;
  }

  const plan = venta.planPago;
  this.adicionalForm.patchValue({
    activo: !!plan.tieneAdicional,
    montoAdicional: plan.montoAdicional || 0,
    modalidad: plan.modalidadAdicional || '',
    cantidadPagos: plan.cantidadPagosAdicional || null,
    fechaInicio: plan.fechaInicioAdicional
      ? new Date(plan.fechaInicioAdicional).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  });

  this.actualizarDisabledAdicional();
  this.mostrarFormAdicional.set(true);
}

onToggleActivoAdicional(): void {
  this.actualizarDisabledAdicional();
}

private actualizarDisabledAdicional(): void {
  const activo = this.adicionalForm.get('activo')?.value;
  ['montoAdicional', 'modalidad', 'cantidadPagos', 'fechaInicio'].forEach((campo) => {
    activo
      ? this.adicionalForm.get(campo)?.enable()
      : this.adicionalForm.get(campo)?.disable();
  });
}

actualizarAdicional(): void {
  if (this.adicionalForm.invalid) {
    this.adicionalForm.markAllAsTouched();
    this.notificationService.showError('Complete todos los campos del Adicional correctamente.');
    return;
  }

  const venta = this.ventaData();
  const planPagoId = venta?.planPago?.id_plan_pago;
  if (!planPagoId) {
    this.notificationService.showError('No se encontró el plan de pago.');
    return;
  }

  const raw = this.adicionalForm.getRawValue();
  const activo = !!raw.activo;

  if (activo && (!raw.montoAdicional || !raw.modalidad || !raw.cantidadPagos || !raw.fechaInicio)) {
    this.notificationService.showError(
      'Si el Adicional está activo, indique monto, modalidad, cantidad de pagos y fecha de inicio.',
    );
    return;
  }

  this.enviandoAdicional.set(true);

  const payload = {
    adicional: {
      activo,
      ...(activo
        ? {
            montoAdicional: Number(raw.montoAdicional),
            modalidad: raw.modalidad,
            cantidadPagos: Number(raw.cantidadPagos),
            fechaInicio: raw.fechaInicio,
          }
        : {}),
    },
  };

  this.ventaSvc.actualizarPlanPago(planPagoId, payload).subscribe({
    next: (response: any) => {
      this.enviandoAdicional.set(false);
      if (response.success) {
        this.notificationService.showSuccess('Bloque Adicional actualizado exitosamente!');
        this.mostrarFormAdicional.set(false);
        this.obtenerVenta();
      } else {
        this.notificationService.showError(response.message || 'Error al actualizar el Adicional');
      }
    },
    error: (err: any) => {
      this.enviandoAdicional.set(false);
      console.error('Error al actualizar Adicional:', err);
      let errorMessage = 'Error al actualizar el Adicional';
      if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.status === 400) {
        errorMessage = 'Datos inválidos para el Adicional.';
      }
      this.notificationService.showError(errorMessage);
    },
  });
}

cancelarEdicionAdicional(): void {
  this.mostrarFormAdicional.set(false);
  this.adicionalForm.reset({
    activo: false,
    montoAdicional: 0,
    modalidad: '',
    cantidadPagos: null,
    fechaInicio: new Date().toISOString().split('T')[0],
  });
}
cargarAsesores(): void {
  this.authService.getAsesores().subscribe({
    next: (response: any) => {
      let usuarios: any[] = [];
      if (response.data && Array.isArray(response.data.users)) {
        usuarios = response.data.users;
      } else if (response.data && Array.isArray(response.data)) {
        usuarios = response.data;
      } else if (Array.isArray(response)) {
        usuarios = response;
      }

      const asesoresFiltrados = usuarios.filter(
        (u) => u.isActive && (u.role === 'ADMINISTRADOR' || u.role === 'ASESOR'),
      );

      this.asesores.set(asesoresFiltrados);
      const venta = this.ventaData();
      if (venta) {
        this.setupSearchValues(venta);
      }
    },
    error: (err: any) => {
      console.error('Error cargando asesores:', err);
      this.notificationService.showError('No se pudieron cargar los asesores');
    },
  });
}
selectAsesor(asesor: UserDto) {
  this.ventaForm.patchValue({ asesorId: asesor.id.toString() });
  this.searchAsesor.set(asesor.fullName || '');
  this.showAsesoresDropdown.set(false);
}

toggleAsesoresDropdown() {
  const abriendo = !this.showAsesoresDropdown();
  this.showAsesoresDropdown.set(abriendo);
  if (abriendo) {
    this.showClientesDropdown.set(false);
    this.showLotesDropdown.set(false);
    this.showPropiedadesDropdown.set(false);
    // 👇 limpia el filtro para que se vean TODOS los asesores al abrir
    this.searchAsesor.set('');
  }
}

onAsesorBlur() {
  setTimeout(() => {
    this.showAsesoresDropdown.set(false);
    // 👇 si no seleccionó nada nuevo, restaura el nombre del asesor actual
    const asesorIdActual = this.ventaForm.get('asesorId')?.value;
    if (asesorIdActual) {
      const asesor = this.asesores().find((a) => a.id.toString() === asesorIdActual.toString());
      if (asesor) {
        this.searchAsesor.set(asesor.fullName || '');
      }
    } else {
      this.searchAsesor.set('');
    }
  }, 200);
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

  // REESCRITO: antes era un solo numero (nuevoMontoInicial). Ahora el
  // backend (actualizarMontoInicialPlanPago) espera un PlanInicialDto
  // completo: montoInicial + fraccionado + (si fraccionado) modalidad,
  // cantidadPagos y fechaInicio, igual que en la creacion de la venta.
  crearMontoInicialForm(): FormGroup {
    const hoy = new Date().toISOString().split('T')[0];
    return this.fb.group({
      nuevoMontoInicial: [0, [Validators.required, Validators.min(0)]],
      fraccionado: [false],
      modalidad: [''],
      cantidadPagos: [null],
      fechaInicio: [hoy],
      cajaId: ['', Validators.required],
    });
  }

  cargarCajasActivas(): void {
    this.ventaSvc.obtenerCajasActivas().subscribe({
      next: (cajas) => {
        this.cajasActivas.set(cajas);
      },
      error: (err) => {
        console.error('Error cargando cajas activas:', err);
      },
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
        } else if (response.success && response.data) {
          clientes = response.data.clientes || response.data.users || response.data || [];
        }
        this.clientes.set(clientes);
        const venta = this.ventaData();
        if (venta) {
          this.setupSearchValues(venta);
        }
      },
      error: (err: any) => {
        console.error('Error cargando clientes:', err);
        this.notificationService.showError('No se pudieron cargar los clientes');
      },
    });
  }

  cargarLotes(): void {
    const currentUser = this.authService.getCurrentUser();
    const urbanizacionActiva = this.urbanizacionContext.urbanizacion();
    const ventaActual = this.ventaData();
    const loteActualId = ventaActual?.inmuebleId;

    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        let lotesFiltrados = lotes.filter((lote) => lote.encargadoId === currentUser?.id);
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
        if (ventaActual) {
          this.setupSearchValues(ventaActual);
        }
      },
      error: (err: any) => {
        console.error('Error cargando lotes:', err);
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  cargarPropiedades(): void {
    const currentUser = this.authService.getCurrentUser();
    const urbanizacionActiva = this.urbanizacionContext.urbanizacion();
    const ventaActual = this.ventaData();
    const propiedadActualId = ventaActual?.inmuebleId;

    this.propiedadSvc.getAll().subscribe({
      next: (propiedades: PropiedadDto[]) => {
        let propiedadesParaVenta = propiedades.filter(
          (propiedad) =>
            propiedad.estadoPropiedad === 'VENTA' &&
            (propiedad.tipo === 'CASA' || propiedad.tipo === 'DEPARTAMENTO') &&
            propiedad.encargadoId === currentUser?.id,
        );
        if (urbanizacionActiva) {
          propiedadesParaVenta = propiedadesParaVenta.filter(
            (propiedad) => propiedad.urbanizacion?.id === urbanizacionActiva.id
          );
        }
        if (propiedadActualId) {
          const propiedadActual = propiedades.find(p => p.id === propiedadActualId);
          if (propiedadActual && !propiedadesParaVenta.some(p => p.id === propiedadActualId)) {
            propiedadesParaVenta = [...propiedadesParaVenta, propiedadActual];
          }
        }
        this.propiedades.set(propiedadesParaVenta);
        if (ventaActual) {
          this.setupSearchValues(ventaActual);
        }
      },
      error: (err: any) => {
        console.error('Error cargando propiedades:', err);
        this.notificationService.showError('No se pudieron cargar las propiedades');
      },
    });
  }

  selectCliente(cliente: UserDto) {
    this.ventaForm.patchValue({
      clienteId: cliente.id.toString(),
    });
    this.searchCliente.set(cliente.fullName || '');
    this.showClientesDropdown.set(false);
  }

  selectLote(lote: LoteDto) {
    this.ventaForm.patchValue({
      inmuebleId: lote.id.toString(),
    });
    this.searchLote.set(this.getLoteDisplayText(lote));
    this.showLotesDropdown.set(false);
  }

  selectPropiedad(propiedad: PropiedadDto) {
    this.ventaForm.patchValue({
      inmuebleId: propiedad.id.toString(),
    });
    this.searchPropiedad.set(this.getPropiedadDisplayText(propiedad));
    this.showPropiedadesDropdown.set(false);
  }

  getLoteDisplayText(lote: LoteDto): string {
    return `${lote.numeroLote} - ${lote.urbanizacion?.nombre} - $${this.formatNumber(
      lote.precioBase,
    )}`;
  }

  getPropiedadDisplayText(propiedad: PropiedadDto): string {
    return `${propiedad.nombre} - ${propiedad.tipo} - ${propiedad.ubicacion} - $${this.formatNumber(
      propiedad.precio,
    )}`;
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-BO');
  }

toggleClientesDropdown() {
  const abriendo = !this.showClientesDropdown();
  this.showClientesDropdown.set(abriendo);
  if (abriendo) {
    this.showLotesDropdown.set(false);
    this.showPropiedadesDropdown.set(false);
    this.showAsesoresDropdown.set(false);
    this.searchCliente.set('');
  }
}

toggleLotesDropdown() {
  const abriendo = !this.showLotesDropdown();
  this.showLotesDropdown.set(abriendo);
  if (abriendo) {
    this.showClientesDropdown.set(false);
    this.showPropiedadesDropdown.set(false);
    this.showAsesoresDropdown.set(false);
    this.searchLote.set('');
  }
}

togglePropiedadesDropdown() {
  const abriendo = !this.showPropiedadesDropdown();
  this.showPropiedadesDropdown.set(abriendo);
  if (abriendo) {
    this.showClientesDropdown.set(false);
    this.showLotesDropdown.set(false);
    this.showAsesoresDropdown.set(false);
    this.searchPropiedad.set('');
  }
}

onClienteBlur() {
  setTimeout(() => {
    this.showClientesDropdown.set(false);
    const clienteIdActual = this.ventaForm.get('clienteId')?.value;
    if (clienteIdActual) {
      const cliente = this.clientes().find((c) => c.id.toString() === clienteIdActual.toString());
      if (cliente) {
        this.searchCliente.set(cliente.fullName || '');
      }
    } else {
      this.searchCliente.set('');
    }
  }, 200);
}

onLoteBlur() {
  setTimeout(() => {
    this.showLotesDropdown.set(false);
    const inmuebleIdActual = this.ventaForm.get('inmuebleId')?.value;
    if (inmuebleIdActual && this.ventaForm.get('inmuebleTipo')?.value === 'LOTE') {
      const lote = this.lotes().find((l) => l.id.toString() === inmuebleIdActual.toString());
      if (lote) {
        this.searchLote.set(this.getLoteDisplayText(lote));
      }
    } else {
      this.searchLote.set('');
    }
  }, 200);
}

onPropiedadBlur() {
  setTimeout(() => {
    this.showPropiedadesDropdown.set(false);
    const inmuebleIdActual = this.ventaForm.get('inmuebleId')?.value;
    if (inmuebleIdActual && this.ventaForm.get('inmuebleTipo')?.value === 'PROPIEDAD') {
      const propiedad = this.propiedades().find((p) => p.id.toString() === inmuebleIdActual.toString());
      if (propiedad) {
        this.searchPropiedad.set(this.getPropiedadDisplayText(propiedad));
      }
    } else {
      this.searchPropiedad.set('');
    }
  }, 200);
}

  obtenerVenta(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('ID de venta no valido');
      this.cargando.set(false);
      return;
    }
    this.ventaId.set(id);
    this.cargando.set(true);
    this.ventaSvc.getById(id).subscribe({
      next: (venta: VentaDto) => {
        if (venta) {
          this.ventaData.set(venta);
          this.cargarDatosFormulario(venta);
          this.cargarClientes();
          this.cargarLotes();
          this.cargarPropiedades();
          this.cargarRecibosVenta(id);
          this.cargarCronograma(id);
        } else {
          this.error.set('No se encontro la venta');
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

  cargarDatosFormulario(venta: VentaDto): void {
    this.ventaForm.patchValue({
      clienteId: venta.clienteId?.toString() || '',
          asesorId: venta.asesorId?.toString() || '', 
      inmuebleTipo: venta.inmuebleTipo || 'LOTE',
      inmuebleId: venta.inmuebleId?.toString() || '',
      precioFinal: venta.precioFinal || 0,
      estado: venta.estado || 'PENDIENTE',
      observaciones: venta.observaciones || '',
    });
    this.cargando.set(false);
  }

  setupSearchValues(venta: VentaDto): void {
    const cliente = this.clientes().find((c) => c.id === venta.clienteId);
    if (cliente) {
      this.searchCliente.set(cliente.fullName || '');
    }

      const asesor = this.asesores().find((a) => a.id === venta.asesorId);
  if (asesor) {
    this.searchAsesor.set(asesor.fullName || ''); // 👈 agregar esto
  }

    if (venta.inmuebleTipo === 'LOTE') {
      const lote = this.lotes().find((l) => l.id === venta.inmuebleId);
      if (lote) {
        this.searchLote.set(this.getLoteDisplayText(lote));
      }
    } else if (venta.inmuebleTipo === 'PROPIEDAD') {
      const propiedad = this.propiedades().find((p) => p.id === venta.inmuebleId);
      if (propiedad) {
        this.searchPropiedad.set(this.getPropiedadDisplayText(propiedad));
      }
    }
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      return this.datePipe.transform(date, 'dd/MM/yyyy') || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  onFileChange(event: any) {
    const files: FileList | null = event.target.files;
    if (files) {
      const nuevosArchivos = Array.from(files);
      const archivosActuales = this.archivosSeleccionados();
      const archivosFinales = [...archivosActuales, ...nuevosArchivos];

      if (archivosFinales.length > this.maxArchivos) {
        this.notificationService.showError(
          `Solo puedes subir un maximo de ${this.maxArchivos} archivos.`,
        );
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

    const ventaId = this.ventaId();
    if (!ventaId) {
      this.notificationService.showError('No se puede subir archivos: ID de venta no disponible.');
      return;
    }

    this.archivosCargando.set(true);

    const usuarioId = this.authService.getCurrentUser()?.id;
    if (!usuarioId) {
      this.notificationService.showError('No se pudo obtener el usuario autenticado.');
      this.archivosCargando.set(false);
      return;
    }

    this.reciboSvc
      .subirRecibosGenerales(this.archivosSeleccionados(), {
        tipoOperacion: 'VENTA',
        ventaId: ventaId,
        observaciones: 'Subido desde edicion de venta',
      })
      .subscribe({
        next: (response) => {
          this.archivosCargando.set(false);
          this.notificationService.showSuccess('Archivos subidos exitosamente.');
          this.archivosSeleccionados.set([]);
          this.cargarRecibosVenta(ventaId);
        },
        error: (error) => {
          this.archivosCargando.set(false);
          this.notificationService.showError(
            'Error al subir los archivos: ' + (error?.error?.message || 'Error desconocido'),
          );
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

  descargarRecibo(recibo: Recibo) {
    this.reciboSvc.descargarRecibo(recibo);
  }

  eliminarRecibo(recibo: Recibo) {
    this.notificationService
      .confirmDelete('¿Esta seguro que desea eliminar este archivo?')
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

  editarPago(pago: any): void {
    this.pagoSeleccionado.set(pago);
    this.mostrarFormEditarPago.set(true);
    this.mostrarFormPago.set(false);

    const fechaPago = pago.fecha_pago ? new Date(pago.fecha_pago) : new Date();
    const fechaFormateada = fechaPago.toISOString().split('T')[0];

    this.pagoForm.patchValue({
      monto: pago.monto,
      fecha_pago: fechaFormateada,
      observacion: pago.observacion || '',
      metodoPago: pago.metodoPago || 'EFECTIVO',
    });
  }

  actualizarPago(): void {
    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos del pago correctamente.');
      return;
    }

    const pagoId = this.pagoSeleccionado()?.id_pago_plan;
    if (!pagoId) {
      this.notificationService.showError('No se ha seleccionado un pago para editar.');
      return;
    }

    this.enviandoEditarPago.set(true);
    const updateData = {
      monto: Number(this.pagoForm.value.monto),
      fecha_pago: this.pagoForm.value.fecha_pago,
      observacion: this.pagoForm.value.observacion,
      metodoPago: this.pagoForm.value.metodoPago,
    };

    this.ventaSvc.actualizarPagoPlan(pagoId, updateData).subscribe({
      next: (response: any) => {
        this.enviandoEditarPago.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Pago actualizado exitosamente!');
          this.cancelarEdicionPago();
          this.obtenerVenta();
        } else {
          this.notificationService.showError(response.message || 'Error al actualizar el pago');
        }
      },
      error: (err: any) => {
        this.enviandoEditarPago.set(false);
        console.error('Error al actualizar pago:', err);
        let errorMessage = 'Error al actualizar el pago';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos invalidos para el pago. Verifique la fecha.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  eliminarPago(pago: any): void {
    this.ventaSvc.obtenerCajasActivas().subscribe({
      next: (cajas) => {
        if (cajas.length === 0) {
          this.notificationService.showError('No hay cajas disponibles para realizar la operacion');
          return;
        }

        const cajaId = cajas[0].id;

        this.notificationService
          .confirmDelete('¿Esta seguro que desea eliminar este pago?')
          .then((result) => {
            if (result.isConfirmed) {
              this.ventaSvc.eliminarPagoPlan(pago.id_pago_plan, cajaId).subscribe({
                next: (response: any) => {
                  if (response.success) {
                    this.notificationService.showSuccess('Pago eliminado exitosamente!');
                    this.obtenerVenta();
                  } else {
                    this.notificationService.showError(
                      response.message || 'Error al eliminar el pago',
                    );
                  }
                },
                error: (err: any) => {
                  console.error('Error al eliminar pago:', err);
                  this.notificationService.showError('Error al eliminar el pago');
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

  // REESCRITO: prellena TODO el bloque Inicial (no solo el monto), tomando
  // los valores actuales del PlanPago con el schema nuevo.
  editarMontoInicial(): void {
    const venta = this.ventaData();
    if (!venta?.planPago) {
      this.notificationService.showError('No hay plan de pago para esta venta.');
      return;
    }

    const plan = venta.planPago;
    this.montoInicialForm.patchValue({
      nuevoMontoInicial: plan.montoInicial || 0,
      fraccionado: !!plan.inicialFraccionado,
      modalidad: plan.modalidadInicial || '',
      cantidadPagos: plan.cantidadPagosInicial || null,
      fechaInicio: plan.fechaInicioInicial
        ? new Date(plan.fechaInicioInicial).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      cajaId: this.cajasActivas()[0]?.id?.toString() || '',
    });

    this.actualizarDisabledMontoInicial();
    this.mostrarFormMontoInicial.set(true);
  }

  // Habilita/deshabilita modalidad/cantidadPagos/fechaInicio segun el
  // toggle "fraccionado", igual que en la creacion de la venta.
  onToggleFraccionadoEdit(): void {
    this.actualizarDisabledMontoInicial();
  }

  private actualizarDisabledMontoInicial(): void {
    const fraccionado = this.montoInicialForm.get('fraccionado')?.value;
    ['modalidad', 'cantidadPagos', 'fechaInicio'].forEach((campo) => {
      fraccionado
        ? this.montoInicialForm.get(campo)?.enable()
        : this.montoInicialForm.get(campo)?.disable();
    });
  }

  // REESCRITO: ahora arma un PlanInicialDto completo y lo manda al
  // servicio, en vez de un numero suelto.
  actualizarMontoInicial(): void {
    if (this.montoInicialForm.invalid) {
      this.montoInicialForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos correctamente.');
      return;
    }

    const ventaId = this.ventaId();
    if (!ventaId) {
      this.notificationService.showError('ID de venta no valido.');
      return;
    }

    const raw = this.montoInicialForm.getRawValue();
    const nuevoMontoInicial = Number(raw.nuevoMontoInicial);
    const cajaId = Number(raw.cajaId);
    const fraccionado = !!raw.fraccionado;

    if (nuevoMontoInicial < 0) {
      this.notificationService.showError('El monto inicial no puede ser negativo.');
      return;
    }

    const precioFinal = this.ventaData()?.precioFinal || 0;
    if (nuevoMontoInicial > precioFinal) {
      this.notificationService.showError('El monto inicial no puede ser mayor al precio final.');
      return;
    }

    if (fraccionado && (!raw.modalidad || !raw.cantidadPagos || !raw.fechaInicio)) {
      this.notificationService.showError(
        'Si el Inicial es fraccionado, indique modalidad, cantidad de pagos y fecha de inicio.',
      );
      return;
    }

    this.enviandoMontoInicial.set(true);

    const nuevoInicial = {
      montoInicial: nuevoMontoInicial,
      fraccionado,
      ...(fraccionado
        ? {
            modalidad: raw.modalidad,
            cantidadPagos: Number(raw.cantidadPagos),
            fechaInicio: raw.fechaInicio,
          }
        : {}),
    };

    this.ventaSvc.actualizarMontoInicialPlanPago(ventaId, nuevoInicial, cajaId).subscribe({
      next: (response: any) => {
        this.enviandoMontoInicial.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Monto inicial actualizado exitosamente!');
          this.mostrarFormMontoInicial.set(false);
          this.obtenerVenta();
        } else {
          this.notificationService.showError(
            response.message || 'Error al actualizar el monto inicial',
          );
        }
      },
      error: (err: any) => {
        this.enviandoMontoInicial.set(false);
        console.error('Error al actualizar monto inicial:', err);
        let errorMessage = 'Error al actualizar el monto inicial';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos invalidos para el monto inicial.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  cancelarEdicionMontoInicial(): void {
    this.mostrarFormMontoInicial.set(false);
    this.montoInicialForm.reset({
      nuevoMontoInicial: 0,
      fraccionado: false,
      modalidad: '',
      cantidadPagos: null,
      fechaInicio: new Date().toISOString().split('T')[0],
      cajaId: '',
    });
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
        'La fecha de pago no puede ser mas de 90 dias en el futuro',
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
          this.cancelarEdicionPago();
          this.obtenerVenta();
        } else {
          this.notificationService.showError(response.message || 'Error al registrar el pago');
        }
      },
      error: (err: any) => {
        this.enviandoPago.set(false);
        let errorMessage = 'Error al registrar el pago';
        if (err.status === 400) {
          errorMessage = err.error?.message || 'Datos invalidos para el pago. Verifique la fecha.';
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  cancelarEdicionPago(): void {
    this.mostrarFormPago.set(false);
    this.mostrarFormEditarPago.set(false);
    this.pagoSeleccionado.set(null);

    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    this.pagoForm.patchValue({
      fecha_pago: fechaHoy,
      metodoPago: 'EFECTIVO',
      monto: 0,
      observacion: '',
    });
  }

  toggleFormPago(): void {
    this.mostrarFormPago.set(!this.mostrarFormPago());
    this.mostrarFormEditarPago.set(false);
    this.pagoSeleccionado.set(null);

    if (this.mostrarFormPago()) {
      const hoy = new Date();
      const fechaHoy = hoy.toISOString().split('T')[0];
      this.pagoForm.patchValue({
        fecha_pago: fechaHoy,
        metodoPago: 'EFECTIVO',
        monto: 0,
        observacion: '',
      });
    }
  }

  onSubmit(): void {
    if (this.ventaForm.invalid) {
      this.ventaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    const id = this.ventaId();
    if (!id) {
      this.notificationService.showError('ID de venta no valido.');
      return;
    }

    this.enviando.set(true);

    const dataActualizada: UpdateVentaDto = {};

    const clienteId = Number(this.ventaForm.get('clienteId')?.value);
    const precioFinal = Number(this.ventaForm.get('precioFinal')?.value);
    const estado = this.ventaForm.get('estado')?.value;
    const observaciones = this.ventaForm.get('observaciones')?.value;

    const ventaActual = this.ventaData();

    if (clienteId !== ventaActual?.clienteId) {
      dataActualizada.clienteId = clienteId;
    }

      if (this.esAdministrador()) {
    const asesorIdRaw = this.ventaForm.get('asesorId')?.value;
    const asesorId = asesorIdRaw ? Number(asesorIdRaw) : undefined;
    if (asesorId !== undefined && asesorId !== ventaActual?.asesorId) {
      dataActualizada.asesorId = asesorId;
    }
  }
    if (precioFinal !== ventaActual?.precioFinal) {
      dataActualizada.precioFinal = precioFinal;
    }

    if (estado !== ventaActual?.estado) {
      dataActualizada.estado = estado;
    }

    if (observaciones !== ventaActual?.observaciones) {
      dataActualizada.observaciones = observaciones;
    }

    if (Object.keys(dataActualizada).length === 0) {
      this.notificationService.showInfo('No se detectaron cambios para actualizar.');
      this.enviando.set(false);
      return;
    }

    this.ventaSvc.update(id, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Venta actualizada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/ventas/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al actualizar la venta');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al actualizar la venta';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos invalidos. Verifique la informacion ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Venta no encontrada.';
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
          this.notificationService.showError('No hay cajas disponibles para realizar la operacion');
          return;
        }

        const cajaId = cajas[0].id;

        this.notificationService
          .confirmDelete('¿Esta seguro que desea eliminar esta venta?')
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

  volverAlListado(): void {
    this.router.navigate(['/ventas/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }

  formatPrecio(precio: number): string {
    return precio.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

  getEstadoCuotaClass(estado: string): string {
    const classes: { [key: string]: string } = {
      PENDIENTE: 'bg-yellow-100 text-yellow-700',
      PAGADA: 'bg-green-100 text-green-700',
      VENCIDA: 'bg-red-100 text-red-700',
      PARCIAL: 'bg-blue-100 text-blue-700',
    };
    return classes[estado] || classes['PENDIENTE'];
  }
}