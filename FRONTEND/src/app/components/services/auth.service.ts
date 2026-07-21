import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginDto } from '../../core/interfaces/login.interface';
import { RegisterDto } from '../../core/interfaces/register.interface';
import { Router } from '@angular/router';

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: any;
    accessToken: string;
    refreshToken: string;
   permisos: Record<string, boolean>;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: any;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      username: string;
      email: string;
      role: string;
    };
  };
}

export interface ForgotPasswordResponse {
  message?: string;
  success?: boolean;
  data?: any;
}

export interface UserResponse {
  success: boolean;
  data: {
    user?: any;
    users?: any[];
    clientes?: any[];
  };
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'access_token';
  private userKey = 'user_data';

  constructor(private http: HttpClient, private router: Router) {}

  // ========== AUTH METHODS ==========
login(data: LoginDto): Observable<LoginResponse> {
  return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, data).pipe(
    tap((res) => {
       console.log('permisos que llegan:', res.data.permisos)
      if (res.data) {
        if (data.rememberMe) {
          localStorage.setItem(this.tokenKey, res.data.accessToken);
          localStorage.setItem('refresh_token', res.data.refreshToken);
          localStorage.setItem(this.userKey, JSON.stringify(res.data.user));
          localStorage.setItem('permisos', JSON.stringify(res.data.permisos ?? {})); 
        } else {
          sessionStorage.setItem(this.tokenKey, res.data.accessToken);
          sessionStorage.setItem('refresh_token', res.data.refreshToken);
          sessionStorage.setItem(this.userKey, JSON.stringify(res.data.user));
          sessionStorage.setItem('permisos', JSON.stringify(res.data.permisos ?? {})); 
        }
      }
    }),
    catchError((error) => {
      let errorMessage = 'Error en el login';
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status === 401) {
        errorMessage = 'Credenciales incorrectas';
      } else if (error.status === 423) {
        errorMessage = 'Cuenta bloqueada temporalmente';
      }
      return throwError(() => new Error(errorMessage));
    })
  );
}
getAsesores(): Observable<UserResponse> {
  const params = new HttpParams().set('role', 'ASESOR,ADMINISTRADOR');
  return this.http.get<UserResponse>(`${this.apiUrl}/auth/users`, { params }).pipe(
    catchError((error) => {
      console.error('Error al obtener asesores:', error);
      return throwError(() => new Error('Error al cargar los asesores'));
    })
  );
}
  register(data: RegisterDto): Observable<RegisterResponse> {
    const registerData = {
      ...data,
      role: data.role || 'USUARIO',
    };

    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`, registerData).pipe(
      tap((res) => {
        console.log('Respuesta registro completa:', res);
      }),
      catchError((error) => {
        console.error('Error en registro service:', error);
        let errorMessage = 'Error al registrar usuario';

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 409) {
          if (error.error.message?.includes('email')) {
            errorMessage = 'El email ya está registrado';
          } else if (error.error.message?.includes('usuario')) {
            errorMessage = 'El nombre de usuario ya existe';
          } else if (error.error.message?.includes('CI')) {
            errorMessage = 'El CI ya está registrado';
          } else if (error.error.message?.includes('teléfono')) {
            errorMessage = 'El teléfono ya está registrado';
          } else {
            errorMessage = 'El usuario o email ya existe';
          }
        } else if (error.status === 400) {
          errorMessage = 'Datos inválidos en el formulario';
        } else if (error.status === 0) {
          errorMessage = 'Error de conexión con el servidor';
        }

        return throwError(() => ({
          message: errorMessage,
          status: error.status,
          error: error.error,
        }));
      })
    );
  }

  changePassword(data: {
    identifier: string;
    newPassword: string;
    confirmPassword: string;
  }): Observable<ChangePasswordResponse> {
    return this.http.post<ChangePasswordResponse>(`${this.apiUrl}/auth/change-password`, data).pipe(
      catchError((error) => {
        console.error('Error en change password service:', error);
        let errorMessage = 'Error al cambiar la contraseña';

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 404) {
          errorMessage = 'No se encontró ningún usuario con ese username o email';
        } else if (error.status === 400) {
          errorMessage = 'Datos inválidos. Verifica la información ingresada.';
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  refreshToken(): Observable<string> {
    const token = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
    if (!token) {
      this.logout();
      throw new Error('No hay refresh token disponible');
    }

    return this.http
      .post<{ data: { accessToken: string; refreshToken: string } }>(
        `${this.apiUrl}/auth/refresh`,
        {
          refreshToken: token,
        }
      )
      .pipe(
        tap((res) => {
          const storage = localStorage.getItem('refresh_token') ? localStorage : sessionStorage;
          storage.setItem('access_token', res.data.accessToken);
          storage.setItem('refresh_token', res.data.refreshToken);
        }),
        map((res) => res.data.accessToken),
        catchError((error) => {
          this.logout();
          return throwError(() => new Error('Error al refrescar token'));
        })
      );
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    return this.http
      .post<ForgotPasswordResponse>(`${this.apiUrl}/auth/forgot-password`, { email })
      .pipe(
        catchError((error) => {
          let errorMessage = 'Error al enviar el correo de recuperación';

          if (error.status === 404) {
            errorMessage = 'No se encontró una cuenta con este email';
          } else if (error.status === 429) {
            errorMessage = 'Demasiados intentos. Por favor, espera unos minutos';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // ========== USERS CRUD METHODS (ADMINISTRADOR, ASESOR, SECRETARIA, USUARIO) ==========
  getAllUsers(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/auth/users`).pipe(

      catchError((error) => {
              console.log()
        console.error('Error al obtener usuarios:', error);
        let errorMessage = 'Error al cargar los usuarios';

        if (error.error?.message) {
          errorMessage = error.error.message;
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  getUserById(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/auth/users/${id}`).pipe(
      catchError((error) => {
        console.error('Error al obtener usuario:', error);
        let errorMessage = 'Error al cargar el usuario';

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 404) {
          errorMessage = 'Usuario no encontrado';
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  updateUser(id: number, userData: any): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.apiUrl}/auth/users/${id}`, userData).pipe(
      catchError((error) => {
        console.error('Error al actualizar usuario:', error);
        let errorMessage = 'Error al actualizar el usuario';

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 404) {
          errorMessage = 'Usuario no encontrado';
        } else if (error.status === 409) {
          errorMessage = 'El email, username, CI o teléfono ya está en uso';
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  deleteUser(id: number): Observable<UserResponse> {
    return this.http.delete<UserResponse>(`${this.apiUrl}/auth/users/${id}`).pipe(
      catchError((error) => {
        console.error('Error al eliminar usuario:', error);
        let errorMessage = 'Error al eliminar el usuario';

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 404) {
          errorMessage = 'Usuario no encontrado';
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // ========== CLIENTES CRUD METHODS (CLIENTES QUE NO INICIAN SESIÓN) ==========
  registerCliente(clienteData: any): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/auth/register-cliente`, clienteData).pipe(
      catchError((error) => {
        console.error('Error al registrar cliente:', error);
        let errorMessage = 'Error al registrar el cliente';

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 409) {
          errorMessage = 'Ya existe un cliente con este CI o teléfono';
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  getClientes(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/auth/clientes`).pipe(
      catchError((error) => {
        console.error('Error al obtener clientes:', error);
        let errorMessage = 'Error al cargar los clientes';

        if (error.error?.message) {
          errorMessage = error.error.message;
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  getClienteById(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/auth/users/${id}`).pipe(
      catchError((error) => {
        console.error('Error al obtener cliente:', error);
        let errorMessage = 'Error al cargar el cliente';

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 404) {
          errorMessage = 'Cliente no encontrado';
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }
gettClienteById(id: number): Observable<UserResponse> {
  // ❌ ANTES: apuntaba a /auth/users/${id}
  // ✅ AHORA: apunta a /auth/${id}
  return this.http.get<UserResponse>(`${this.apiUrl}/auth/${id}`).pipe(
    catchError((error) => {
      console.error('Error al obtener cliente:', error);
      let errorMessage = 'Error al cargar el cliente';

      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status === 404) {
        errorMessage = 'Cliente no encontrado';
      }

      return throwError(() => new Error(errorMessage));
    })
  );
}
  updateCliente(id: number, clienteData: any): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.apiUrl}/auth/clientes/${id}`, clienteData).pipe(
      catchError((error) => {
        console.error('Error al actualizar cliente:', error);
        let errorMessage = 'Error al actualizar el cliente';

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 404) {
          errorMessage = 'Cliente no encontrado';
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  deleteCliente(id: number): Observable<UserResponse> {
    return this.http.delete<UserResponse>(`${this.apiUrl}/auth/clientes/${id}`).pipe(
      catchError((error) => {
        console.error('Error al eliminar cliente:', error);
        let errorMessage = 'Error al eliminar el cliente';

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 404) {
          errorMessage = 'Cliente no encontrado';
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // ========== UTILITY METHODS ==========
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
    }
    return null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('refresh_token');
    localStorage.removeItem(this.userKey);

    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem(this.userKey);

    this.router.navigate(['/login']);
  }

  getCurrentUser(): any {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey);
      if (userData) {
        try {
          return JSON.parse(userData);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
    return null;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('ADMINISTRADOR');
  }

  canManageUsers(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'ADMINISTRADOR' || user?.role === 'ASESOR';
  }


  
}
