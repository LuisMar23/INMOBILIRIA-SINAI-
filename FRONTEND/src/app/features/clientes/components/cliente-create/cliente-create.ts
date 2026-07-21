import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faSave,
  faUserPlus,
  faUser,
  faIdCard,
  faPhone,
  faMapMarkerAlt,
  faStickyNote,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { NotificationService } from '../../../../core/services/notification.service';
import { ClientesService, CreateClienteDto } from '../../service/cliente.service';

@Component({
  selector: 'app-clientes-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './cliente-create.html',
})
export class ClientesCreateComponent {
  faArrowLeft = faArrowLeft;
  faSave = faSave;
  faUserPlus = faUserPlus;
  faUser = faUser;
  faIdCard = faIdCard;
  faPhone = faPhone;
  faMapMarkerAlt = faMapMarkerAlt;
  faStickyNote = faStickyNote;
  faUsers = faUsers;

  clienteForm: FormGroup;
  isSubmitting = false;

  private clientesService = inject(ClientesService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  constructor() {
    this.clienteForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      ci: ['', [Validators.required]],
      telefono: ['', [Validators.required]],
      direccion: [''],
      observaciones: [''],
    });
  }

  onSubmit(): void {
    if (this.clienteForm.invalid) {
      this.markFormGroupTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente');
      return;
    }

    this.isSubmitting = true;

    const createData: CreateClienteDto = {
      fullName: this.clienteForm.value.fullName,
      ci: this.clienteForm.value.ci,
      telefono: this.clienteForm.value.telefono,
      direccion: this.clienteForm.value.direccion,
      observaciones: this.clienteForm.value.observaciones,
    };

    this.clientesService.create(createData).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.notificationService.showSuccess(response.message || 'Cliente creado correctamente');

        setTimeout(() => {
          this.router.navigate(['/clientes']);
        }, 1500);
      },
      error: (error: any) => {
        this.isSubmitting = false;
        console.error('Error creating cliente:', error);
        const errorMessage = error.message || 'Error al crear el cliente';
        this.notificationService.showError(errorMessage);
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
