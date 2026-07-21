import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { AuthService } from '../../../components/services/auth.service';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private authService = inject(AuthService);
  apiUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}
  
  getAll(): Observable<any> {
    return this.authService.getAllUsers().pipe(
      tap((response) => console.log('Users response:', response)),
      map((response: any) => {
        if (response.success && response.data && Array.isArray(response.data.users)) {
          return response;
        }
        return {
          success: true,
          data: {
            users: Array.isArray(response) ? response : [],
          },
        };
      })
    );
  }

  getById(id: number): Observable<any> {
    return this.authService.getUserById(id).pipe(
      tap((response) => console.log('User by ID response:', response)),
      map((response: any) => {
        if (response.success && response.data) {
          return response;
        }
        return {
          success: true,
          data: response || null,
        };
      })
    );
  }

  update(id: number, userData: any): Observable<any> {
    return this.authService.updateUser(id, userData);
  }

  delete(id: number): Observable<any> {
    return this.authService.deleteUser(id);
  }
    
  changePassword(
    userId: any,
    payload: { currentPassword: any; newPassword: any }
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/change-password`, payload);
  }

  deleteAvatar(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/profile/avatar`);
  }
  
  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/profile`);
  }
  
  updateProfile(id: any, data: FormData): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${id}`, data);
  }

  getAsesoresYAdministradores(): Observable<any> {
    return this.authService.getAllUsers().pipe(
      map((response: any) => {
        if (response.success && response.data && Array.isArray(response.data.users)) {
          const usuariosFiltrados = response.data.users.filter((user: any) => 
            user.role === 'ASESOR' || user.role === 'ADMINISTRADOR'
          );
          return {
            success: true,
            data: {
              users: usuariosFiltrados
            }
          };
        }
        return {
          success: true,
          data: {
            users: []
          }
        };
      })
    );
  }


// UserService Angular
asignarUrbanizaciones(userId: number, urbanizacionIds: number[]): Observable<any> {
  return this.http.patch(`${this.apiUrl}/auth/${userId}/urbanizaciones`, {
    urbanizacionIds,
  });
}

}