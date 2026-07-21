import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getResumen(): Observable<any> {
    return this.http.get(`${this.api}/resumen`);
  }

  getActividad(): Observable<any> {
    return this.http.get(`${this.api}/actividad`);
  }
}
