import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  VentaDto,
  CreateVentaDto,
  UpdateVentaDto,
  RegistrarPagoDto,
} from '../../../core/interfaces/venta.interface';
import { Caja } from '../../../core/interfaces/caja.interface';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface VentasResponse {
  ventas: VentaDto[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface VentaResponse {
  venta: VentaDto;
}

@Injectable({
  providedIn: 'root',
})
export class VentaService {
  apiUrl = `${environment.apiUrl}/ventas`;

  constructor(private http: HttpClient) {}

  getAll(
    clienteId?: number,
    asesorId?: number,
    page: number = 1,
    limit: number = 10,
  ): Observable<{ ventas: VentaDto[]; pagination: any }> {
    let url = this.apiUrl;
    const params = [];
    if (clienteId) params.push(`clienteId=${clienteId}`);
    if (asesorId) params.push(`asesorId=${asesorId}`);
    if (page > 1) params.push(`page=${page}`);
    if (limit !== 10) params.push(`limit=${limit}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<ApiResponse<VentasResponse>>(url).pipe(
      map((response) => {
        if (response.success && response.data) {
          return {
            ventas: response.data.ventas ? response.data.ventas.map((v) => this.parseVenta(v)) : [],
            pagination: response.data.pagination || {
              page,
              limit,
              total: response.data.ventas?.length || 0,
              pages: 1,
            },
          };
        }
        throw new Error('Respuesta inválida del servidor');
      }),
      catchError((error) => {
        console.error('Error loading sales:', error);
        return throwError(() => error);
      }),
    );
  }

  getById(id: number): Observable<VentaDto> {
    return this.http.get<ApiResponse<VentaResponse>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => {
        if (response.success && response.data.venta) {
          return this.parseVenta(response.data.venta);
        }
        throw new Error('Venta no encontrada');
      }),
      catchError((error) => {
        console.error('Error loading sale:', error);
        return throwError(() => error);
      }),
    );
  }
create(formData: FormData): Observable<any> {
  return this.http.post<ApiResponse<any>>(this.apiUrl, formData).pipe(
    map((response) => {
      if (!response.success) {
        throw new Error(response.message || 'Error al crear venta');
      }
      return response;
    }),
    catchError((error) => {
      console.error('Error creating sale:', error);
      return throwError(() => error);
    }),
  );
}

update(id: number, venta: UpdateVentaDto): Observable<any> {
  const updateData: any = {};

  if (venta.clienteId !== undefined) updateData.clienteId = Number(venta.clienteId);
  if (venta.asesorId !== undefined) updateData.asesorId = Number(venta.asesorId); // 👈 faltaba esto
  if (venta.precioFinal !== undefined) updateData.precioFinal = Number(venta.precioFinal);
  if (venta.estado !== undefined) updateData.estado = venta.estado;
  if (venta.observaciones !== undefined) updateData.observaciones = venta.observaciones;

  return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}`, updateData).pipe(
    map((response) => {
      if (!response.success) {
        throw new Error(response.message || 'Error al actualizar venta');
      }
      return response;
    }),
    catchError((error) => {
      console.error('Error updating sale:', error);
      return throwError(() => error);
    }),
  );
}

actualizarPlanPago(planPagoId: number, planPagoData: {
  inicial?: {
    montoInicial: number;
    fraccionado: boolean;
    modalidad?: string;
    cantidadPagos?: number;
    fechaInicio?: string;
  };
  principal?: {
    modalidad: string;
    numeroCuotas: number;
    fechaPrimeraCuota: string;
  };
  adicional?: {
    activo: boolean;
    montoAdicional?: number;
    modalidad?: string;
    cantidadPagos?: number;
    fechaInicio?: string;
  };
}): Observable<any> {
  return this.http
    .patch<ApiResponse<any>>(`${this.apiUrl}/planes-pago/${planPagoId}`, planPagoData)
    .pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'Error al actualizar plan de pago');
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error updating payment plan:', error);
        return throwError(() => error);
      }),
    );
}

