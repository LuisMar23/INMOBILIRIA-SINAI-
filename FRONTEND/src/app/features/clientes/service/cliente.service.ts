import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { AuthService } from '../../../components/services/auth.service';

export interface CreateClienteDto {
  fullName: string;
  ci: string;
  telefono: string;
  direccion?: string;
  observaciones?: string;
}

export interface UpdateClienteDto {
  fullName: string;
  telefono: string;
  direccion?: string;
  observaciones?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ClientesService {
  private authService = inject(AuthService);

  getClientes(): Observable<any> {
    return this.authService.getClientes().pipe(
      tap((response) => console.log('Clientes response:', response)), // Para debug
      map((response: any) => {
        if (response.success && response.data && Array.isArray(response.data.clientes)) {
          return response;
        }
        // Si la respuesta no tiene la estructura esperada, crear una estructura válida
        return {
          success: true,
          data: {
            clientes: Array.isArray(response) ? response : [],
          },
        };
      })
    );
  }

  getById(id: number): Observable<any> {
    return this.authService.getClienteById(id).pipe(
      tap((response) => console.log('Cliente by ID response:', response)), // Para debug
      map((response: any) => {
        if (response.success && response.data) {
          return response;
        }
        // Si la respuesta no tiene la estructura esperada, crear una estructura válida
        return {
          success: true,
          data: response || null,
        };
      })
    );
  }
  getByClienteId(id: number): Observable<any> {
    return this.authService.gettClienteById(id).pipe(
      tap((response) => console.log('Cliente by ID response:', response)), // Para debug
      map((response: any) => {
        if (response.success && response.data) {
          return response;
        }
        // Si la respuesta no tiene la estructura esperada, crear una estructura válida
        return {
          success: true,
          data: response || null,
        };
      })
    );
  }
  create(clienteData: CreateClienteDto): Observable<any> {
    return this.authService.registerCliente(clienteData);
  }

  update(id: number, clienteData: UpdateClienteDto): Observable<any> {
    return this.authService.updateCliente(id, clienteData);
  }

  delete(id: number): Observable<any> {
    return this.authService.deleteCliente(id);
  }



}
