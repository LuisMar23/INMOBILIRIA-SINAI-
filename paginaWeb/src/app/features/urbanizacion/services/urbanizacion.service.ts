import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Urbanizacion } from '../../../core/interfaces/datos.interface';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UrbanizacionService {
  private baseUrl = environment.apiUrl + '/public/urbanizaciones';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Urbanizacion[]> {
    return this.http
      .get<{ data: Urbanizacion[] }>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  getByUuid(uuid: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/uuid/${uuid}`);
  }
}