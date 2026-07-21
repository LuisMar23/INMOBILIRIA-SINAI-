import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserDto } from '../../../../core/interfaces/user.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { PropiedadDto } from '../../../../core/interfaces/propiedad.interface';
import { VisitaService } from '../../service/visita.service';
import { LoteService } from '../../../lote/service/lote.service';
import { PropiedadService } from '../../../propiedad/service/propiedad.service';
import { AuthService } from '../../../../components/services/auth.service';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';

@Component({
  selector: 'app-visita-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './visita-edit.html',
})
export class VisitaEdit implements OnInit {
  visitaForm: FormGroup;
  visitaId: number | null = null;
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  visitaData: any = null;
  clientes = signal<UserDto[]>([]);
  lotes = signal<LoteDto[]>([]);
  propiedades = signal<PropiedadDto[]>([]);

  searchCliente = signal<string>('');
  searchLote = signal<string>('');
  searchPropiedad = signal<string>('');

  showClientesDropdown = signal<boolean>(false);
  showLotesDropdown = signal<boolean>(false);
  showPropiedadesDropdown = signal<boolean>(false);

  inmuebleTipoSeleccionado = signal<string>('LOTE');

  router = inject(Router);
  private fb = inject(FormBuilder);
  private visitaSvc = inject(VisitaService);
  private loteSvc = inject(LoteService);
  private propiedadSvc = inject(PropiedadService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private urbanizacionContext = inject(UrbanizacionContextService);

  constructor() {
    this.visitaForm = this.crearFormularioVisita();
  }

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarLotes();
    this.cargarPropiedades();
    this.obtenerVisita();
  }

