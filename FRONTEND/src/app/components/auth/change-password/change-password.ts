import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, ChangePasswordResponse } from '../../services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './change-password.html',
})
export class ChangePasswordComponent {
  changePasswordForm: FormGroup;
  loading = signal(false);
  errorMessage = signal('');
  passwordChanged = signal(false);

  // Variables para mostrar/ocultar contraseña
  showNewPassword = false;
  showConfirmPassword = false;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.changePasswordForm = this.fb.group(
      {
        identifier: ['', [Validators.required]], // CORRECCIÓN: identifier en lugar de ci
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (!newPassword || !confirmPassword) {
      return null;
    }

    return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    this.changePasswordForm.markAllAsTouched();

    if (this.changePasswordForm.valid) {
      this.loading.set(true);
      this.errorMessage.set('');

      const changePasswordData = {
        identifier: this.changePasswordForm.get('identifier')?.value,
        newPassword: this.changePasswordForm.get('newPassword')?.value,
        confirmPassword: this.changePasswordForm.get('confirmPassword')?.value,
      };

      this.authService.changePassword(changePasswordData).subscribe({
        next: (response: ChangePasswordResponse) => {
          this.loading.set(false);
          this.passwordChanged.set(true);
          this.changePasswordForm.reset();
          this.notificationService.showSuccess('Contraseña cambiada exitosamente');
          
          // Limpiar las variables de mostrar contraseña
          this.showNewPassword = false;
          this.showConfirmPassword = false;
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(error.message || 'Error al cambiar la contraseña');
          this.notificationService.showError(error.message || 'Error al cambiar la contraseña');
        },
      });
    } else {
      this.notificationService.showError('Complete todos los campos requeridos correctamente');
    }
  }

  get identifier() {
    return this.changePasswordForm.get('identifier');
  }

  get newPassword() {
    return this.changePasswordForm.get('newPassword');
  }

  get confirmPassword() {
    return this.changePasswordForm.get('confirmPassword');
  }
}