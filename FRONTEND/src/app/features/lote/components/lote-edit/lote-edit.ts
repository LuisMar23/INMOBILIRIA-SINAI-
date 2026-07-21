import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoteService } from '../../service/lote.service';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';
import { UserService } from '../../../users/services/users.service';
import { ManzanoDto } from '../../../../core/interfaces/manzano.interface';
import {
  ModalConfig,
  SeleccionModalComponent,
} from '../../../../components/seleccion-modal/seleccion-modal';
import { ManzanoService } from '../../../manzano/service/manzano.service';
import { UpdateLoteDto } from '../../../../core/interfaces/lote.interface';

@Component({
  selector: 'app-lote-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SeleccionModalComponent],
  templateUrl: './lote-edit.html',
  providers: [DatePipe],
})
export class LoteEdit implements OnInit {
  loteForm!: FormGroup;
  loteId!: number;
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  loteData: any = null;
  urbanizaciones = signal<UrbanizacionDto[]>([]);
  asesores = signal<any[]>([]);
  todosManzanos = signal<ManzanoDto[]>([]);
  manzanosFiltrados = signal<ManzanoDto[]>([]);
  searchUrbanizacion = signal<string>('');
  router = inject(Router);
  private fb = inject(FormBuilder);
  private loteSvc = inject(LoteService);
  private urbanizacionSvc = inject(UrbanizacionService);
  private userSvc = inject(UserService);
  private manzanoSvc = inject(ManzanoService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);

  constructor() {
    this.loteForm = this.crearFormularioLote();
  }

  ngOnInit(): void {
    this.cargarUrbanizaciones();
    this.cargarAsesores();
    this.cargarTodosManzanos();
    this.obtenerLote();
    this.setupFormListeners();
  }

  crearFormularioLote(): FormGroup {
    return this.fb.group({
      esIndependiente: [false],
      urbanizacionId: [''],
      numeroLote: ['', [Validators.required, Validators.minLength(2)]],
      superficieM2: [0, [Validators.required, Validators.min(0.01)]],
      precioBase: [0, [Validators.required, Validators.min(0.01)]],
      precioM2: ['', Validators.min(0)],
      ciudad: [''],
      descripcion: [''],
      ubicacion: [''],
      manzanoId: [''],
      estado: ['DISPONIBLE'],
      encargadoId: [''],
      partida: [''],
      medidaFrente: ['', Validators.min(0.01)],
      medidaIzquierda: ['', Validators.min(0.01)],
      medidaDerecha: ['', Validators.min(0.01)],
      medidaFondo: ['', Validators.min(0.01)],
      colindaFrontal: [''],
      colindaDerecho: [''],
      colindaIzquierdo: [''],
      colindaFondo: [''],
    });
  }

  cargarAsesores(): void {
    this.userSvc.getAsesoresYAdministradores().subscribe({
      next: (response) => {
        if (response.success && response.data.users) {
          this.asesores.set(response.data.users);
        }
      },
      error: () => {
        this.notificationService.showError('No se pudieron cargar los encargados disponibles');
      },
    });
  }

  cargarTodosManzanos(): void {
    this.manzanoSvc.getAll().subscribe({
      next: (manzanos) => {
        this.todosManzanos.set(manzanos);
        this.filtrarManzanosPorUrbanizacion(this.loteForm.get('urbanizacionId')?.value);
      },
      error: () => console.error('Error al cargar manzanos'),
    });
  }

  filtrarManzanosPorUrbanizacion(urbanizacionId: string | number): void {
    if (!urbanizacionId) {
      this.manzanosFiltrados.set([]);
      return;
    }
    const id = Number(urbanizacionId);
    const filtrados = this.todosManzanos().filter((m) => m.urbanizacionId === id);
    this.manzanosFiltrados.set(filtrados);
  }

  setupFormListeners(): void {
    this.loteForm.get('esIndependiente')?.valueChanges.subscribe((esIndependiente) => {
      this.onEsIndependienteChange(esIndependiente);
    });
    this.loteForm.get('urbanizacionId')?.valueChanges.subscribe((urbanizacionId) => {
      this.filtrarManzanosPorUrbanizacion(urbanizacionId);
      if (!urbanizacionId) {
        this.loteForm.patchValue({ manzanoId: '' });
      }
    });
  }

  cargarUrbanizaciones(): void {
    this.urbanizacionSvc.getAll(1, 100).subscribe({
      next: (response) => {
        this.urbanizaciones.set(response.data);
      },
      error: () => {
        this.notificationService.showError('No se pudieron cargar las urbanizaciones');
      },
    });
  }

  onEsIndependienteChange(esIndependiente: boolean): void {
    const urbanizacionIdControl = this.loteForm.get('urbanizacionId');
    const ciudadControl = this.loteForm.get('ciudad');
    const manzanoIdControl = this.loteForm.get('manzanoId');

    if (esIndependiente) {
      urbanizacionIdControl?.clearValidators();
      urbanizacionIdControl?.setValue('');
      ciudadControl?.setValidators([Validators.required]);
      manzanoIdControl?.clearValidators();
      manzanoIdControl?.setValue('');
      this.manzanosFiltrados.set([]);
    } else {
      urbanizacionIdControl?.setValidators([Validators.required]);
      ciudadControl?.clearValidators();
      ciudadControl?.setValue('');
      manzanoIdControl?.setValidators([]);
    }
    urbanizacionIdControl?.updateValueAndValidity();
    ciudadControl?.updateValueAndValidity();
  }

