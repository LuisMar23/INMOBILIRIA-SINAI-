import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faEdit,
  faTrash,
  faSearch,
  faUser,
  faEnvelope,
  faUserCircle,
  faUserTimes,
  faUsers,
  faUserEdit,
  faPhone,
  faMapMarkerAlt,
  faUserShield,
  faIdCard,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import { UserService } from '../../services/users.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, FormsModule],
  templateUrl: './users-list.html',
})
export class UsersComponent implements OnInit {
  faEdit = faEdit;
  faTrash = faTrash;
  faSearch = faSearch;
  faUser = faUser;
  faEnvelope = faEnvelope;
  faUserCircle = faUserCircle;
  faUserTimes = faUserTimes;
  faUsers = faUsers;
  faUserEdit = faUserEdit;
  faPhone = faPhone;
  faMapMarkerAlt = faMapMarkerAlt;
  faUserShield = faUserShield;
  faIdCard = faIdCard;


faUserPlus = faUserPlus; // Agregar esta propiedad
  users = signal<any[]>([]);
  allUsers = signal<any[]>([]);
  searchTerm = signal('');
  isLoading = signal(false);

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const users = this.allUsers();

    if (!term) return users;

    return users.filter(
      (user: any) =>
        user.username?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.role?.toLowerCase().includes(term) ||
        user.fullName?.toLowerCase().includes(term)
    );
  });

  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);

  constructor() {
    this.loadUsers();
  }

  ngOnInit() {
    this.route.url.subscribe(() => {
      this.loadUsers();
    });
  }

  loadUsers() {
    this.isLoading.set(true);
    this.userService.getAll().subscribe({
      next: (response: any) => {
        this.isLoading.set(false);

        if (response.success && response.data && Array.isArray(response.data.users)) {
          this.allUsers.set(response.data.users);
        } else {
          this.allUsers.set([]);
        }

        this.users.set([...this.allUsers()]);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.notificationService.showError('Error al cargar los usuarios');
        this.allUsers.set([]);
        this.users.set([]);
      },
    });
  }

  applyFilter() {
  }

  deleteUser(user: any) {
    this.notificationService
      .confirmDelete(`¿Estás seguro de eliminar al usuario ${user.username}?`)
      .then((result) => {
        if (result.isConfirmed) {
          this.userService.delete(user.id).subscribe({
            next: (response: any) => {
              this.notificationService.showSuccess(
                response.message || 'Usuario eliminado correctamente'
              );
              this.loadUsers();
            },
            error: (err: any) => {
              this.notificationService.showError('Error al eliminar usuario');
            },
          });
        }
      });
  }

  getRoleClass(role: string): string {
    switch (role) {
      case 'ADMINISTRADOR':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'ASESOR':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'SECRETARIA':
        return 'bg-pink-100 text-pink-800 border border-pink-200';
      case 'USUARIO':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-600 border border-gray-200';
    }
  }

  getStatusClass(isActive: boolean): string {
    return isActive
      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
      : 'bg-red-100 text-red-800 border border-red-200';
  }
}