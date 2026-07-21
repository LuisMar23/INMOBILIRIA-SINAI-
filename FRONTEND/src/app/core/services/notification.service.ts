import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertPosition } from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private showToast(message: string, icon: SweetAlertIcon, timer = 2500) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title: message,
      showConfirmButton: false,
      timer,
      timerProgressBar: true,
    });
  }

  showSuccess(message: string) {
    this.showToast(message, 'success', 2000);
  }

  showError(message: string) {
    this.showToast(message, 'error', 3000);
  }

  showInfo(message: string) {
    this.showToast(message, 'info', 2500);
  }

  showWarning(message: string) {
    this.showToast(message, 'warning', 2500);
  }

  showAlert(message: string, title = 'Atención', icon: SweetAlertIcon = 'info') {
    return Swal.fire({
      title,
      text: message,
      icon,
      confirmButtonText: 'OK',
      position: 'center',
      timerProgressBar: false,
    });
  }

  confirmDelete(message: string, title = '¿Estás seguro?') {
    return Swal.fire({
      title,
      text: message,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      position: 'center',
      reverseButtons: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#95a5a6',
    });
  }
}
