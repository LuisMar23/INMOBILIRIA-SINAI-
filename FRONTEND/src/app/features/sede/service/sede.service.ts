import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment.prod';
import { SedeDto, CreateSedeDto, UpdateSedeDto } from '../../../core/interfaces/sede.interface';


interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class SedeService {
  private apiUrl = `${environment.apiUrl}/sedes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<SedeDto[]> {
    return this.http
      .get<ApiResponse<SedeDto[]>>(this.apiUrl)
      .pipe(
        map((res) =>
          res.success && res.data ? (Array.isArray(res.data) ? res.data : [res.data]) : [],
        ),
      );
  }

  getById(id: number): Observable<SedeDto> {
    return this.http.get<ApiResponse<SedeDto>>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        if (res.success) return res.data;
        throw new Error(res.message);
      }),
    );
  }

  create(data: CreateSedeDto): Observable<any> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, data).pipe(
      map((res) => {
        if (res.success) return res;
        throw new Error(res.message);
      }),
    );
  }

  update(id: number, data: UpdateSedeDto): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, data).pipe(
      map((res) => {
        if (res.success) return res;
        throw new Error(res.message);
      }),
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        if (res.success) return res;
        throw new Error(res.message);
      }),
    );
  }
}
