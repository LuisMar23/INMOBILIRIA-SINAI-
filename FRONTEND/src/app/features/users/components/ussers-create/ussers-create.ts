import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSave,
  faUserPlus,
  faUser,
  faIdCard,
  faPhone,
  faEnvelope,
  faUserShield,
  faLock,
  faEye,
  faEyeSlash,
  faBuilding,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../../components/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserService } from '../../services/users.service';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';

@Component({
  selector: 'app-users-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './ussers-create.html',
})
export class UsersCreateComponent implements OnInit {
  // Icons
  faSave = faSave;
  faUserPlus = faUserPlus;
  faUser = faUser;
  faIdCard = faIdCard;
  faPhone = faPhone;
  faEnvelope = faEnvelope;
  faUserShield = faUserShield;
  faLock = faLock;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faBuilding = faBuilding;
  faTimes = faTimes;

  // Services
  private urbanizacionService = inject(UrbanizacionService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Form
  createForm: FormGroup;

  // Signals
  enviando = signal<boolean>(false);
  canAssignRole = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  // Data
  roles = ['ADMINISTRADOR', 'ASESOR', 'SECRETARIA', 'USUARIO'];
  urbanizaciones: any[] = [];
  urbanizacionesSeleccionadas: any[] = []; // las que el usuario fue eligiendo

  constructor() {
    this.createForm = this.crearFormularioUsuario();
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.canAssignRole.set(currentUser?.role === 'ADMINISTRADOR');

    if (!this.canAssignRole()) {
      this.createForm.patchValue({ role: 'USUARIO' });
      this.createForm.get('role')?.disable();
    }

    this.cargarUrbanizaciones();
  }

  crearFormularioUsuario(): FormGroup {
    return this.fb.group(
      {
        fullName: ['', [Validators.required, Validators.minLength(3)]],
        username: ['', [Validators.required, Validators.minLength(3)]],
        email: [''],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        telefono: ['', []],
        ci: [''],
        direccion: [''],
        observaciones: [''],
        role: ['USUARIO', [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  // ============================================================
  // URBANIZACIONES
  // ============================================================

cargarUrbanizaciones(): void {
  this.urbanizacionService.getAll().subscribe({
    next: (response: any) => {
      console.log('Respuesta urbanizaciones:', response);
      this.urbanizaciones = response?.data?.urbanizaciones ?? response?.data ?? response ?? [];
      console.log('urbanizaciones seteadas:', this.urbanizaciones);
    },
    error: () => (this.urbanizaciones = []),
  });
}
  get requiresUrbanizacion(): boolean {
    const role = this.createForm.get('role')?.value;
    return role === 'ASESOR' || role === 'SECRETARIA';
  }

  // Urbanizaciones disponibles (las que aún no fueron seleccionadas)
  get urbanizacionesDisponibles(): any[] {
    const selectedIds = this.urbanizacionesSeleccionadas.map((u) => u.id);
    return this.urbanizaciones.filter((u) => !selectedIds.includes(u.id));
  }

  agregarUrbanizacion(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const id = Number(select.value);
    if (!id) return;

    const urb = this.urbanizaciones.find((u) => u.id === id);
    if (urb && !this.urbanizacionesSeleccionadas.find((u) => u.id === id)) {
      this.urbanizacionesSeleccionadas = [...this.urbanizacionesSeleccionadas, urb];
    }

    // Reset el select
    select.value = '';
  }

  removerUrbanizacion(id: number): void {
    this.urbanizacionesSeleccionadas = this.urbanizacionesSeleccionadas.filter((u) => u.id !== id);
  }

  // ============================================================
  // FORM HELPERS
  // ============================================================

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  onSubmit(): void {
    if (this.createForm.invalid) {
      this.markFormGroupTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente');
      return;
    }

    if (this.createForm.errors?.['passwordMismatch']) {
      this.notificationService.showError('Las contraseñas no coinciden');
      return;
    }

    this.enviando.set(true);

    const newUser = {
      fullName:     this.createForm.value.fullName,
      username:     this.createForm.value.username,
      email:        this.createForm.value.email || undefined,
      password:     this.createForm.value.password,
      telefono:     this.createForm.value.telefono,
      ci:           this.createForm.value.ci || undefined,
      direccion:    this.createForm.value.direccion || undefined,
      observaciones: this.createForm.value.observaciones || undefined,
      role:         this.canAssignRole() ? this.createForm.value.role : 'USUARIO',
    };

    this.authService.register(newUser).subscribe({
      next: (response: any) => {
        const userId = response?.data?.user?.id;

        // Si hay urbanizaciones seleccionadas y se creó bien el usuario
        if (userId && this.urbanizacionesSeleccionadas.length > 0) {
          const urbanizacionIds = this.urbanizacionesSeleccionadas.map((u) => u.id);
          this.userService.asignarUrbanizaciones(userId, urbanizacionIds).subscribe({
            next: () => {
              this.enviando.set(false);
              this.notificationService.showSuccess('Usuario creado correctamente');
              setTimeout(() => this.router.navigate(['/usuarios']), 1500);
            },
            error: (err) => {
                console.log('Error asignando urbanizaciones:', err);
  console.log('Status:', err.status);
  console.log('Error body:', err.error)
              // El usuario se creó pero las urbanizaciones fallaron
              this.enviando.set(false);
              this.notificationService.showSuccess('Usuario creado. Las urbanizaciones no se pudieron asignar.');
              setTimeout(() => this.router.navigate(['/usuarios']), 1500);
            },
          });
        } else {
          this.enviando.set(false);
          this.notificationService.showSuccess(response.message || 'Usuario creado correctamente');
          setTimeout(() => this.router.navigate(['/usuarios']), 1500);
        }
      },
      error: (error: any) => {
        this.enviando.set(false);
        this.notificationService.showError(error.message || 'Error al crear el usuario');
      },
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.createForm.controls).forEach((key) => {
      this.createForm.get(key)?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.createForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Este campo es requerido';
      if (control.errors['minlength'])
        return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
      if (control.errors['email']) return 'Email inválido';
    }
    if (
      fieldName === 'confirmPassword' &&
      this.createForm.errors?.['passwordMismatch'] &&
      control?.touched
    ) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.createForm.get(fieldName);
    if (fieldName === 'confirmPassword') {
      return !!(
        control?.touched &&
        (control?.invalid || this.createForm.errors?.['passwordMismatch'])
      );
    }
    return !!(control?.invalid && control.touched);
  }

  goBack(): void {
    this.router.navigate(['/usuarios']);
  }
}