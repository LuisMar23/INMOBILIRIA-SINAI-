import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { PropiedadService } from '../../service/propiedad.service';
import { UserService } from '../../../users/services/users.service';

@Component({
  selector: 'app-propiedad-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './propiedad-create.html',
})
export class PropiedadCreate {
  propiedadForm: FormGroup;
  enviando = signal<boolean>(false);
  asesores = signal<any[]>([]);
  router = inject(Router);
  private fb = inject(FormBuilder);
  private propiedadSvc = inject(PropiedadService);
  private userSvc = inject(UserService);
  private notificationService = inject(NotificationService);

  tiposPropiedad = [
    { value: 'CASA', label: 'Casa' },
    { value: 'DEPARTAMENTO', label: 'Departamento' },
    { value: 'GARZONIER', label: 'Garzónier' },
    { value: 'CUARTO', label: 'Cuarto' },
  ];

  estadosPropiedad = [
    { value: 'VENTA', label: 'Venta' },
    { value: 'ALQUILER', label: 'Alquiler' },
    { value: 'ANTICREDITO', label: 'Anticrédito' },
  ];

  estadosInmueble = [
    { value: 'DISPONIBLE', label: 'Disponible' },
    { value: 'RESERVADO', label: 'Reservado' },
    { value: 'VENDIDO', label: 'Vendido' },
    { value: 'CON_OFERTA', label: 'Con Oferta' },
  ];

  constructor() {
    this.propiedadForm = this.crearFormularioPropiedad();
    this.cargarAsesores();
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
      encargadoId: [],
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

  onSubmit(): void {
    if (this.propiedadForm.invalid) {
      this.propiedadForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    if (!this.mostrarCampoEncargado()) {
      this.propiedadForm.patchValue({ encargadoId: '' });
    }

    this.enviando.set(true);
    const formValue = this.propiedadForm.value;
    const propiedadData = {
      ...formValue,
      tamano: Number(formValue.tamano),
      precio: Number(formValue.precio),
      habitaciones: formValue.habitaciones ? Number(formValue.habitaciones) : undefined,
      banos: formValue.banos ? Number(formValue.banos) : undefined,
      encargadoId: this.mostrarCampoEncargado() && formValue.encargadoId ? Number(formValue.encargadoId) : undefined,
    };

    this.propiedadSvc.create(propiedadData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success) {
          this.notificationService.showSuccess('Propiedad creada exitosamente!');
          setTimeout(() => {
            this.router.navigate(['/propiedades/lista']);
          }, 1000);
        } else {
          this.notificationService.showError(response.message || 'Error al crear la propiedad');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al crear la propiedad';
        if (err.status === 400) {
          errorMessage =
            err.error?.message || 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 404) {
          errorMessage = 'Recurso no encontrado. Verifique los datos ingresados.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }
}