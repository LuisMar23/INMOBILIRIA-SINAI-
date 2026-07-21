import { Component, inject, signal, OnInit, ViewChild, computed, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { PropiedadDto } from '../../../../core/interfaces/propiedad.interface';
import { Caja } from '../../../../core/interfaces/caja.interface';
import { LoteService } from '../../../lote/service/lote.service';
import { PropiedadService } from '../../../propiedad/service/propiedad.service';
import { AuthService } from '../../../../components/services/auth.service';
import { VentaService } from '../../service/venta.service';
import {
  ModalConfig,
  SeleccionModalComponent,
} from '../../../../components/seleccion-modal/seleccion-modal';
import { VentaDto, Cuota } from '../../../../core/interfaces/venta.interface';
import { AnticipoPdfService } from '../../../../core/services/pdf-anticipo.service';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';

@Component({
  selector: 'app-venta-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SeleccionModalComponent],
  templateUrl: './venta-create.html',
})
export class VentaCreate implements OnInit {
  ventaForm: FormGroup;
  clienteNuevoForm: FormGroup;
  pagoForm: FormGroup;
  financiacionForm: FormGroup;
  asesores = signal<UserDto[]>([]);
  puedeElegirAsesor = signal<boolean>(false);
  // Voucher: archivo seleccionado + preview en base64 para mostrarlo (Imagen 4)
  voucherFile = signal<File | null>(null);
  voucherPreviewUrl = signal<string | null>(null);

  tipoVentaSignal = signal<string>('CONTADO');

  financiacionBloqueada = computed(() => this.tipoVentaSignal() !== 'CREDITO');
  enviando = signal<boolean>(false);
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  propiedades = signal<PropiedadDto[]>([]);
  cajas = signal<Caja[]>([]);
  mostrarModalPdf = signal<boolean>(false);
  ventaCreada = signal<VentaDto | null>(null);

  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  searchPropiedad = signal<string>('');
  searchCaja = signal<string>('');
  showCajasDropdown = signal<boolean>(false);

  modoCliente = signal<'existente' | 'nuevo'>('existente');
  inmuebleTipoSeleccionado = signal<string>('LOTE');

  // ─── Navegación por tabs (Datos / Lote(s) / Pago / Financiación) ───────
  activeTab = signal<'datos' | 'lote' | 'pago' | 'financiacion'>('datos');
  financiacionSubTab = signal<'inicial' | 'principal' | 'adicional'>('inicial');

  cronogramaEstimadoPrincipal = signal<CuotaEstimada[]>([]);
  cronogramaEstimadoInicial = signal<CuotaEstimada[]>([]);
  cronogramaEstimadoAdicional = signal<CuotaEstimada[]>([]);

  authService = inject(AuthService);
  router = inject(Router);
  private fb = inject(FormBuilder);
  private ventaSvc = inject(VentaService);
  private loteSvc = inject(LoteService);
  private propiedadSvc = inject(PropiedadService);
  private notificationService = inject(NotificationService);
  private anticipoPdfService = inject(AnticipoPdfService);
  private urbanizacionContext = inject(UrbanizacionContextService);

  constructor() {
    this.ventaForm = this.crearFormularioVenta();
    this.tipoVentaSignal.set(this.ventaForm.get('tipoVenta')?.value);
    this.clienteNuevoForm = this.crearClienteNuevoForm();
    this.pagoForm = this.crearPagoForm();
    this.financiacionForm = this.crearFinanciacionForm();

    effect(() => {
      this.calcularCronogramasEstimados();
    });
    effect(() => {
      this.urbanizacionContext.urbanizacion();
      this.cargarLotes();
      this.cargarPropiedades();
    });
  }
  ngOnInit(): void {
    this.cargarClientes();
    this.cargarCajasActivas();
    this.cargarAsesores();
    this.setupFormListeners();
  }
 cargarAsesores(): void {
  const currentUser = this.authService.getCurrentUser();
  const esAdminOSecretaria = ['ADMINISTRADOR', 'SECRETARIA'].includes(currentUser?.role);
  this.puedeElegirAsesor.set(esAdminOSecretaria);

  if (esAdminOSecretaria) {
    this.authService.getAllUsers().subscribe({
      next: (response) => {
        const usuarios = response.data?.users ?? [];

        const asesoresFiltrados = usuarios.filter(
          (u) => u.isActive && (u.role === 'ADMINISTRADOR' || u.role === 'ASESOR'),
        );

        this.asesores.set(asesoresFiltrados);
      },
      error: () => this.notificationService.showError('No se pudieron cargar los asesores'),
    });
  } else {
    this.ventaForm.patchValue({ asesorId: currentUser?.id });
    this.ventaForm.get('asesorId')?.disable();
  }
}
  crearFormularioVenta(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      asesorId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      precioFinal: [0, [Validators.required, Validators.min(0.01)]],
      cajaId: ['', Validators.required],
      estado: ['PENDIENTE'],
      observaciones: [''],
      // Nuevo: define si se muestra/exige el Plan de Pagos
      tipoVenta: ['CONTADO', Validators.required],
    });
  }

  crearClienteNuevoForm(): FormGroup {
    return this.fb.group({
      fullName: [''],
      ci: [''],
      telefono: [''],
      email: [''],
      direccion: [''],
    });
  }

  // ─── Form de Pago (Banco/Comprobante/Voucher — Imagen 4) ───────────────
  crearPagoForm(): FormGroup {
    const ahora = new Date();
    const fechaHora = this.toLocalDatetimeInputValue(ahora);
    return this.fb.group({
      comprobante: ['RECIBO_INTERNO', Validators.required],
      numeroComprobante: ['', Validators.required],
      formaPago: ['', Validators.required],
      ventaSinPagoInmediato: [false],
      fechaHoraPago: [fechaHora, Validators.required],
      codigoOperacion: [''],
      observacionPago: [''],
      montoPagadoHoy: [0, [Validators.required, Validators.min(0.01)]],
    });
  }
  //antiguo q funciona bien
  // onToggleVentaSinPagoInmediato(): void {
  //   const sinPago = this.pagoForm.get('ventaSinPagoInmediato')?.value;
  //   ['comprobante', 'numeroComprobante', 'formaPago', 'fechaHoraPago'].forEach(
  //     (campo) => {
  //       sinPago ? this.pagoForm.get(campo)?.disable() : this.pagoForm.get(campo)?.enable();
  //     },
  //   );
  //   if (sinPago) {
  //     this.limpiarVoucher();
  //   }
  // }
  onToggleVentaSinPagoInmediato(): void {
    const sinPago = this.pagoForm.get('ventaSinPagoInmediato')?.value;

    ['comprobante', 'numeroComprobante', 'formaPago', 'fechaHoraPago', 'montoPagadoHoy'].forEach(
      (campo) => {
        const control = this.pagoForm.get(campo);
        sinPago ? control?.disable() : control?.enable();
      },
    );

    const inicialGroup = this.financiacionForm.get('inicial') as FormGroup;

    if (sinPago) {
      this.limpiarVoucher();
      this.pagoForm.get('montoPagadoHoy')?.setValue(0);

      // Venta de confianza: tampoco se cobra Inicial
      inicialGroup?.patchValue({ montoInicial: 0, fraccionado: false });
      inicialGroup?.get('montoInicial')?.disable();
      this.actualizarDisabledInternos(); // fraccionado=false ya deshabilita modalidad/cantidadPagos/fechaInicio
    } else {
      inicialGroup?.get('montoInicial')?.enable();

      if (this.ventaForm.get('tipoVenta')?.value === 'CONTADO') {
        const precio = Number(this.ventaForm.get('precioFinal')?.value) || 0;
        this.pagoForm.get('montoPagadoHoy')?.setValue(precio);
      }
    }
  }
  // Monto que se muestra como "Monto Total Venta" (informativo, no editable)
  getMontoTotalPago(): number {
    const tipoVenta = this.ventaForm.get('tipoVenta')?.value;
    if (tipoVenta === 'CREDITO') {
      // En crédito, lo que se cobra AHORA en esta pestaña es el Inicial,
      // no el precio total de la venta
      return Number(this.financiacionForm.get('inicial.montoInicial')?.value) || 0;
    }
    // En contado, se cobra el precio final completo
    return Number(this.ventaForm.get('precioFinal')?.value) || 0;
  }

  onVoucherSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.notificationService.showError('El voucher debe ser una imagen (jpg, png, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notificationService.showError('La imagen del voucher no debe superar 5MB');
      return;
    }

    this.voucherFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.voucherPreviewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  limpiarVoucher(): void {
    this.voucherFile.set(null);
    this.voucherPreviewUrl.set(null);
  }

  // ─── Form de Financiación: 3 bloques (Inicial / Principal / Adicional) ──
  crearFinanciacionForm(): FormGroup {
    const hoy = new Date().toISOString().split('T')[0];
    return this.fb.group({
      inicial: this.fb.group({
        montoInicial: [0, [Validators.required, Validators.min(0)]],
        fraccionado: [false],
        modalidad: [''],
        cantidadPagos: [null],
        fechaInicio: [hoy],
      }),
      principal: this.fb.group({
        modalidad: ['', Validators.required],
        numeroCuotas: [null, [Validators.required, Validators.min(1)]],
        fechaPrimeraCuota: [hoy, Validators.required],
      }),
      adicional: this.fb.group({
        activo: [false],
        montoAdicional: [0],
        modalidad: [''],
        cantidadPagos: [null],
        fechaInicio: [hoy],
      }),
    });
  }

  toggleModoCliente(modo: 'existente' | 'nuevo'): void {
    this.modoCliente.set(modo);
    if (modo === 'nuevo') {
      this.ventaForm.get('clienteId')?.clearValidators();
      this.ventaForm.get('clienteId')?.setValue('');
      this.ventaForm.get('clienteId')?.updateValueAndValidity();
      this.searchCliente.set('');
      ['fullName', 'ci', 'telefono'].forEach((campo) => {
        this.clienteNuevoForm.get(campo)?.setValidators([Validators.required]);
        this.clienteNuevoForm.get(campo)?.updateValueAndValidity();
      });
    } else {
      this.ventaForm.get('clienteId')?.setValidators([Validators.required]);
      this.ventaForm.get('clienteId')?.updateValueAndValidity();
      this.clienteNuevoForm.reset();
      ['fullName', 'ci', 'telefono'].forEach((campo) => {
        this.clienteNuevoForm.get(campo)?.clearValidators();
        this.clienteNuevoForm.get(campo)?.updateValueAndValidity();
      });
    }
  }

  // ─── Control de tabs ────────────────────────────────────────────────────
  irATab(tab: 'datos' | 'lote' | 'pago' | 'financiacion'): void {
    if (tab === 'financiacion' && this.financiacionBloqueada()) {
      this.notificationService.showError(
        'Seleccione "Crédito" como Tipo de Venta para configurar la Financiación',
      );
      return;
    }
    this.activeTab.set(tab);
  }

  irASubTabFinanciacion(sub: 'inicial' | 'principal' | 'adicional'): void {
    this.financiacionSubTab.set(sub);
  }

  setupFormListeners(): void {
    this.ventaForm.get('precioFinal')?.valueChanges.subscribe((precio) => {
      this.onPrecioFinalOTipoVentaChange();
      this.calcularCronogramasEstimados();

      // Si es CONTADO, el "monto pagado hoy" siempre debe igualar al precio final
      if (this.ventaForm.get('tipoVenta')?.value === 'CONTADO') {
        this.pagoForm.get('montoPagadoHoy')?.setValue(Number(precio) || 0);
      }
    });
    this.ventaForm.get('tipoVenta')?.valueChanges.subscribe((valor) => {
      this.tipoVentaSignal.set(valor);
      this.onPrecioFinalOTipoVentaChange();

      if (valor === 'CONTADO') {
        const precio = Number(this.ventaForm.get('precioFinal')?.value) || 0;
        this.pagoForm.get('montoPagadoHoy')?.setValue(precio);
      } else {
        this.pagoForm.get('montoPagadoHoy')?.setValue(0);
      }
    });
    this.ventaForm.get('inmuebleTipo')?.valueChanges.subscribe((tipo) => {
      this.inmuebleTipoSeleccionado.set(tipo);
      this.ventaForm.patchValue({ inmuebleId: '', precioFinal: 0 });
      this.searchLote.set('');
      this.searchPropiedad.set('');
    });
    this.financiacionForm.valueChanges.subscribe(() => {
      this.calcularCronogramasEstimados();
    });
    this.pagoForm.get('ventaSinPagoInmediato')?.valueChanges.subscribe(() => {
      this.onToggleVentaSinPagoInmediato();
    });
  }

  // Si pasa a CONTADO, deshabilita y limpia el form de financiación.
  // Si pasa a CRÉDITO, lo vuelve a habilitar.
  onPrecioFinalOTipoVentaChange(): void {
    const tipoVenta = this.ventaForm.get('tipoVenta')?.value;
    if (tipoVenta !== 'CREDITO') {
      this.financiacionForm.disable();
      if (this.activeTab() === 'financiacion') this.activeTab.set('datos');
    } else {
      this.financiacionForm.enable();
      this.actualizarDisabledInternos();
    }
  }

  // Dentro de Financiación, los campos de "cuántos pagos / modalidad / fecha"
  // del Inicial y del Adicional solo se habilitan si su toggle está activo —
  // igual que en el mock (switch "Crear un Plan de Pagos del Inicial" / "Añadir
  // un Plan de Pagos Adicional").
  actualizarDisabledInternos(): void {
    const inicialGroup = this.financiacionForm.get('inicial') as FormGroup;
    const fraccionado = inicialGroup.get('fraccionado')?.value;
    ['modalidad', 'cantidadPagos', 'fechaInicio'].forEach((campo) => {
      fraccionado ? inicialGroup.get(campo)?.enable() : inicialGroup.get(campo)?.disable();
    });

    const adicionalGroup = this.financiacionForm.get('adicional') as FormGroup;
    const activo = adicionalGroup.get('activo')?.value;
    ['montoAdicional', 'modalidad', 'cantidadPagos', 'fechaInicio'].forEach((campo) => {
      activo ? adicionalGroup.get(campo)?.enable() : adicionalGroup.get(campo)?.disable();
    });
  }

  onToggleInicialFraccionado(): void {
    this.actualizarDisabledInternos();
    this.calcularCronogramasEstimados();
  }

  onToggleAdicionalActivo(): void {
    this.actualizarDisabledInternos();
    this.calcularCronogramasEstimados();
  }

  // ─── Cálculo de montos y validación cruzada en vivo ────────────────────
  getMontoInicial(): number {
    return Number(this.financiacionForm.get('inicial.montoInicial')?.value) || 0;
  }

  getMontoAdicional(): number {
    const grupo = this.financiacionForm.get('adicional');
    if (!grupo?.get('activo')?.value) return 0;
    return Number(grupo.get('montoAdicional')?.value) || 0;
  }

  getMontoPrincipal(): number {
    const precioFinal = Number(this.ventaForm.get('precioFinal')?.value) || 0;
    return Math.max(0, precioFinal - this.getMontoInicial() - this.getMontoAdicional());
  }

  // true si Inicial + Adicional ya superan el precio final (error a mostrar)
  excedeElTotal(): boolean {
    const precioFinal = Number(this.ventaForm.get('precioFinal')?.value) || 0;
    return this.getMontoInicial() + this.getMontoAdicional() > precioFinal;
  }

  private generarCuotasPreview(
    montoTotal: number,
    modalidad: string,
    cantidadPagos: number,
    fechaInicioStr: string,
  ): CuotaEstimada[] {
    if (!montoTotal || !cantidadPagos || !modalidad || !fechaInicioStr) return [];
    const [anio, mes, dia] = fechaInicioStr.split('-').map(Number);
    const fechaBase = new Date(anio, mes - 1, dia);
    const montoPorCuota = montoTotal / cantidadPagos;
    const cuotas: CuotaEstimada[] = [];
    let suma = 0;

    for (let i = 0; i < cantidadPagos; i++) {
      const fecha = new Date(fechaBase);
      switch (modalidad) {
        case 'DIARIO':
          fecha.setDate(fecha.getDate() + i);
          break;
        case 'SEMANAL':
          fecha.setDate(fecha.getDate() + i * 7);
          break;
        case 'QUINCENAL':
          fecha.setDate(fecha.getDate() + i * 15);
          break;
        case 'MENSUAL':
          fecha.setMonth(fecha.getMonth() + i);
          break;
        case 'BIMESTRAL':
          fecha.setMonth(fecha.getMonth() + i * 2);
          break;
        case 'TRIMESTRAL':
          fecha.setMonth(fecha.getMonth() + i * 3);
          break;
        case 'SEMESTRAL':
          fecha.setMonth(fecha.getMonth() + i * 6);
          break;
        case 'ANUAL':
          fecha.setFullYear(fecha.getFullYear() + i);
          break;
      }
      let monto = montoPorCuota;
      if (i === cantidadPagos - 1) monto = montoTotal - suma;
      const y = fecha.getFullYear();
      const m = String(fecha.getMonth() + 1).padStart(2, '0');
      const d = String(fecha.getDate()).padStart(2, '0');
      cuotas.push({ numero: i + 1, fecha: `${y}-${m}-${d}`, monto: Number(monto.toFixed(2)) });
      suma += monto;
    }
    return cuotas;
  }

  calcularCronogramasEstimados(): void {
    if (this.financiacionBloqueada()) {
      this.cronogramaEstimadoInicial.set([]);
      this.cronogramaEstimadoPrincipal.set([]);
      this.cronogramaEstimadoAdicional.set([]);
      return;
    }

    const inicial = this.financiacionForm.get('inicial')?.value;
    const principal = this.financiacionForm.get('principal')?.value;
    const adicional = this.financiacionForm.get('adicional')?.value;

    this.cronogramaEstimadoInicial.set(
      inicial?.fraccionado
        ? this.generarCuotasPreview(
            this.getMontoInicial(),
            inicial.modalidad,
            inicial.cantidadPagos,
            inicial.fechaInicio,
          )
        : [],
    );

    this.cronogramaEstimadoPrincipal.set(
      this.generarCuotasPreview(
        this.getMontoPrincipal(),
        principal?.modalidad,
        principal?.numeroCuotas,
        principal?.fechaPrimeraCuota,
      ),
    );

    this.cronogramaEstimadoAdicional.set(
      adicional?.activo
        ? this.generarCuotasPreview(
            this.getMontoAdicional(),
            adicional.modalidad,
            adicional.cantidadPagos,
            adicional.fechaInicio,
          )
        : [],
    );
  }

  // ─── Carga de datos (sin cambios respecto a como ya lo tenías) ─────────
  cargarClientes(): void {
    this.authService.getClientes().subscribe({
      next: (response: any) => {
        let clientes: any[] = [];
        if (response.data && Array.isArray(response.data.clientes))
          clientes = response.data.clientes;
        else if (response.data && Array.isArray(response.data)) clientes = response.data;
        else if (Array.isArray(response)) clientes = response;
        this.clientes.set(clientes);
      },
      error: () => this.notificationService.showError('No se pudieron cargar los clientes'),
    });
  }

  cargarLotes(): void {
    const currentUser = this.authService.getCurrentUser();
    const rolesFullAccess = ['ADMINISTRADOR', 'SECRETARIA'];
    const urbanizacionActiva = this.urbanizacionContext.urbanizacion();
    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        let disponibles = lotes.filter(
          (l) => l.estado === 'DISPONIBLE' || l.estado === 'CON_OFERTA',
        );
        if (!rolesFullAccess.includes(currentUser?.role)) {
          disponibles = disponibles.filter(
            (l) => l.encargadoId?.toString() === currentUser?.id?.toString(),
          );
        }
        if (urbanizacionActiva) {
          disponibles = disponibles.filter((l) => l.urbanizacion?.id === urbanizacionActiva.id);
        }
        this.lotes.set(disponibles);
      },
      error: () => this.notificationService.showError('No se pudieron cargar los lotes'),
    });
  }

  cargarPropiedades(): void {
    const currentUser = this.authService.getCurrentUser();
    const urbanizacionActiva = this.urbanizacionContext.urbanizacion();
    this.propiedadSvc.getAll().subscribe({
      next: (propiedades: PropiedadDto[]) => {
        let filtradas = propiedades.filter(
          (p) =>
            p.estadoPropiedad === 'VENTA' &&
            (p.tipo === 'CASA' || p.tipo === 'DEPARTAMENTO') &&
            (p.estado === 'DISPONIBLE' || p.estado === 'CON_OFERTA') &&
            p.encargadoId === currentUser?.id,
        );
        if (urbanizacionActiva) {
          filtradas = filtradas.filter((p) => p.urbanizacion?.id === urbanizacionActiva.id);
        }
        this.propiedades.set(filtradas);
      },
      error: () => this.notificationService.showError('No se pudieron cargar las propiedades'),
    });
  }

  cargarCajasActivas(): void {
    this.ventaSvc.obtenerCajasActivas().subscribe({
      next: (cajas: Caja[]) => this.cajas.set(cajas),
      error: () => this.notificationService.showError('No se pudieron cargar las cajas activas'),
    });
  }

  filteredCajas() {
    const search = this.searchCaja().toLowerCase();
    if (!search) return this.cajas();
    return this.cajas().filter(
      (caja) =>
        caja.nombre?.toLowerCase().includes(search) ||
        caja.usuarioApertura?.fullName?.toLowerCase().includes(search),
    );
  }

  selectCliente(cliente: UserDto) {
    this.ventaForm.patchValue({ clienteId: cliente.id.toString() });
    this.searchCliente.set(cliente.fullName || '');
  }

  selectLote(lote: LoteDto) {
    this.ventaForm.patchValue({ inmuebleId: lote.id.toString(), precioFinal: lote.precioBase });
    this.searchLote.set(this.getLoteDisplayText(lote));
  }

  selectPropiedad(propiedad: PropiedadDto) {
    this.ventaForm.patchValue({
      inmuebleId: propiedad.id.toString(),
      precioFinal: propiedad.precio,
    });
    this.searchPropiedad.set(this.getPropiedadDisplayText(propiedad));
  }

  selectCaja(caja: Caja) {
    this.ventaForm.patchValue({ cajaId: caja.id.toString() });
    this.searchCaja.set(this.getCajaDisplayText(caja));
    this.showCajasDropdown.set(false);
  }

  getLoteDisplayText(lote: LoteDto): string {
    return `${lote.numeroLote} - ${lote.urbanizacion?.nombre} - $${this.formatNumber(lote.precioBase)}`;
  }
  getPropiedadDisplayText(propiedad: PropiedadDto): string {
    return `${propiedad.nombre} - ${propiedad.tipo} - ${propiedad.ubicacion} - $${this.formatNumber(propiedad.precio)}`;
  }
  getCajaDisplayText(caja: Caja): string {
    return `${caja.nombre} - ${caja.usuarioApertura?.fullName} - $${this.formatNumber(caja.saldoActual)}`;
  }
  formatNumber(value: number): string {
    return value?.toLocaleString('es-BO') ?? '0';
  }

  toggleCajasDropdown() {
    this.showCajasDropdown.set(!this.showCajasDropdown());
  }
  onCajaBlur() {
    setTimeout(() => this.showCajasDropdown.set(false), 200);
  }

  onSubmit(): void {
    if (this.modoCliente() === 'existente') {
      if (this.ventaForm.get('clienteId')?.invalid) {
        this.ventaForm.get('clienteId')?.markAsTouched();
        this.notificationService.showError('Seleccione un cliente.');
        this.irATab('datos');
        return;
      }
    } else {
      this.clienteNuevoForm.markAllAsTouched();
      if (this.clienteNuevoForm.invalid) {
        this.notificationService.showError('Complete los datos del cliente nuevo.');
        this.irATab('datos');
        return;
      }
    }
if (this.ventaForm.get('asesorId')?.invalid) {
  this.ventaForm.get('asesorId')?.markAsTouched();
  this.notificationService.showError('Seleccione un asesor para la venta.');
  this.irATab('datos');
  return;
}
    if (this.ventaForm.invalid) {
      this.ventaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos.');
      return;
    }

    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      this.notificationService.showError(
        'Complete los datos del pago (banco, comprobante, forma de pago).',
      );
      this.irATab('pago');
      return;
    }
    // El voucher es obligatorio salvo que la venta sea "sin pago inmediato"
    // if (!this.pagoForm.get('ventaSinPagoInmediato')?.value && !this.voucherFile()) {
    //   this.notificationService.showError('Adjunte la imagen del voucher de pago.');
    //   this.irATab('pago');
    //   return;
    // }

    const tipoVenta = this.ventaForm.get('tipoVenta')?.value;
    if (tipoVenta === 'CREDITO') {
      const montoInicialTotal =
        Number(this.financiacionForm.get('inicial.montoInicial')?.value) || 0;
      const inicialFraccionado = this.financiacionForm.get('inicial.fraccionado')?.value;
      const montoPagadoHoy = Number(this.pagoForm.get('montoPagadoHoy')?.value) || 0;

      if (!this.pagoForm.get('ventaSinPagoInmediato')?.value) {
        if (!inicialFraccionado && montoPagadoHoy !== montoInicialTotal) {
          this.notificationService.showError(
            `Si el Inicial no es fraccionado, el pago de hoy (Bs. ${montoPagadoHoy}) debe ser igual al Inicial total (Bs. ${montoInicialTotal}).`,
          );
          this.irATab('pago');
          return;
        }
        if (inicialFraccionado && montoPagadoHoy > montoInicialTotal) {
          this.notificationService.showError(
            `El pago de hoy no puede ser mayor al Inicial total (Bs. ${montoInicialTotal}).`,
          );
          this.irATab('pago');
          return;
        }
      }
    }
    if (tipoVenta === 'CREDITO') {
      if (this.excedeElTotal()) {
        this.notificationService.showError(
          'La suma del Inicial y el Adicional supera el precio final de la venta.',
        );
        this.irATab('financiacion');
        return;
      }
      if (this.financiacionForm.invalid) {
        this.financiacionForm.markAllAsTouched();
        this.notificationService.showError('Complete correctamente el Plan de Financiación.');
        this.irATab('financiacion');
        return;
      }
    }

    const inmuebleId = this.ventaForm.get('inmuebleId')?.value;
    const cajaId = this.ventaForm.get('cajaId')?.value;
    const inmuebleTipo = this.ventaForm.get('inmuebleTipo')?.value;
    if (!inmuebleId || !cajaId || !inmuebleTipo) {
      this.notificationService.showError('Debe seleccionar un inmueble y una caja');
      return;
    }

    this.enviando.set(true);

    const precioFinal = Number(this.ventaForm.value.precioFinal);
    const raw = this.financiacionForm.getRawValue();

    const ventaData: any = {
      inmuebleTipo,
      inmuebleId: Number(inmuebleId),
      precioFinal,
      cajaId: Number(cajaId),
        asesorId: Number(this.ventaForm.getRawValue().asesorId), 
      estado: this.ventaForm.value.estado,
      observaciones: this.ventaForm.value.observaciones,
      plan_pago:
        tipoVenta === 'CREDITO'
          ? {
              inicial: {
                montoInicial: Number(raw.inicial.montoInicial),
                fraccionado: !!raw.inicial.fraccionado,
                ...(raw.inicial.fraccionado
                  ? {
                      modalidad: raw.inicial.modalidad,
                      cantidadPagos: Number(raw.inicial.cantidadPagos),
                      fechaInicio: raw.inicial.fechaInicio,
                    }
                  : {}),
              },
              principal: {
                modalidad: raw.principal.modalidad,
                numeroCuotas: Number(raw.principal.numeroCuotas),
                fechaPrimeraCuota: raw.principal.fechaPrimeraCuota,
              },
              adicional: raw.adicional.activo
                ? {
                    activo: true,
                    montoAdicional: Number(raw.adicional.montoAdicional),
                    modalidad: raw.adicional.modalidad,
                    cantidadPagos: Number(raw.adicional.cantidadPagos),
                    fechaInicio: raw.adicional.fechaInicio,
                  }
                : { activo: false },
            }
          : {
              // Venta al CONTADO: todo el precio se cobra como Inicial único,
              // sin Principal ni Adicional.
              inicial: { montoInicial: precioFinal, fraccionado: false },
              principal: {
                modalidad: 'UNICO',
                numeroCuotas: 0,
                fechaPrimeraCuota: new Date().toISOString().split('T')[0],
              },
              adicional: { activo: false },
            },
    };

    if (this.modoCliente() === 'nuevo') {
      const { fullName, ci, telefono, email, direccion } = this.clienteNuevoForm.value;
      ventaData.clienteNuevo = { fullName, ci, telefono, email, direccion };
    } else {
      ventaData.clienteId = Number(this.ventaForm.get('clienteId')?.value);
    }

    // Datos del pago (banco, comprobante, forma de pago) van dentro del
    // mismo payload de la venta; el voucher (imagen) va aparte porque es
    // un archivo binario, no puede ir en el JSON.
    const pagoRaw = this.pagoForm.getRawValue();
    const sinPago = !!pagoRaw.ventaSinPagoInmediato;

    const montoRealPagadoHoy =
      tipoVenta === 'CREDITO' ? (sinPago ? 0 : Number(pagoRaw.montoPagadoHoy) || 0) : precioFinal;

    ventaData.pago = {
      comprobante: sinPago ? null : pagoRaw.comprobante,
      numeroComprobante: sinPago ? null : pagoRaw.numeroComprobante,
      formaPago: sinPago ? null : pagoRaw.formaPago,
      ventaSinPagoInmediato: sinPago,
      montoTotalVenta: montoRealPagadoHoy,
      fechaHoraPago: sinPago ? null : pagoRaw.fechaHoraPago,
      codigoOperacion: pagoRaw.codigoOperacion,
      observacionPago: pagoRaw.observacionPago,
    };

    const formData = new FormData();
    formData.append('data', JSON.stringify(ventaData));
    const voucher = this.voucherFile();
    if (voucher) {
      formData.append('voucher', voucher, voucher.name);
    }

    this.ventaSvc.create(formData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Venta creada exitosamente!');
          this.ventaCreada.set(response.data ?? null);
          if (inmuebleTipo === 'LOTE') {
            this.mostrarModalPdf.set(true);
          } else {
            setTimeout(() => this.router.navigate(['/ventas/lista']), 1000);
          }
        } else {
          this.notificationService.showError(response.message || 'Error al crear la venta');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al crear la venta';
        if (err.error?.message) errorMessage = err.error.message;
        else if (err.status === 400)
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
        else if (err.status === 403) errorMessage = 'No tienes permisos para crear ventas';
        else if (err.status === 404) errorMessage = 'Cliente, inmueble o caja no encontrado';
        this.notificationService.showError(errorMessage);
      },
    });
  }

  descargarAnticipo(): void {
    const venta = this.ventaCreada();
    if (venta) this.anticipoPdfService.generarAnticipoPdf(venta);
  }

  cerrarModalYRedirigir(): void {
    this.mostrarModalPdf.set(false);
    this.router.navigate(['/ventas/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  clienteModalConfig: ModalConfig = {
    title: 'Seleccionar Cliente',
    searchPlaceholder: 'Buscar por nombre, CI',
    searchKeys: ['fullName', 'ci', 'email'],
    columns: [
      { key: 'fullName', label: 'Nombre' },
      { key: 'ci', label: 'CI' },
    ],
  };

  lotesParaModal = computed(() =>
    this.lotes().map((lote) => ({ ...lote, manzanoNombre: lote.manzano?.nombre ?? '' })),
  );

  loteModalConfig: ModalConfig = {
    title: 'Seleccionar Lote',
    searchPlaceholder: 'Buscar por número, manzano...',
    searchKeys: ['numeroLote', 'manzanoNombre'],
    columns: [
      { key: 'numeroLote', label: 'N° Lote' },
      { key: 'manzano', label: 'Manzano', format: (v) => v?.nombre ?? 'Sin manzano' },
      { key: 'estado', label: 'Estado' },
      { key: 'precioBase', label: 'Precio (Bs.)', format: (v) => v?.toLocaleString('es-BO') },
    ],
  };

  propiedadModalConfig: ModalConfig = {
    title: 'Seleccionar Propiedad',
    searchPlaceholder: 'Buscar por nombre, tipo, ciudad...',
    searchKeys: ['nombre', 'tipo', 'ciudad'],
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'precio', label: 'Precio (Bs.)', format: (v) => Number(v)?.toLocaleString('es-BO') },
    ],
  };

  @ViewChild('clienteModal') clienteModal!: SeleccionModalComponent;
  @ViewChild('loteModal') loteModal!: SeleccionModalComponent;
  @ViewChild('propiedadModal') propiedadModal!: SeleccionModalComponent;

  // Convierte un Date a 'yyyy-MM-ddTHH:mm' en hora LOCAL (no UTC)
  private toLocalDatetimeInputValue(fecha: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = fecha.getFullYear();
    const m = pad(fecha.getMonth() + 1);
    const d = pad(fecha.getDate());
    const h = pad(fecha.getHours());
    const min = pad(fecha.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
  }
}

interface CuotaEstimada {
  numero: number;
  fecha: string;
  monto: number;
}
