import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  faEye,
  faEyeSlash,
  faLock,
  faUser,
  faCheck,
  faSignInAlt,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PermisosStateService } from '../../core/services/permisosState.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule, RouterModule],
  templateUrl: './login.html',
})
export class LoginComponent {
  faUser = faUser;
  faLock = faLock;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faCheck = faCheck;
  faSignInAlt = faSignInAlt;
  
  loginForm: FormGroup;
  showPassword: boolean = false;
  isLoading: boolean = false;
  _authService = inject(AuthService);
  _notificationService = inject(NotificationService);


  private permisosState=inject(PermisosStateService)
  constructor(private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      identifier: ['', [Validators.required]],
      password: ['', Validators.required],
      rememberMe: [false],
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

onSubmit() {
  if (this.loginForm.valid) {
    this.isLoading = true;
    const data = this.loginForm.getRawValue();

    this._authService.login(data).subscribe({
      next: (response) => {
        this.permisosState.cargar(response.data.permisos);
        this.isLoading = false;
        this._notificationService.showSuccess('¡Bienvenido!');
        setTimeout(() => this.router.navigate(['/lotes/listaUrbanizaciones']), 500);
      },
      error: (error) => {
        this.isLoading = false;
        this._notificationService.showError(
          error.message || 'Credenciales incorrectas. Por favor, verifica tus datos.'
        );
      },
    });
  } else {
    Object.keys(this.loginForm.controls).forEach((key) => {
      this.loginForm.get(key)?.markAsTouched();
    });
    this._notificationService.showError('Por favor completa todos los campos requeridos');
  }
}

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }
}
