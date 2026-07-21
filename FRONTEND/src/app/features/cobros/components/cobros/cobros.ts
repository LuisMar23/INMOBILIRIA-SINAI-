import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { VentaService } from '../../../venta/service/venta.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RegistrarPagoDto, VentaDto, Cuota } from '../../../../core/interfaces/venta.interface';

@Component({
  selector: 'app-cobros',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './cobros.html',
})
export class CobrosComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ventaSvc = inject(VentaService);
  private notif = inject(NotificationService);

  ventaId = signal<number>(0);
  venta = signal<VentaDto | null>(null);
  cargando = signal(true);
  enviandoPago = signal(false);
  pagoForm: FormGroup;

  totalPagado = signal(0);
  saldoPendiente = signal(0);

  // cuotasPendientes = computed(() => {
  //   const plan = this.venta()?.planPago;
  //   if (!plan?.cuotas) return [];
  //   return plan.cuotas.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'VENCIDA');
  // });

  constructor(private fb: FormBuilder) {
    this.pagoForm = this.fb.group({
      monto: [0, [Validators.required, Validators.min(0.01)]],
      fecha_pago: [new Date().toISOString().split('T')[0], Validators.required],
      observacion: [''],
      metodoPago: ['EFECTIVO', Validators.required],
    });
  }
private ordenTipo: Record<string, number> = { INICIAL: 0, PRINCIPAL: 1, ADICIONAL: 2 };

cuotasPendientes = computed(() => {
  const plan = this.venta()?.planPago;
  if (!plan?.cuotas) return [];
  return plan.cuotas
    .filter((c) => c.estado === 'PENDIENTE' || c.estado === 'VENCIDA' || c.estado === 'PARCIAL')
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
});
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.ventaId.set(id);
      this.cargarVenta();
    }
  }

  cargarVenta(): void {
    this.ventaSvc.getById(this.ventaId()).subscribe({
      next: (data) => {
        this.venta.set(data);
        this.calcularTotales(data);
        this.cargando.set(false);
      },
      error: () => {
        this.notif.showError('No se pudo cargar la venta');
        this.cargando.set(false);
      },
    });
  }

  calcularTotales(venta: VentaDto): void {
    if (venta.planPago) {
      this.totalPagado.set(venta.planPago.total_pagado || 0);
      this.saldoPendiente.set(venta.planPago.saldo_pendiente || 0);
    }
  }

  registrarPago(): void {
    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      this.notif.showError('Complete correctamente los campos');
      return;
    }

    const monto = Number(this.pagoForm.value.monto);
    if (monto > this.saldoPendiente()) {
      this.notif.showError(
        `El monto no puede exceder el saldo pendiente (Bs. ${this.formatPrecio(this.saldoPendiente())})`,
      );
      return;
    }

    const venta = this.venta();
    if (!venta?.planPago) {
      this.notif.showError('La venta no tiene plan de pago');
      return;
    }

    this.enviandoPago.set(true);

    const pago: RegistrarPagoDto = {
      plan_pago_id: venta.planPago.id_plan_pago,
      monto,
      fecha_pago: this.pagoForm.value.fecha_pago,
      observacion: this.pagoForm.value.observacion,
      metodoPago: this.pagoForm.value.metodoPago,
    };

    this.ventaSvc.crearPagoPlan(pago).subscribe({
      next: () => {
        this.enviandoPago.set(false);
        this.notif.showSuccess('Pago registrado exitosamente');
        this.cargarVenta();
        this.pagoForm.patchValue({ monto: 0, observacion: '' });
      },
      error: (err) => {
        this.enviandoPago.set(false);
        this.notif.showError(err.error?.message || 'Error al registrar el pago');
      },
    });
  }

  formatPrecio(valor: number): string {
    return valor.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }



  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'text-yellow-600 bg-yellow-50';
      case 'VENCIDA':
        return 'text-red-600 bg-red-50';
      case 'PAGADA':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

formatFecha(fecha: string): string {
  if (!fecha) return '';
  const soloFecha = fecha.split('T')[0];
  const [anio, mes, dia] = soloFecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

}
