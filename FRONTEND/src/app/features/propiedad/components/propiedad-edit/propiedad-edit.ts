import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { PropiedadService } from '../../service/propiedad.service';
import { UserService } from '../../../users/services/users.service';

@Component({
  selector: 'app-propiedad-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './propiedad-edit.html',
  providers: [DatePipe],
})
export class PropiedadEdit implements OnInit {
  propiedadForm: FormGroup;
  propiedadId: number | null = null;
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  propiedadData: any = null;
  asesores = signal<any[]>([]);

  tiposPropiedad = [
    { value: 'CASA', label: 'Casa' },
    { value: 'DEPARTAMENTO', label: 'Departamento' },
    { value: 'GARZONIER', label: 'Garzónier' },
    { value: 'CUARTO', label: 'Cuarto' },
  ];

  estadosInmueble = [
    { value: 'DISPONIBLE', label: 'Disponible' },
    { value: 'RESERVADO', label: 'Reservado' },
    { value: 'VENDIDO', label: 'Vendido' },
    { value: 'CON_OFERTA', label: 'Con Oferta' },
  ];

  estadosPropiedad = [
    { value: 'VENTA', label: 'Venta' },
    { value: 'ALQUILER', label: 'Alquiler' },
    { value: 'ANTICREDITO', label: 'Anticrédito' },
  ];

  router = inject(Router);
  private fb = inject(FormBuilder);
  private propiedadSvc = inject(PropiedadService);
  private userSvc = inject(UserService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);

  constructor() {
    this.propiedadForm = this.crearFormularioPropiedad();
  }

  ngOnInit(): void {
    this.cargarAsesores();
    this.obtenerPropiedad();
  }

  crearFormularioPropiedad(): FormGroup {
    return this.fb.group({
      tipo: ['CASA', [Validators.required]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      tamano: [0, [Validators.required, Validators.min(0.01)]],
      ubicacion: [''],
      ciudad: ['', [Validators.required]],
      descripcion: [''],
      habitaciones: [''],
      banos: [''],
      precio: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['DISPONIBLE', [Validators.required]],
      estadoPropiedad: ['VENTA', [Validators.required]],
      encargadoId: [''],
    });
  }

  cargarAsesores(): void {
    this.userSvc.getAsesoresYAdministradores().subscribe({
      next: (response) => {
        if (response.success && response.data.users) {
          this.asesores.set(response.data.users);
        }
      },
      error: (err) => {
        console.error('Error al cargar asesores:', err);
        this.notificationService.showError('No se pudieron cargar los encargados disponibles');
      },
    });
  }

  mostrarCampoEncargado(): boolean {
    const tipo = this.propiedadForm.get('tipo')?.value;
    return tipo === 'CASA' || tipo === 'DEPARTAMENTO';
  }

  obtenerPropiedad(): void {
    this.propiedadId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.propiedadId) {
      this.error.set('ID de propiedad no válido');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.propiedadSvc.getById(this.propiedadId).subscribe({
      next: (propiedad) => {
        if (propiedad) {
          this.propiedadData = propiedad;
          this.cargarDatosFormulario(propiedad);
        } else {
          this.error.set('No se encontró la propiedad');
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar propiedad:', err);
        this.error.set('No se pudo cargar la propiedad');
        this.cargando.set(false);
      },
    });
  }

  cargarDatosFormulario(propiedad: any): void {
    this.propiedadForm.patchValue({
      tipo: propiedad.tipo || 'CASA',
      nombre: propiedad.nombre || '',
      tamano: propiedad.tamano || 0,
      ubicacion: propiedad.ubicacion || '',
      ciudad: propiedad.ciudad || '',
      descripcion: propiedad.descripcion || '',
      habitaciones: propiedad.habitaciones || '',
      banos: propiedad.banos || '',
      precio: propiedad.precio || 0,
      estado: propiedad.estado || 'DISPONIBLE',
      estadoPropiedad: propiedad.estadoPropiedad || 'VENTA',
      encargadoId: propiedad.encargadoId || '',
    });
    console.log(this.propiedadForm.getRawValue())
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
    if (this.propiedadForm.invalid) {
      this.propiedadForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (!this.propiedadId) {
      this.notificationService.showError('ID de propiedad no válido.');
      return;
    }

    if (!this.mostrarCampoEncargado()) {
      this.propiedadForm.patchValue({ encargadoId: '' });
    }

    this.enviando.set(true);

    const formValue = this.propiedadForm.value;
    const dataActualizada: any = {
      tipo: formValue.tipo,
      nombre: formValue.nombre,
      tamano: Number(formValue.tamano),
      precio: Number(formValue.precio),
      ubicacion: formValue.ubicacion,
      ciudad: formValue.ciudad,
      descripcion: formValue.descripcion,
      habitaciones: formValue.habitaciones ? Number(formValue.habitaciones) : undefined,
      banos: formValue.banos ? Number(formValue.banos) : undefined,
      estado: formValue.estado,
      estadoPropiedad: formValue.estadoPropiedad,
      encargadoId:
        this.mostrarCampoEncargado() && formValue.encargadoId
          ? Number(formValue.encargadoId)
          : undefined,
    };

    this.propiedadSvc.update(this.propiedadId, dataActualizada).subscribe({
      next: (response: any) => {
        this.enviando.set(false);

        if (response.success) {
          this.notificationService.showSuccess(
            response.message || 'Propiedad actualizada exitosamente!'
          );
          setTimeout(() => {
            this.router.navigate(['/propiedades/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(
            response.message || 'Error al actualizar la propiedad'
          );
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al actualizar la propiedad';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Propiedad no encontrada.';
        } else if (err.status === 409) {
          errorMessage = 'El nombre de la propiedad ya existe.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/propiedades/lista']);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }
}
