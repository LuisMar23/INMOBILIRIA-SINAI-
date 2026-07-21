import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { VisitaDto } from '../../../core/interfaces/visita.interface';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class VisitaService {
  private apiUrl = `${environment.apiUrl}/visitas`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<VisitaDto[]> {
    return this.http
      .get<ApiResponse<VisitaDto[]>>(this.apiUrl)
      .pipe(map((response) => response.data));
  }

  getById(id: number): Observable<VisitaDto> {
    return this.http
      .get<ApiResponse<VisitaDto>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  create(visita: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, visita);
  }

  update(id: number, visita: any): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, visita);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }
}