actualizarMontoInicialPlanPago(
  ventaId: number,
  nuevoInicial: {
    montoInicial: number;
    fraccionado: boolean;
    modalidad?: string;
    cantidadPagos?: number;
    fechaInicio?: string;
  },
  cajaId: number,
): Observable<any> {
  return this.http
    .patch<ApiResponse<any>>(`${this.apiUrl}/plan-pago/${ventaId}/monto-inicial`, {
      nuevoInicial,   
      cajaId,
    })
    .pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'Error al actualizar monto inicial');
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error updating initial amount:', error);
        return throwError(() => error);
      }),
    );
}

  delete(id: number, cajaId: number): Observable<any> {
    return this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/${id}`, {
        body: { cajaId },
      })
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message || 'Error al eliminar venta');
          }
          return response;
        }),
        catchError((error) => {
          console.error('Error deleting sale:', error);
          return throwError(() => error);
        }),
      );
  }

  crearPagoPlan(pagoData: RegistrarPagoDto): Observable<any> {
    const pagoDataFormatted = {
      plan_pago_id: Number(pagoData.plan_pago_id),
      monto: Number(pagoData.monto),
      fecha_pago: pagoData.fecha_pago,
      observacion: pagoData.observacion,
      metodoPago: pagoData.metodoPago || 'EFECTIVO',
    };

    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/pagos/registrar`, pagoDataFormatted)
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message || 'Error al crear pago');
          }
          return response;
        }),
        catchError((error) => {
          console.error('Error creating payment:', error);
          return throwError(() => error);
        }),
      );
  }

  actualizarPagoPlan(pagoId: number, updateData: any): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/pagos/${pagoId}`, updateData).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'Error al actualizar pago');
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error updating payment:', error);
        return throwError(() => error);
      }),
    );
  }

  eliminarPagoPlan(pagoId: number, cajaId: number): Observable<any> {
    return this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/pagos/${pagoId}`, {
        body: { cajaId },
      })
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message || 'Error al eliminar pago');
          }
          return response;
        }),
        catchError((error) => {
          console.error('Error deleting payment:', error);
          return throwError(() => error);
        }),
      );
  }

  obtenerPagosPlan(planPagoId: number): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/planes-pago/${planPagoId}/pagos`).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'Error al cargar pagos');
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error loading payments:', error);
        return throwError(() => error);
      }),
    );
  }

  obtenerResumenPlanPago(ventaId: number): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${ventaId}/resumen-pago`).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'Error al cargar resumen');
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error loading payment summary:', error);
        return throwError(() => error);
      }),
    );
  }

  obtenerPlanesPagoActivos(page: number = 1, limit: number = 10): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/planes-pago/activos?page=${page}&limit=${limit}`)
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message || 'Error al cargar planes activos');
          }
          return response;
        }),
        catchError((error) => {
          console.error('Error loading active payment plans:', error);
          return throwError(() => error);
        }),
      );
  }

  verificarMorosidadPlanPago(ventaId: number): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/planes-pago/${ventaId}/verificar-morosidad`, {})
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message || 'Error al verificar morosidad');
          }
          return response;
        }),
        catchError((error) => {
          console.error('Error checking delinquency:', error);
          return throwError(() => error);
        }),
      );
  }

  obtenerVentasPorCliente(clienteId: number): Observable<VentaDto[]> {
    return this.http
      .get<ApiResponse<{ ventas: VentaDto[] }>>(`${this.apiUrl}/clientes/mis-ventas`)
      .pipe(
        map((response) => {
          if (response.success && response.data.ventas) {
            return response.data.ventas.map((venta) => this.parseVenta(venta));
          }
          return [];
        }),
        catchError((error) => {
          console.error('Error loading client sales:', error);
          return throwError(() => error);
        }),
      );
  }

  obtenerCajasActivas(): Observable<Caja[]> {
    return this.http.get<ApiResponse<{ cajas: Caja[] }>>(`${this.apiUrl}/cajas/activas`).pipe(
      map((response) => {
        if (response.success && response.data.cajas) {
          return response.data.cajas;
        }
        return [];
      }),
      catchError((error) => {
        console.error('Error loading active boxes:', error);
        return throwError(() => error);
      }),
    );
  }

  obtenerCronograma(ventaId: number): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${ventaId}/cronograma`).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'Error al cargar cronograma');
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error loading payment schedule:', error);
        return throwError(() => error);
      }),
    );
  }

  private parseVenta(venta: any): VentaDto {
    return {
      ...venta,
      id: Number(venta.id),
      clienteId: Number(venta.clienteId),
      asesorId: Number(venta.asesorId),
      inmuebleId: Number(venta.inmuebleId),
      precioFinal: Number(venta.precioFinal || 0),
      cliente: venta.cliente
        ? {
            ...venta.cliente,
            id: Number(venta.cliente.id),
          }
        : undefined,
      asesor: venta.asesor
        ? {
            ...venta.asesor,
            id: Number(venta.asesor.id),
          }
        : undefined,
      lote: venta.lote
        ? {
            ...venta.lote,
            id: Number(venta.lote.id),
            superficieM2: Number(venta.lote.superficieM2 || 0),
            precioBase: Number(venta.lote.precioBase || 0),
            urbanizacion: venta.lote.urbanizacion
              ? {
                  ...venta.lote.urbanizacion,
                  id: Number(venta.lote.urbanizacion.id),
                }
              : undefined,
          }
        : undefined,
      propiedad: venta.propiedad
        ? {
            ...venta.propiedad,
            id: Number(venta.propiedad.id),
            tamano: Number(venta.propiedad.tamano || 0),
            precio: Number(venta.propiedad.precio || 0),
            habitaciones: venta.propiedad.habitaciones
              ? Number(venta.propiedad.habitaciones)
              : undefined,
            banos: venta.propiedad.banos ? Number(venta.propiedad.banos) : undefined,
          }
        : undefined,
      planPago: venta.planPago
        ? {
            ...venta.planPago,
            id_plan_pago: Number(venta.planPago.id_plan_pago),
            total: Number(venta.planPago.total || 0),
            monto_inicial: Number(venta.planPago.monto_inicial || 0),
            plazo: Number(venta.planPago.plazo || 0),
            ventaId: Number(venta.planPago.ventaId),
            pagos: venta.planPago.pagos
              ? venta.planPago.pagos.map((pago: any) => ({
                  ...pago,
                  id_pago_plan: Number(pago.id_pago_plan),
                  plan_pago_id: Number(pago.plan_pago_id),
                  monto: Number(pago.monto || 0),
                }))
              : [],
            cuotas: venta.planPago.cuotas
              ? venta.planPago.cuotas.map((cuota: any) => ({
                  ...cuota,
                  id_cuota: Number(cuota.id_cuota),
                  plan_pago_id: Number(cuota.plan_pago_id),
                  numero: Number(cuota.numero),
                  monto: Number(cuota.monto),
                }))
              : [],
            saldo_pendiente: Number(venta.planPago.saldo_pendiente || 0),
            total_pagado: Number(venta.planPago.total_pagado || 0),
            porcentaje_pagado: Number(venta.planPago.porcentaje_pagado || 0),
            monto_cuota: Number(venta.planPago.monto_cuota || 0),
            dias_restantes: Number(venta.planPago.dias_restantes || 0),
          }
        : undefined,
      archivos: venta.archivos || [],
      ingresos: venta.ingresos || [],
    };
  }
}