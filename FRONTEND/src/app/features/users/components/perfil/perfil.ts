import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserService } from '../../services/users.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-perfil',
  imports: [FontAwesomeModule,ReactiveFormsModule,RouterModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil {
 private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private _notificationService = inject(NotificationService);
  serverFile = environment.fileServer;
  userId = signal<number | null>(null);
  showPasswordModal = signal(false);
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;


  avatarFile = signal<File | null>(null);
  avatarUrlBackend = signal<string>('/assets/default.jpg');

  profileForm = this.fb.group({
    fullName: this.fb.control('', Validators.required),
    username: this.fb.control('', Validators.required),
    telefono: this.fb.control('', Validators.required),
    email:this.fb.control(''),
    ci: this.fb.control(''),

  });
  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });
  avatarPreview = computed(() => {
    return this.avatarFile() ? URL.createObjectURL(this.avatarFile()!) : this.avatarUrlBackend();
  });

  constructor() {
    this.loadProfile();
  }

  loadProfile() {
    this.userService.getProfile().subscribe((user) => {
      console.log(user)
      this.userId.set(user.id);

      // const persona = user.persona || {};
      this.profileForm.patchValue({
        fullName: user.fullName || '',
        username: user.username || '',
        telefono: user.telefono || '',
        ci: user.ci || '',
        email:user.email|| ''
      });

      if (user.avatarUrl) {
        this.avatarUrlBackend.set(`${this.serverFile}/${user.avatarUrl}`);
      } else {
        this.avatarUrlBackend.set('assets/default.jpg');
      }

      this.avatarFile.set(null);
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.avatarFile.set(input.files[0]);
    }
  }

  onSubmit() {
    if (this.profileForm.invalid) return;

    const formData = new FormData();
    Object.entries(this.profileForm.value).forEach(([key, value]) => {
      if (value) formData.append(key, value as string);
    });

    if (this.avatarFile()) formData.append('avatar', this.avatarFile()!);

    this.userService.updateProfile(this.userId(), formData).subscribe({
      next: () => {
        this._notificationService.showAlert('Perfil actualizado ✅');
        this.loadProfile();
      },
      error: (err) => this._notificationService.showAlert('Error al actualizar: ' + err.message),
    });
  }

  deleteAvatar() {
    this.userService.deleteAvatar().subscribe({
      next: () => {
        this.avatarUrlBackend.set('assets/default.jpg');
        this.avatarFile.set(null);
        this._notificationService.showAlert('Avatar eliminado ✅');
      },
      error: (err) => this._notificationService.showAlert(`Error: ${err.message}`),
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) return;

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this._notificationService.showAlert('❌ Las nuevas contraseñas no coinciden');
      return;
    }

    this.userService.changePassword(this.userId(), { currentPassword, newPassword }).subscribe({
      next: () => {
        this._notificationService.showAlert('✅ Contraseña actualizada correctamente');
        this.passwordForm.reset();
        this.showPasswordModal.set(false);
      },
      error: (err) => {
        this._notificationService.showAlert('❌ Error al cambiar contraseña: ' + err.message);
      },
    });
  }
}
