import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faSave,
  faUserEdit,
  faUser,
  faIdCard,
  faPhone,
  faMapMarkerAlt,
  faStickyNote,
} from '@fortawesome/free-solid-svg-icons';
import { NotificationService } from '../../../../core/services/notification.service';
import { ClientesService } from '../../service/cliente.service';

@Component({
  selector: 'app-clientes-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './cliente-edit.html',
  providers: [DatePipe],
})
export class ClientesEditComponent implements OnInit {
  faArrowLeft = faArrowLeft;
  faSave = faSave;
  faUserEdit = faUserEdit;
  faUser = faUser;
  faIdCard = faIdCard;
  faPhone = faPhone;
  faMapMarkerAlt = faMapMarkerAlt;
  faStickyNote = faStickyNote;

  clienteForm: FormGroup;
  clienteId = signal<number | null>(null);
  clienteData = signal<any>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);

  private clientesService = inject(ClientesService);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private datePipe = inject(DatePipe);

  constructor() {
    this.clienteForm = this.crearFormularioCliente();
  }

  ngOnInit(): void {
    this.obtenerCliente();
  }

  crearFormularioCliente(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      ci: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      telefono: ['', [Validators.required]],
      direccion: [''],
      observaciones: [''],
    });
  }

  obtenerCliente(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('ID de cliente no válido');
      this.cargando.set(false);
      return;
    }

    this.clienteId.set(id);
    this.cargando.set(true);

    this.clientesService.getById(id).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const cliente = response.data.user || response.data;

          if (cliente && cliente.role !== 'CLIENTE') {
            this.notificationService.showError('El usuario no es un cliente');
            this.router.navigate(['/clientes']);
            return;
          }

          this.clienteData.set(cliente);
          this.cargarDatosFormulario(cliente);
        } else {
          this.error.set('No se pudo cargar la información del cliente');
        }
        this.cargando.set(false);
      },
      error: (error: any) => {
        console.error('Error loading cliente:', error);
        this.error.set(error.message || 'Error al cargar los datos del cliente');
        this.cargando.set(false);
        this.router.navigate(['/clientes']);
      },
    });
  }

  cargarDatosFormulario(cliente: any): void {
    this.clienteForm.patchValue({
      fullName: cliente.fullName || '',
      ci: cliente.ci || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      observaciones: cliente.observaciones || '',
    });
  }

  onSubmit(): void {
    if (this.clienteForm.invalid) {
      this.markFormGroupTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente');
      return;
    }

    if (!this.clienteId()) {
      this.notificationService.showError('ID de cliente no válido');
      return;
    }

    this.enviando.set(true);

    this.clientesService.update(this.clienteId()!, this.clienteForm.value).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        this.notificationService.showSuccess(
          response.message || 'Cliente actualizado correctamente'
        );
        setTimeout(() => {
          this.router.navigate(['/clientes']);
        }, 1500);
      },
      error: (error: any) => {
        this.enviando.set(false);
        console.error('Error updating cliente:', error);
        this.notificationService.showError(error.message || 'Error al actualizar el cliente');
      },
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.clienteForm.controls).forEach((key) => {
      const control = this.clienteForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.clienteForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Este campo es requerido';
      if (control.errors['minlength']) return 'Mínimo 3 caracteres';
      if (control.errors['pattern']) {
        if (fieldName === 'ci') return 'El C.I. debe contener solo números';
      }
    }
    return '';
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.clienteForm.get(fieldName);
    return !!(control?.invalid && control.touched);
  }

  goBack(): void {
    this.router.navigate(['/clientes']);
  }
}
