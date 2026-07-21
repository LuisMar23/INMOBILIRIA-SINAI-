import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PagoPlanPagoCobro, IngresoPorBanco, ReciboEmitido, OtroIngreso, OtroIngresoPorConcepto, ConsolidadoGastos, GastoPorBanco, GastoPorConcepto, OpcionesFiltros, FiltroCobroCuotas, FiltroFecha, FiltroRecibos, FiltroOtrosIngresos, FiltroGastos,Egreso } from '../../../core/interfaces/reportes- financiero';

// Ajusta esta ruta a tu archivo de environment real


/**
 * Contenedor de estado reactivo para un reporte individual: datos, si está
 * cargando, y el último error. Cada reporte del service tiene el suyo, así
 * el componente puede bindear directamente `service.cobroCuotas.datos()`,
 * `service.cobroCuotas.cargando()`, etc. en el template sin lógica extra.
 */
export class ReporteStore<T> {
  private readonly _datos = signal<T | null>(null);
  private readonly _cargando = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly datos = this._datos.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly error = this._error.asReadonly();

  async cargar(peticion$: Observable<T>): Promise<T | null> {
    this._cargando.set(true);
    this._error.set(null);
    try {
      const resultado = await firstValueFrom(peticion$);
      this._datos.set(resultado);
      return resultado;
    } catch (err) {
      console.error('Error cargando reporte:', err);
      this._error.set('No se pudo cargar el reporte. Intenta nuevamente.');
      return null;
    } finally {
      this._cargando.set(false);
    }
  }

  limpiar(): void {
    this._datos.set(null);
    this._error.set(null);
  }
}

@Injectable({ providedIn: 'root' })
export class ReportesFinancierosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reportes`;

  // ── Ingresos por ventas (fuente real: PagoPlanPago / MovimientoCaja) ──
  readonly cobroCuotas = new ReporteStore<PagoPlanPagoCobro[]>();
  readonly ingresosPorBanco = new ReporteStore<IngresoPorBanco[]>();
  readonly recibos = new ReporteStore<ReciboEmitido[]>();

  // ── Otros ingresos (modelo Ingreso, no ligado a ventas) ──────────
  readonly otrosIngresos = new ReporteStore<OtroIngreso[]>();
  readonly otrosIngresosPorConcepto = new ReporteStore<OtroIngresoPorConcepto[]>();

  // ── Gastos ────────────────────────────────────────────────────────
  readonly gastos = new ReporteStore<Egreso[]>();
  readonly consolidadoGastos = new ReporteStore<ConsolidadoGastos>();
  readonly gastosPorBanco = new ReporteStore<GastoPorBanco[]>();
  readonly gastosPorConcepto = new ReporteStore<GastoPorConcepto[]>();

  // ── Opciones para los <select> del panel de filtros ──────────────
  readonly opcionesFiltros = new ReporteStore<OpcionesFiltros>();

  private buildParams<T extends object>(filtros: T = {} as T): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filtros as Record<string, unknown>)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  // ── 1. Reporte Cobro Cuotas ───────────────────────────────────────
  cargarCobroCuotas(filtros: FiltroCobroCuotas = {}) {
    return this.cobroCuotas.cargar(
      this.http.get<PagoPlanPagoCobro[]>(`${this.baseUrl}/ingresos/cobro-cuotas`, {
        params: this.buildParams(filtros),
      }),
    );
  }

  // ── 2. Ingresos por Banco ─────────────────────────────────────────
  cargarIngresosPorBanco(filtros: FiltroFecha = {}) {
    return this.ingresosPorBanco.cargar(
      this.http.get<IngresoPorBanco[]>(`${this.baseUrl}/ingresos/por-banco`, {
        params: this.buildParams(filtros),
      }),
    );
  }

  // ── 3. Recibos Emitidos ───────────────────────────────────────────
  cargarRecibos(filtros: FiltroRecibos = {}) {
    return this.recibos.cargar(
      this.http.get<ReciboEmitido[]>(`${this.baseUrl}/ingresos/recibos`, {
        params: this.buildParams(filtros),
      }),
    );
  }

  // ── 4. Otros Ingresos ─────────────────────────────────────────────
  cargarOtrosIngresos(filtros: FiltroOtrosIngresos = {}) {
    return this.otrosIngresos.cargar(
      this.http.get<OtroIngreso[]>(`${this.baseUrl}/ingresos/otros`, {
        params: this.buildParams(filtros),
      }),
    );
  }

  // ── 5. Otros Ingresos por Concepto ────────────────────────────────
  cargarOtrosIngresosPorConcepto(filtros: FiltroFecha = {}) {
    return this.otrosIngresosPorConcepto.cargar(
      this.http.get<OtroIngresoPorConcepto[]>(`${this.baseUrl}/ingresos/otros/por-concepto`, {
        params: this.buildParams(filtros),
      }),
    );
  }

  // ── 6. Reporte de Gastos ──────────────────────────────────────────
  cargarGastos(filtros: FiltroGastos = {}) {
    return this.gastos.cargar(
      this.http.get<Egreso[]>(`${this.baseUrl}/gastos`, {
        params: this.buildParams(filtros),
      }),
    );
  }

  // ── 7. Consolidado de Gastos ──────────────────────────────────────
  cargarConsolidadoGastos(filtros: FiltroFecha = {}) {
    return this.consolidadoGastos.cargar(
      this.http.get<ConsolidadoGastos>(`${this.baseUrl}/gastos/consolidado`, {
        params: this.buildParams(filtros),
      }),
    );
  }

  // ── 8. Gastos por Banco ───────────────────────────────────────────
  cargarGastosPorBanco(filtros: FiltroFecha = {}) {
    return this.gastosPorBanco.cargar(
      this.http.get<GastoPorBanco[]>(`${this.baseUrl}/gastos/por-banco`, {
        params: this.buildParams(filtros),
      }),
    );
  }

  // ── 9. Gastos por Concepto ────────────────────────────────────────
  cargarGastosPorConcepto(filtros: FiltroFecha = {}) {
    return this.gastosPorConcepto.cargar(
      this.http.get<GastoPorConcepto[]>(`${this.baseUrl}/gastos/por-concepto`, {
        params: this.buildParams(filtros),
      }),
    );
  }

  // ── Opciones para los <select> del panel de filtros ──────────────
  cargarOpcionesFiltros() {
    return this.opcionesFiltros.cargar(
      this.http.get<OpcionesFiltros>(`${this.baseUrl}/filtros/opciones`),
    );
  }
}