import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment.prod';
import {
  CreditoRow,
  ListarCreditosDto,
  ListarCreditosResponse,
} from '../../../core/interfaces/creditos.interface';

@Injectable({ providedIn: 'root' })
export class CreditosService {
  private apiUrl = `${environment.apiUrl}/creditos`;

  // ── Signals de estado ──────────────────────────────────────
  creditos = signal<CreditoRow[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  pagination = signal({ total: 0, page: 1, limit: 10, totalPages: 1 });

  currentPage = computed(() => this.pagination().page);
  totalPages = computed(() => this.pagination().totalPages);
  totalItems = computed(() => this.pagination().total);

  constructor(private http: HttpClient) {}

  // ── Listar créditos ────────────────────────────────────────
listar(dto: ListarCreditosDto = {}) {
  this.loading.set(true);
  this.error.set(null);

  let params = new HttpParams();
  if (dto.search)          params = params.set('search', dto.search);
  if (dto.ciudad)          params = params.set('ciudad', dto.ciudad);
  if (dto.urbanizacion)    params = params.set('urbanizacion', dto.urbanizacion);
  if (dto.urbanizacionId)  params = params.set('urbanizacionId', String(dto.urbanizacionId)); // ← agregar
  if (dto.page)            params = params.set('page', String(dto.page));
  if (dto.limit)           params = params.set('limit', String(dto.limit));

  return this.http.get<ListarCreditosResponse>(this.apiUrl, { params }).pipe(
    tap({
      next: (res) => {
        this.creditos.set(res.data ?? []);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al cargar créditos');
        this.loading.set(false);
      },
    }),
  );
}
  getHistorialPagos(ventaId: number) {
    return this.http.get(`${this.apiUrl}/${ventaId}/historial-pagos`);
  }
// ── AGREGAR al credito.service.ts de Angular ──

getCronograma(ventaId: number) {
  return this.http.get(`${this.apiUrl}/${ventaId}/cronograma`);
}

}
