import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Lote } from '../../../core/interfaces/datos.interface';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoteService {
  private baseUrl = environment.apiUrl + '/lotes';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Lote[]> {
    return this.http.get<{success: boolean, data: Lote[]}>(`${this.baseUrl}/publicos/todos`).pipe(
      map(response => response.data)
    );
  }

  getByUuid(uuid: string): Observable<Lote> {
    return this.http.get<{success: boolean, data: Lote}>(`${this.baseUrl}/publicos/uuid/${uuid}`).pipe(
      map(response => response.data) 
    );
  }

  filtrar(filtros: any): Observable<Lote[]> {
    return this.http.post<{success: boolean, data: Lote[]}>(`${this.baseUrl}/filtrar`, filtros).pipe(
      map(response => response.data)
    );
  }

  getLotesPromocion():Observable<any>{
    return this.http.get<any>(`${this.baseUrl}/publicos/con-promocion`)
  }
}