import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CobrosService } from '../../service/cobros.service';
import { VentaDto } from '../../../../core/interfaces/venta.interface';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';

@Component({
  selector: 'app-cobros-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cobros-list.html',
})
export class CobrosList implements OnInit {
  private cobrosService = inject(CobrosService);
  private router = inject(Router);
  private urbanizacionContext = inject(UrbanizacionContextService);

  allVentas = signal<VentaDto[]>([]);
  cargando = signal(true);

  filtroCliente = signal('');
  filtroLote = signal('');
  filtroUrbanizacion = signal('');
  filtroEncargado = signal('');

  ventas = computed(() => {
    const urbanizacionActiva = this.urbanizacionContext.urbanizacion();
    let ventas = this.allVentas();

    if (urbanizacionActiva) {
      ventas = ventas.filter(venta => {
        if (venta.inmuebleTipo === 'LOTE' && venta.lote?.urbanizacion) {
          return venta.lote.urbanizacion.id === urbanizacionActiva.id;
        }
        if (venta.inmuebleTipo === 'PROPIEDAD' && venta.propiedad?.urbanizacion) {
          return venta.propiedad.urbanizacion.id === urbanizacionActiva.id;
        }
        return false;
      });
    }

    return ventas;
  });

  ngOnInit(): void {
    this.urbanizacionContext.recuperar();
    this.cargarVentas();
  }

  cargarVentas(): void {
    this.cargando.set(true);
    this.cobrosService
      .obtenerVentas({
        cliente: this.filtroCliente() || undefined,
        lote: this.filtroLote() || undefined,
        urbanizacion: this.filtroUrbanizacion() || undefined,
        encargado: this.filtroEncargado() || undefined,
      })
      .subscribe({
        next: (data) => {
          this.allVentas.set(data);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  onBuscar(): void {
    this.cargarVentas();
  }

  irACobro(ventaId: number): void {
    this.router.navigate(['/cobros', ventaId]);
  }

  formatPrecio(valor: number): string {
    return valor.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  getEstadoBadge(estado: string): string {
    const clases: Record<string, string> = {
      PENDIENTE: 'px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700',
      PAGADO: 'px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700',
      CANCELADO: 'px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700',
    };
    return clases[estado] || clases['PENDIENTE'];
  }

  getSaldoPendiente(venta: VentaDto): number {
    return venta.planPago?.saldo_pendiente ?? 0;
  }
}