  selectUrbanizacion(urbanizacion: UrbanizacionDto) {
    if (urbanizacion.id) {
      this.loteForm.patchValue({
        urbanizacionId: urbanizacion.id.toString(),
        ciudad: urbanizacion.ciudad,
      });
      this.searchUrbanizacion.set(urbanizacion.nombre || '');
      this.filtrarManzanosPorUrbanizacion(urbanizacion.id);
    }
  }

  obtenerLote(): void {
    this.loteId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.loteId) {
      this.error.set('ID de lote no válido');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.loteSvc.getById(this.loteId).subscribe({
      next: (lote) => {
        if (lote) {
          this.loteData = lote;
          this.cargarDatosFormulario(lote);
        } else {
          this.error.set('No se encontró el lote');
        }
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el lote');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosFormulario(lote: any): void {
    const urbanizacionSeleccionada = this.urbanizaciones().find(
      (u) => u.id === lote.urbanizacionId,
    );

    this.loteForm.patchValue({
      esIndependiente: lote.esIndependiente || false,
      urbanizacionId: lote.urbanizacionId?.toString() || '',
      numeroLote: lote.numeroLote || '',
      superficieM2: lote.superficieM2 || 0,
      precioBase: lote.precioBase || 0,
      precioM2: lote.precioM2 !== undefined && lote.precioM2 !== null ? lote.precioM2 : '',
      ciudad: lote.ciudad || '',
      manzanoId: lote.manzanoId || '',
      descripcion: lote.descripcion || '',
      ubicacion: lote.ubicacion || '',
      estado: lote.estado || 'DISPONIBLE',
      encargadoId: lote.encargadoId || '',
      partida: lote.partida || '',
      medidaFrente: lote.medidaFrente || '',
      medidaIzquierda: lote.medidaIzquierda || '',
      medidaDerecha: lote.medidaDerecha || '',
      medidaFondo: lote.medidaFondo || '',
      colindaFrontal: lote.colindaFrontal || '',
      colindaDerecho: lote.colindaDerecho || '',
      colindaIzquierdo: lote.colindaIzquierdo || '',
      colindaFondo: lote.colindaFondo || '',
    });

    if (urbanizacionSeleccionada) {
      this.searchUrbanizacion.set(urbanizacionSeleccionada.nombre || '');
    }
    if (lote.urbanizacionId) {
      this.filtrarManzanosPorUrbanizacion(lote.urbanizacionId);
    }
    this.onEsIndependienteChange(lote.esIndependiente || false);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  onSubmit(): void {
    if (this.loteForm.invalid) {
      this.loteForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (!this.loteId) {
      this.notificationService.showError('ID de lote no válido.');
      return;
    }

    this.enviando.set(true);

    const formValue = this.loteForm.value;
    const dataActualizada: UpdateLoteDto = {
      esIndependiente: formValue.esIndependiente,
      urbanizacionId: formValue.esIndependiente ? undefined : Number(formValue.urbanizacionId),
      numeroLote: formValue.numeroLote,
      superficieM2: Number(formValue.superficieM2),
      precioBase: Number(formValue.precioBase),
      precioM2: formValue.precioM2 !== '' ? Number(formValue.precioM2) : undefined,
      ciudad: formValue.ciudad,
      descripcion: formValue.descripcion,
      ubicacion: formValue.ubicacion,
      estado: formValue.estado,
      manzanoId: formValue.manzanoId ? Number(formValue.manzanoId) : undefined,
      partida: formValue.partida,
      medidaFrente: formValue.medidaFrente ? Number(formValue.medidaFrente) : undefined,
      medidaIzquierda: formValue.medidaIzquierda ? Number(formValue.medidaIzquierda) : undefined,
      medidaDerecha: formValue.medidaDerecha ? Number(formValue.medidaDerecha) : undefined,
      medidaFondo: formValue.medidaFondo ? Number(formValue.medidaFondo) : undefined,
      colindaFrontal: formValue.colindaFrontal,
      colindaDerecho: formValue.colindaDerecho,
      colindaIzquierdo: formValue.colindaIzquierdo,
      colindaFondo: formValue.colindaFondo,
      ...(formValue.encargadoId && { encargadoId: Number(formValue.encargadoId) }),
    };
    this.loteSvc.update(this.loteId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success) {
          this.notificationService.showSuccess(
            response.message || 'Lote actualizado exitosamente!',
          );
          setTimeout(() => {
            this.router.navigate(['/lotes/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al actualizar el lote');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al actualizar el lote';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Lote no encontrado.';
        } else if (err.status === 409) {
          errorMessage = 'El número de lote ya existe en esta urbanización.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/lotes/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }

  getTipoLote(): string {
    return this.loteForm.get('esIndependiente')?.value
      ? 'Lote Independiente'
      : 'Lote en Urbanización';
  }

  getUrbanizacionNombre(): string {
    const urbanizacionId = this.loteForm.get('urbanizacionId')?.value;
    if (!urbanizacionId) return 'Lote Independiente';
    const urbanizacion = this.urbanizaciones().find((u) => u.id === Number(urbanizacionId));
    return urbanizacion ? urbanizacion.nombre : 'No encontrada';
  }

  @ViewChild('urbanizacionModal') urbanizacionModal!: SeleccionModalComponent;
  urbanizacionModalConfig: ModalConfig = {
    title: 'Seleccionar Urbanización',
    searchPlaceholder: 'Buscar por nombre, ciudad, ubicación...',
    searchKeys: ['nombre', 'ciudad', 'ubicacion'],
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'ubicacion', label: 'Ubicación' },
    ],
  };
}
