import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSave,
  faUserEdit,
  faUser,
  faIdCard,
  faPhone,
  faEnvelope,
  faUserShield,
  faCalendar,
  faStickyNote,
  faEye,
  faEyeSlash,
  faLock,
  faBuilding,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserService } from '../../services/users.service';
import { AuthService } from '../../../../components/services/auth.service';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';

@Component({
  selector: 'app-users-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './users-edit.html',
})
export class UsersEditComponent implements OnInit {
  // Icons
  faSave = faSave;
  faUserEdit = faUserEdit;
  faUser = faUser;
  faIdCard = faIdCard;
  faPhone = faPhone;
  faEnvelope = faEnvelope;
  faUserShield = faUserShield;
  faCalendar = faCalendar;
  faStickyNote = faStickyNote;
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Form
  editForm: FormGroup;

  // Signals
  userId = signal<number | null>(null);
  userData = signal<any>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  enviando = signal<boolean>(false);
  canEditRole = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  // Data
  roles = ['ADMINISTRADOR', 'ASESOR', 'SECRETARIA', 'USUARIO'];
  urbanizaciones: any[] = [];
  urbanizacionesSeleccionadas: any[] = [];

  constructor() {
    this.editForm = this.crearFormularioUsuario();
  }
ngOnInit(): void {
  const currentUser = this.authService.getCurrentUser();
  this.canEditRole.set(currentUser?.role === 'ADMINISTRADOR');

  // Primero cargar urbanizaciones, luego el usuario
  this.cargarUrbanizaciones(() => this.obtenerUsuario());
}

  crearFormularioUsuario(): FormGroup {
    return this.fb.group(
      {
        fullName:      ['', [Validators.required, Validators.minLength(3)]],
        username:      ['', [Validators.required, Validators.minLength(3)]],
        email:         ['', [Validators.email]],
        telefono:      ['', [Validators.required]],
        direccion:     [''],
        observaciones: [''],
        role:          ['', [Validators.required]],
        password:      ['', [Validators.minLength(6)]],
        confirmPassword: [''],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  // ============================================================
  // URBANIZACIONES
  // ============================================================

cargarUrbanizaciones(callback?: () => void): void {
  this.urbanizacionService.getAll().subscribe({
    next: (response: any) => {
      console.log('Urbanizaciones response:', response); // ← ver estructura
      this.urbanizaciones = Array.isArray(response)
        ? response
        : response?.data?.urbanizaciones
        ?? response?.data
        ?? [];
      callback?.();
    },
    error: () => {
      this.urbanizaciones = [];
      callback?.();
    },
  });
}

  get requiresUrbanizacion(): boolean {
    const role = this.editForm.get('role')?.value;
    return role === 'ASESOR' || role === 'SECRETARIA';
  }

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
    select.value = '';
  }

  removerUrbanizacion(id: number): void {
    this.urbanizacionesSeleccionadas = this.urbanizacionesSeleccionadas.filter((u) => u.id !== id);
  }

  // ============================================================
  // CARGAR USUARIO
  // ============================================================

  obtenerUsuario(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('ID de usuario no válido');
      this.cargando.set(false);
      return;
    }

    this.userId.set(id);

    this.userService.getById(id).subscribe({
      next: (response: any) => {

  console.log('Response completo:', response);
  const user = response.data?.user || response.data;
  console.log('User:', user);
  console.log('urbanizacionesAsignadas:', user?.urbanizacionesAsignadas);
  console.log('role:', user?.role);

        if (response.success && response.data) {
          const user = response.data.user || response.data;

          if (user?.role === 'CLIENTE') {
            this.notificationService.showError('No se puede editar clientes desde esta sección');
            this.router.navigate(['/usuarios']);
            return;
          }

          this.userData.set(user);
          this.cargarDatosFormulario(user);

          // Cargar urbanizaciones ya asignadas al usuario
          if (user.urbanizacionesAsignadas?.length > 0) {
            this.urbanizacionesSeleccionadas = user.urbanizacionesAsignadas.map(
              (u: any) => u.urbanizacion ?? u,
            );
          }
        } else {
          this.error.set('No se pudo cargar la información del usuario');
        }
        this.cargando.set(false);
      },
      error: (error: any) => {
        this.error.set(error.message || 'Error al cargar los datos del usuario');
        this.cargando.set(false);
        this.router.navigate(['/usuarios']);
      },
    });
  }

  cargarDatosFormulario(user: any): void {
    this.editForm.patchValue({
      fullName:      user.fullName || '',
      username:      user.username || '',
      email:         user.email || '',
      telefono:      user.telefono || '',
      direccion:     user.direccion || '',
      observaciones: user.observaciones || '',
      role:          user.role || 'USUARIO',
    });

    if (!this.canEditRole()) {
      this.editForm.get('role')?.disable();
    }
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  onSubmit(): void {
    if (this.editForm.invalid) {
      this.markFormGroupTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente');
      return;
    }

    if (!this.userId()) {
      this.notificationService.showError('ID de usuario no válido');
      return;
    }

    this.enviando.set(true);

    const updateData: any = {
      fullName:      this.editForm.value.fullName,
      username:      this.editForm.value.username,
      email:         this.editForm.value.email,
      telefono:      this.editForm.value.telefono,
      direccion:     this.editForm.value.direccion,
      observaciones: this.editForm.value.observaciones,
      ...(this.canEditRole() && { role: this.editForm.value.role }),
      ...(this.editForm.value.password && { password: this.editForm.value.password }),
    };

    this.userService.update(this.userId()!, updateData).subscribe({
      next: () => {
        // Actualizar urbanizaciones
        const urbanizacionIds = this.urbanizacionesSeleccionadas.map((u) => u.id);
        this.userService.asignarUrbanizaciones(this.userId()!, urbanizacionIds).subscribe({
          next: () => {
            this.enviando.set(false);
            this.notificationService.showSuccess('Usuario actualizado correctamente');
            setTimeout(() => this.router.navigate(['/usuarios']), 1500);
          },
          error: () => {
            this.enviando.set(false);
            this.notificationService.showSuccess('Usuario actualizado. Las urbanizaciones no se pudieron guardar.');
            setTimeout(() => this.router.navigate(['/usuarios']), 1500);
          },
        });
      },
      error: (error: any) => {
        this.enviando.set(false);
        this.notificationService.showError(error.message || 'Error al actualizar el usuario');
      },
    });
  }

  // ============================================================
  // FORM HELPERS
  // ============================================================

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (password && password !== confirmPassword) {
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

  private markFormGroupTouched(): void {
    Object.keys(this.editForm.controls).forEach((key) => {
      this.editForm.get(key)?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.editForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Este campo es requerido';
      if (control.errors['minlength']) return 'Mínimo 3 caracteres';
      if (control.errors['email']) return 'Email inválido';
    }
    if (
      fieldName === 'confirmPassword' &&
      this.editForm.errors?.['passwordMismatch'] &&
      control?.touched
    ) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.editForm.get(fieldName);
    if (fieldName === 'confirmPassword') {
      return !!(
        control?.touched &&
        (control?.invalid || this.editForm.errors?.['passwordMismatch'])
      );
    }
    return !!(control?.invalid && control.touched);
  }

  goBack(): void {
    this.router.navigate(['/usuarios']);
  }
}