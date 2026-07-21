import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, CommonModule],
  templateUrl: './register.html',
})
export class RegisterComponent {
  isLoading = false;
  errorMessage = '';
  registerForm: FormGroup;
  showPassword = false;
  _authService = inject(AuthService);
  _notificationService = inject(NotificationService);
  passwordRequirements = {
    minLength: false,
    hasUpperCase: false,
    hasNumber: false,
    hasSymbol: false,
  };

  constructor(private fb: FormBuilder, private router: Router) {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      ci: ['', [Validators.required]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{8,}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/),
        ],
      ],
    });
  }

  ngOnInit(): void {
    this.setupPasswordValidation();
  }

  private setupPasswordValidation(): void {
    this.registerForm.get('password')?.valueChanges.subscribe((password) => {
      if (password) {
        this.passwordRequirements = {
          minLength: password.length >= 8,
          hasUpperCase: /[A-Z]/.test(password),
          hasNumber: /\d/.test(password),
          hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };
      } else {
        this.passwordRequirements = {
          minLength: false,
          hasUpperCase: false,
          hasNumber: false,
          hasSymbol: false,
        };
      }
    });
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // El rol USUARIO se asignará automáticamente en el backend
    const registerData = this.registerForm.value;

    this._authService.register(registerData).subscribe({
      next: (resp: any) => {
        console.log('Respuesta completa del registro:', resp);
        this.isLoading = false;

        if (resp.success && resp.data) {
          // Guardar tokens y datos del usuario si vienen en la respuesta
          if (resp.data.accessToken && resp.data.user) {
            localStorage.setItem('access_token', resp.data.accessToken);
            localStorage.setItem('refresh_token', resp.data.refreshToken);
            localStorage.setItem('user_data', JSON.stringify(resp.data.user));

            this._notificationService.showSuccess(
              '¡Usuario registrado y autenticado exitosamente!'
            );

            // Redirigir al dashboard
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 1000);
          } else {
            // Si no vienen tokens, solo mostrar mensaje de éxito
            this._notificationService.showSuccess(
              resp.message || 'Usuario registrado correctamente. Por favor inicia sesión.'
            );
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 1500);
          }
        } else {
          this._notificationService.showSuccess('Usuario registrado correctamente');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500);
        }
      },
      error: (err) => {
        console.error('Error completo al registrar usuario:', err);
        this.isLoading = false;

        // Manejo de errores más específico
        if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else if (err.message) {
          this.errorMessage = err.message;
        } else if (err.status === 400) {
          this.errorMessage = 'Datos inválidos. Verifica la información ingresada.';
        } else if (err.status === 409) {
          this.errorMessage = 'El usuario, email, CI o teléfono ya existe.';
        } else if (err.status === 0) {
          this.errorMessage = 'Error de conexión. Verifica tu internet.';
        } else {
          this.errorMessage = 'Error al crear la cuenta. Inténtalo nuevamente.';
        }

        this._notificationService.showError(this.errorMessage);
      },
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach((key) => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