  crearFormularioVisita(): FormGroup {
    return this.fb.group({
      clienteId: ['', Validators.required],
      inmuebleTipo: ['LOTE', Validators.required],
      inmuebleId: ['', Validators.required],
      fechaVisita: ['', Validators.required],
      estado: ['PENDIENTE'],
      comentarios: [''],
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
        } else {
          this.notificationService.showWarning('No se pudieron cargar los clientes');
          return;
        }

        this.clientes.set(clientes);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los clientes');
      },
    });
  }

  cargarLotes(): void {
    const currentUser = this.authService.getCurrentUser();
    const urbanizacionActiva = this.urbanizacionContext.urbanizacion();

    this.loteSvc.getAll().subscribe({
      next: (lotes: LoteDto[]) => {
        let lotesFiltrados = lotes.filter(
          (lote) => 
            lote.encargadoId === currentUser?.id && 
            (lote.estado === 'DISPONIBLE' || lote.estado === 'CON_OFERTA')
        );
        if (urbanizacionActiva) {
          lotesFiltrados = lotesFiltrados.filter(
            (lote) => lote.urbanizacion?.id === urbanizacionActiva.id
          );
        }
        this.lotes.set(lotesFiltrados);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar los lotes');
      },
    });
  }

  cargarPropiedades(): void {
    const currentUser = this.authService.getCurrentUser();
    const urbanizacionActiva = this.urbanizacionContext.urbanizacion();

    this.propiedadSvc.getAll().subscribe({
      next: (propiedades: PropiedadDto[]) => {
        let propiedadesFiltradas = propiedades.filter(
          (propiedad) => 
            propiedad.encargadoId === currentUser?.id && 
            (propiedad.estado === 'DISPONIBLE' || propiedad.estado === 'CON_OFERTA')
        );
        if (urbanizacionActiva) {
          propiedadesFiltradas = propiedadesFiltradas.filter(
            (propiedad) => propiedad.urbanizacion?.id === urbanizacionActiva.id
          );
        }
        this.propiedades.set(propiedadesFiltradas);
      },
      error: (err: any) => {
        this.notificationService.showError('No se pudieron cargar las propiedades');
      },
    });
  }

  onTipoInmuebleChange(tipo: string): void {
    this.inmuebleTipoSeleccionado.set(tipo);
    this.visitaForm.patchValue({
      inmuebleTipo: tipo,
      inmuebleId: '',
    });
    this.searchLote.set('');
    this.searchPropiedad.set('');
    this.showLotesDropdown.set(false);
    this.showPropiedadesDropdown.set(false);
  }

  filteredClientes() {
    const search = this.searchCliente().toLowerCase();
    if (!search) return this.clientes();
    return this.clientes().filter((cliente) => cliente.fullName?.toLowerCase().includes(search));
  }

  filteredLotes() {
    const search = this.searchLote().toLowerCase();
    if (!search) return this.lotes();
    return this.lotes().filter(
      (lote) =>
        lote.numeroLote?.toLowerCase().includes(search) ||
        lote.estado?.toLowerCase().includes(search) ||
        lote.precioBase?.toString().includes(search) ||
        lote.urbanizacion?.nombre?.toLowerCase().includes(search)
    );
  }

  filteredPropiedades() {
    const search = this.searchPropiedad().toLowerCase();
    if (!search) return this.propiedades();
    return this.propiedades().filter(
      (propiedad) =>
        propiedad.nombre?.toLowerCase().includes(search) ||
        propiedad.tipo?.toLowerCase().includes(search) ||
        propiedad.ubicacion?.toLowerCase().includes(search) ||
        propiedad.ciudad?.toLowerCase().includes(search) ||
        propiedad.precio?.toString().includes(search)
    );
  }

  selectCliente(cliente: UserDto) {
    this.visitaForm.patchValue({
      clienteId: cliente.id,
    });
    this.searchCliente.set(cliente.fullName || '');
    this.showClientesDropdown.set(false);
  }

  selectLote(lote: LoteDto) {
    this.visitaForm.patchValue({
      inmuebleId: lote.id,
    });
    this.searchLote.set(
      `${lote.numeroLote} - ${lote.urbanizacion?.nombre || 'Sin urbanización'} - $${lote.precioBase}`
    );
    this.showLotesDropdown.set(false);
  }

  selectPropiedad(propiedad: PropiedadDto) {
    this.visitaForm.patchValue({
      inmuebleId: propiedad.id,
    });
    this.searchPropiedad.set(
      `${propiedad.nombre} - ${propiedad.tipo} - ${propiedad.ciudad} - $${propiedad.precio}`
    );
    this.showPropiedadesDropdown.set(false);
  }

  toggleClientesDropdown() {
    this.showClientesDropdown.set(!this.showClientesDropdown());
    if (this.showClientesDropdown()) {
      this.showLotesDropdown.set(false);
      this.showPropiedadesDropdown.set(false);
    }
  }

  toggleLotesDropdown() {
    if (this.inmuebleTipoSeleccionado() === 'LOTE') {
      this.showLotesDropdown.set(!this.showLotesDropdown());
      if (this.showLotesDropdown()) {
        this.showClientesDropdown.set(false);
        this.showPropiedadesDropdown.set(false);
      }
    }
  }

  togglePropiedadesDropdown() {
    if (this.inmuebleTipoSeleccionado() === 'PROPIEDAD') {
      this.showPropiedadesDropdown.set(!this.showPropiedadesDropdown());
      if (this.showPropiedadesDropdown()) {
        this.showClientesDropdown.set(false);
        this.showLotesDropdown.set(false);
      }
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

  onPropiedadBlur() {
    setTimeout(() => {
      this.showPropiedadesDropdown.set(false);
    }, 200);
  }

  obtenerVisita(): void {
    this.visitaId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.visitaId) {
      this.error.set('ID de visita no válido');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.visitaSvc.getById(this.visitaId).subscribe({
      next: (visita: any) => {
        if (visita) {
          this.visitaData = visita;
          setTimeout(() => {
            this.cargarDatosFormulario(visita);
          }, 500);
        } else {
          this.error.set('No se encontró la visita');
        }
        this.cargando.set(false);
      },
      error: (err: any) => {
        this.error.set('No se pudo cargar la visita');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosFormulario(visita: any): void {
    const clienteSeleccionado = this.clientes().find((c) => c.id === visita.clienteId);

    const fechaVisita = new Date(visita.fechaVisita);
    const fechaFormateada = fechaVisita.toISOString().slice(0, 16);

    const inmuebleTipo = visita.inmuebleTipo || 'LOTE';
    this.inmuebleTipoSeleccionado.set(inmuebleTipo);

    let inmuebleId = '';
    if (inmuebleTipo === 'LOTE' && visita.loteId) {
      inmuebleId = visita.loteId;
    } else if (inmuebleTipo === 'PROPIEDAD' && visita.propiedadId) {
      inmuebleId = visita.propiedadId;
    }

    this.visitaForm.patchValue({
      clienteId: visita.clienteId,
      inmuebleTipo: inmuebleTipo,
      inmuebleId: inmuebleId,
      fechaVisita: fechaFormateada,
      estado: visita.estado || 'PENDIENTE',
      comentarios: visita.comentarios || '',
    });

    if (clienteSeleccionado) {
      this.searchCliente.set(clienteSeleccionado.fullName || '');
    }

    setTimeout(() => {
      if (inmuebleTipo === 'LOTE') {
        const loteSeleccionado = this.lotes().find((l) => l.id === visita.loteId);
        if (loteSeleccionado) {
          this.searchLote.set(
            `${loteSeleccionado.numeroLote} - ${loteSeleccionado.urbanizacion?.nombre || 'Sin urbanización'} - $${loteSeleccionado.precioBase}`
          );
        }
      } else if (inmuebleTipo === 'PROPIEDAD') {
        const propiedadSeleccionada = this.propiedades().find((p) => p.id === visita.propiedadId);
        if (propiedadSeleccionada) {
          this.searchPropiedad.set(
            `${propiedadSeleccionada.nombre} - ${propiedadSeleccionada.tipo} - ${propiedadSeleccionada.ciudad} - $${propiedadSeleccionada.precio}`
          );
        }
      }
    }, 500);
  }

  onSubmit(): void {
    if (this.visitaForm.invalid) {
      this.visitaForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (!this.visitaId) {
      this.notificationService.showError('ID de visita no válido.');
      return;
    }

    this.enviando.set(true);

    const dataActualizada = {
      clienteId: this.visitaForm.value.clienteId,
      inmuebleTipo: this.inmuebleTipoSeleccionado(),
      inmuebleId: this.visitaForm.value.inmuebleId,
      fechaVisita: this.visitaForm.value.fechaVisita,
      estado: this.visitaForm.value.estado,
      comentarios: this.visitaForm.value.comentarios,
    };

    this.visitaSvc.update(this.visitaId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response && response.success) {
          this.notificationService.showSuccess('Visita actualizada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/visitas/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response?.message || 'Error al actualizar la visita');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al actualizar la visita';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 403) {
          errorMessage = 'No tienes permisos para actualizar visitas o no eres el encargado del inmueble';
        } else if (err.status === 404) {
          errorMessage = 'Visita no encontrada.';
        }

        this.notificationService.showError(errorMessage);
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/visitas/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }
}