import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Lote, Urbanizacion } from '../../../core/interfaces/datos.interface';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UrbanizacionService {
  private baseUrl = environment.apiUrl + '/urbanizaciones';

  constructor(private http: HttpClient) {}

  // Traer todas las urbanizaciones

  getAll(): Observable<Urbanizacion[]> {
    return this.http
      .get<{ data: Urbanizacion[] }>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  // Traer una urbanización por uuid incluyendo sus lotes
  getByUuid(uuid: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/uuid/${uuid}`);
  }
}
