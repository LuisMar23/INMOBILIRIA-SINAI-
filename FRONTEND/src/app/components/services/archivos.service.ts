import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UploadArchivosService {
  private baseUrl = environment.apiUrl + '/archivos';

  constructor(private http: HttpClient) {}

  subirArchivos(
    files: File[],
    opciones: {
      ventaId?: number;
      reservaId?: number;
      loteId?: number;
      urbanizacionId?: number;
      propiedadId?: number;
    } = {}
  ): Observable<any> {
    const formData = new FormData();

    for (const file of files) {
      formData.append('files', file);
    }

    if (opciones.ventaId) formData.append('ventaId', opciones.ventaId.toString());
    if (opciones.reservaId) formData.append('reservaId', opciones.reservaId.toString());
    if (opciones.loteId) formData.append('loteId', opciones.loteId.toString());
    if (opciones.urbanizacionId)
      formData.append('urbanizacionId', opciones.urbanizacionId.toString());
    if (opciones.propiedadId) formData.append('propiedadId', opciones.propiedadId.toString());

    const url = `${this.baseUrl}/upload`;

    return this.http.post(url, formData);
  }

  actualizarArchivos(
    files: File[],
    opciones: {
      ventaId?: number;
      reservaId?: number;
      loteId?: number;
      urbanizacionId?: number;
      propiedadId?: number;
    } = {}
  ): Observable<any> {
    const formData = new FormData();
    for (const file of files) formData.append('files', file);

    if (opciones.ventaId) formData.append('ventaId', opciones.ventaId.toString());
    if (opciones.reservaId) formData.append('reservaId', opciones.reservaId.toString());
    if (opciones.loteId) formData.append('loteId', opciones.loteId.toString());
    if (opciones.urbanizacionId)
      formData.append('urbanizacionId', opciones.urbanizacionId.toString());
    if (opciones.propiedadId) formData.append('propiedadId', opciones.propiedadId.toString());

    return this.http.post(`${this.baseUrl}/update`, formData);
  }

  eliminarArchivo(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }
}
