import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiltrosReporteDto } from '../../../core/interfaces/reportes.interface';
import { ReportesService } from '../services/reportes.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { UrbanizacionContextService } from '../../../core/services/urbanizacion-context.service';
import { AuthService } from '../../../components/services/auth.service';
import { ManzanoService } from '../../manzano/service/manzano.service';

interface ManzanoDto {
  id: number;
  uuid: string;
  nombre: string;
}

type TipoReporte = 'general' | 'vendedores' | 'detalle' | 'cuotas' | 'completadas' | 'cliente' | 'creditos' | 'anuladas';
type TipoAlcance = 'global' | 'urbanizacion';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
template: `
<div class="w-full max-w-8xl mx-auto px-3 sm:px-4 py-4 flex flex-col gap-3">

  <!-- ─── Selector de Alcance ─── -->
  <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
      <i class="fa-solid fa-chart-pie text-emerald-700 text-sm"></i>
      <span class="text-sm font-semibold text-slate-800">Alcance del reporte</span>
    </div>
    <div class="px-4 py-3 flex flex-wrap items-center gap-2">
      <button
        class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border shadow-sm transition-colors max-w-full"
        [class.bg-emerald-600]="tipoAlcance() === 'urbanizacion'"
        [class.text-white]="tipoAlcance() === 'urbanizacion'"
        [class.border-emerald-600]="tipoAlcance() === 'urbanizacion'"
        [class.bg-white]="tipoAlcance() !== 'urbanizacion'"
        [class.text-slate-700]="tipoAlcance() !== 'urbanizacion'"
        [class.border-slate-300]="tipoAlcance() !== 'urbanizacion'"
        [class.hover:bg-slate-50]="tipoAlcance() !== 'urbanizacion'"
        (click)="cambiarAlcance('urbanizacion')">
        <i class="fa-solid fa-building"></i>
        <span class="truncate">{{ nombreUrbanizacionActual() }}</span>
      </button>

      @if (isAdmin()) {
        <button
          class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border shadow-sm transition-colors max-w-full"
          [class.bg-emerald-900]="tipoAlcance() === 'global'"
          [class.text-white]="tipoAlcance() === 'global'"
          [class.border-emerald-900]="tipoAlcance() === 'global'"
          [class.bg-white]="tipoAlcance() !== 'global'"
          [class.text-slate-700]="tipoAlcance() !== 'global'"
          [class.border-slate-300]="tipoAlcance() !== 'global'"
          [class.hover:bg-slate-50]="tipoAlcance() !== 'global'"
          (click)="cambiarAlcance('global')">
          <i class="fa-solid fa-globe"></i>
          Todos los proyectos
        </button>
      }

      @if (tipoAlcance() === 'urbanizacion' && !urbanizacionActiva()) {
        <div class="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg text-xs w-full sm:w-auto sm:ml-auto">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Selecciona una urbanización desde el menú.
        </div>
      }
    </div>
  </div>

  <!-- ─── Filtros Generales ─── -->
  <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
      <i class="fa-solid fa-sliders text-emerald-700 text-sm"></i>
      <span class="text-sm font-semibold text-slate-800">Filtros</span>
    </div>
    <div class="px-4 py-3 grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3">
      <label class="col-span-2 sm:col-span-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 h-9 cursor-pointer select-none">
        <span class="relative inline-flex w-8 h-5 flex-shrink-0">
          <input type="checkbox" class="peer sr-only" [(ngModel)]="filtrarPorFechas">
          <span class="absolute inset-0 bg-slate-300 rounded-full transition-colors peer-checked:bg-emerald-600"></span>
          <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-3"></span>
        </span>
        <span class="text-xs font-medium text-slate-700">Filtrar por fechas</span>
      </label>

      <div class="flex flex-col gap-1" [class.opacity-40]="!filtrarPorFechas" [class.pointer-events-none]="!filtrarPorFechas">
        <span class="text-[11px] font-medium text-slate-500">Fecha de inicio</span>
        <input type="date" class="border border-slate-200 rounded-lg px-2 h-9 text-xs outline-none text-slate-800 w-full focus:border-emerald-600 focus:ring-1 focus:ring-emerald-100"
          [(ngModel)]="filtros.fechaInicio" [disabled]="!filtrarPorFechas">
      </div>
      <div class="flex flex-col gap-1" [class.opacity-40]="!filtrarPorFechas" [class.pointer-events-none]="!filtrarPorFechas">
        <span class="text-[11px] font-medium text-slate-500">Fecha de fin</span>
        <input type="date" class="border border-slate-200 rounded-lg px-2 h-9 text-xs outline-none text-slate-800 w-full focus:border-emerald-600 focus:ring-1 focus:ring-emerald-100"
          [(ngModel)]="filtros.fechaFin" [disabled]="!filtrarPorFechas">
      </div>

      <div class="hidden sm:block h-9 w-px bg-slate-200 mx-1"></div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-medium text-slate-500">Manzana</span>
        <select class="border border-slate-200 rounded-lg px-2 h-9 text-xs outline-none text-slate-800 bg-white cursor-pointer w-full sm:min-w-[130px] focus:border-emerald-600"
          [(ngModel)]="filtros.manzanoId">
          <option [ngValue]="null">Todas</option>
          <option *ngFor="let m of manzanas()" [ngValue]="m.id">{{ m.nombre }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-medium text-slate-500">Tipo de venta</span>
        <select class="border border-slate-200 rounded-lg px-2 h-9 text-xs outline-none text-slate-800 bg-white cursor-pointer w-full sm:min-w-[130px] focus:border-emerald-600"
          [(ngModel)]="filtros.tipoVenta">
          <option value="">Todos</option>
          <option value="LOTE">Lote</option>
          <option value="PROPIEDAD">Propiedad</option>
        </select>
      </div>

      <div class="col-span-2 sm:col-span-1 flex flex-col gap-1 sm:flex-1 sm:min-w-[160px]">
        <span class="text-[11px] font-medium text-slate-500">Vendedor</span>
        <select class="border border-slate-200 rounded-lg px-2 h-9 text-xs outline-none text-slate-800 bg-white cursor-pointer w-full focus:border-emerald-600"
          [(ngModel)]="filtros.vendedorId">
          <option value="">Todos</option>
          <option *ngFor="let v of vendedores()" [value]="v.id">{{ v.nombre }}</option>
        </select>
      </div>
    </div>
  </div>

  <!-- ─── Selección de Reporte ─── -->
  <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-wrap">
      <i class="fa-solid fa-chart-line text-emerald-700 text-sm"></i>
      <span class="text-sm font-semibold text-slate-800">Reporte de ventas</span>
      <span class="text-xs text-slate-400">
        · {{ nombreUrbanizacionActual() }}{{ tipoAlcance() === 'global' ? ' (todos los proyectos)' : '' }}
      </span>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-4">

      <button
        class="flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors"
        [class.bg-emerald-600]="reporteActual() === 'general'"
        [class.text-white]="reporteActual() === 'general'"
        [class.border-emerald-600]="reporteActual() === 'general'"
        [class.border-slate-200]="reporteActual() !== 'general'"
        [class.text-slate-600]="reporteActual() !== 'general'"
        [class.hover:bg-emerald-50]="reporteActual() !== 'general'"
        (click)="seleccionarReporte('general')">
        <i class="fa-solid fa-chart-bar text-base"></i>
        <span class="text-center leading-tight">Reporte general</span>
      </button>

      <button
        class="flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors"
        [class.bg-emerald-600]="reporteActual() === 'detalle'"
        [class.text-white]="reporteActual() === 'detalle'"
        [class.border-emerald-600]="reporteActual() === 'detalle'"
        [class.border-slate-200]="reporteActual() !== 'detalle'"
        [class.text-slate-600]="reporteActual() !== 'detalle'"
        [class.hover:bg-emerald-50]="reporteActual() !== 'detalle'"
        (click)="seleccionarReporte('detalle')">
        <i class="fa-regular fa-file-lines text-base"></i>
        <span class="text-center leading-tight">Detalle de ventas</span>
      </button>

      <button
        class="flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors"
        [class.bg-emerald-600]="reporteActual() === 'vendedores'"
        [class.text-white]="reporteActual() === 'vendedores'"
        [class.border-emerald-600]="reporteActual() === 'vendedores'"
        [class.border-slate-200]="reporteActual() !== 'vendedores'"
        [class.text-slate-600]="reporteActual() !== 'vendedores'"
        [class.hover:bg-emerald-50]="reporteActual() !== 'vendedores'"
        (click)="seleccionarReporte('vendedores')">
        <i class="fa-solid fa-users text-base"></i>
        <span class="text-center leading-tight">Por vendedor</span>
      </button>

      <button
        class="flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors"
        [class.bg-emerald-600]="reporteActual() === 'cuotas'"
        [class.text-white]="reporteActual() === 'cuotas'"
        [class.border-emerald-600]="reporteActual() === 'cuotas'"
        [class.border-slate-200]="reporteActual() !== 'cuotas'"
        [class.text-slate-600]="reporteActual() !== 'cuotas'"
        [class.hover:bg-emerald-50]="reporteActual() !== 'cuotas'"
        (click)="seleccionarReporte('cuotas')">
        <i class="fa-regular fa-folder-open text-base"></i>
        <span class="text-center leading-tight">Cuotas por cobrar</span>
      </button>

      <button
        class="flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors"
        [class.bg-emerald-600]="reporteActual() === 'completadas'"
        [class.text-white]="reporteActual() === 'completadas'"
        [class.border-emerald-600]="reporteActual() === 'completadas'"
        [class.border-slate-200]="reporteActual() !== 'completadas'"
        [class.text-slate-600]="reporteActual() !== 'completadas'"
        [class.hover:bg-emerald-50]="reporteActual() !== 'completadas'"
        (click)="seleccionarReporte('completadas')">
        <i class="fa-regular fa-circle-check text-base"></i>
        <span class="text-center leading-tight">Completadas</span>
      </button>

    </div>
  </div>

  <!-- ─── Acción: Descargar PDF ─── -->
  @if (reporteActual()) {
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="text-sm text-slate-600">
        <span class="font-medium text-slate-800">{{ getTituloReporte() }}</span>
        @if (reportesService.loading()) {
          <span class="text-xs text-slate-400 ml-2">
            <i class="fa-solid fa-spinner fa-spin"></i> Cargando datos...
          </span>
        }
      </div>
      <button
        class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
        [disabled]="reportesService.loading()"
        (click)="descargarPDF()">
        <i class="fa-solid fa-file-pdf"></i>
        Descargar PDF
      </button>
    </div>
  }

  <!-- ─── Error ─── -->
  @if (reportesService.error()) {
    <div class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
      <i class="fa-solid fa-triangle-exclamation"></i>
      {{ reportesService.error() }}
    </div>
  }

</div>
`,
})
export class ReportesVentasComponent implements OnInit {
  reportesService = inject(ReportesService);
  private pdfService = inject(PdfGeneratorService);
  private urbanizacionContext = inject(UrbanizacionContextService);
  private authService = inject(AuthService);
  private manzanoService = inject(ManzanoService);

  reporteActual = signal<TipoReporte | null>(null);
  tipoAlcance = signal<TipoAlcance>('urbanizacion');
  filtrarPorFechas = false;

  manzanas = signal<ManzanoDto[]>([]);

  filtros: FiltrosReporteDto & {
    clienteId?: number;
    manzanoId?: number | null;
    vendedorId?: number;
  } = { manzanoId: null };

  urbanizacionActiva = this.urbanizacionContext.urbanizacion;

  isAdmin = computed(() => {
    const user = this.authService.getCurrentUser();
    return user?.role === 'ADMINISTRADOR';
  });

  nombreUrbanizacionActual = computed(() => {
    return this.urbanizacionActiva()?.nombre || 'Sin urbanización seleccionada';
  });

  // computed() en vez de propiedad mutable + effect() → evita NG0100
  vendedores = computed(() => {
    const v = this.reportesService.ventasPorVendedor();
    return v?.vendedores?.map((x: any) => ({
      id: x.asesor.id,
      nombre: x.asesor.fullName,
    })) ?? [];
  });

  ngOnInit() {
    this.urbanizacionContext.recuperar();
    this.cargarManzanos();
    this.seleccionarReporte('general');
  }

  async cargarManzanos() {
    const lista = await this.manzanoService.getManzanosDeUrbanizacionActiva();
    this.manzanas.set(lista);
  }

  cambiarAlcance(alcance: TipoAlcance) {
    this.tipoAlcance.set(alcance);
    if (alcance === 'urbanizacion') this.cargarManzanos();
    this.aplicarFiltros();
  }

  seleccionarReporte(tipo: TipoReporte) {
    this.reporteActual.set(tipo);
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    if (!this.reporteActual()) return;

    const f: any = {};

    if (this.filtrarPorFechas) {
      if (this.filtros.fechaInicio) f.fechaInicio = this.filtros.fechaInicio;
      if (this.filtros.fechaFin)    f.fechaFin    = this.filtros.fechaFin;
    }

    if (this.filtros.tipoVenta)  f.tipoVenta  = this.filtros.tipoVenta;
    if (this.filtros.vendedorId) f.asesorId   = this.filtros.vendedorId;
    if (this.filtros.manzanoId)  f.manzanoId  = this.filtros.manzanoId;

    if (this.tipoAlcance() === 'global') {
      if (!this.isAdmin()) return;
      f.global = true;
    } else {
      const urbanizacion = this.urbanizacionActiva();
      if (!urbanizacion?.id) return;
      f.urbanizacionId = urbanizacion.id;
    }

    switch (this.reporteActual()) {
      case 'general':     this.reportesService.getReporteVentas(f);        break;
      case 'vendedores':  this.reportesService.getVentasPorVendedor(f);    break;
      case 'detalle':     this.reportesService.getDetalleVentas(f);        break;
      case 'cuotas':      this.reportesService.getCuotasPorCobrar(f);      break;
      case 'completadas': this.reportesService.getVentasCompletadas(f);    break;
      case 'creditos':    this.reportesService.getCuotasPorCobrar(f);      break;
      case 'anuladas':    this.reportesService.getReporteVentas({ ...f, estado: 'ANULADO' }); break;
      case 'cliente':
        if (this.filtros.clienteId) {
          this.reportesService.getVentasPorCliente({ clienteId: this.filtros.clienteId, ...f });
        }
        break;
    }
  }

  async descargarPDF() {
    const tipo = this.reporteActual();
    if (!tipo) return;
    const infoAdicional = {
      alcance: this.tipoAlcance(),
      urbanizacionNombre: this.urbanizacionActiva()?.nombre,
      fechaGeneracion: new Date().toLocaleString(),
      usuario: this.authService.getCurrentUser()?.fullName,
    };
    try {
      switch (tipo) {
        case 'general':     await this.pdfService.generarReporteGeneral(this.reportesService.reporteVentas(), this.filtros, infoAdicional); break;
        case 'vendedores':  await this.pdfService.generarReporteVendedores(this.reportesService.ventasPorVendedor(), this.filtros, infoAdicional); break;
        case 'detalle':     await this.pdfService.generarReporteDetalle(this.reportesService.detalleVentas(), this.filtros, infoAdicional); break;
        case 'cuotas':      await this.pdfService.generarReporteCuotas(this.reportesService.cuotasPorCobrar(), this.filtros, infoAdicional); break;
        case 'completadas': await this.pdfService.generarReporteCompletadas(this.reportesService.ventasCompletadas(), this.filtros, infoAdicional); break;
        case 'cliente':     await this.pdfService.generarReporteCliente(this.reportesService.ventasPorCliente(), this.filtros, infoAdicional); break;
      }
    } catch (e) {
      console.error('Error generando PDF:', e);
    }
  }

  getTituloReporte(): string {
    const baseTitulo: Record<TipoReporte, string> = {
      general:     'Reporte General de Ventas',
      vendedores:  'Ventas por Vendedor',
      detalle:     'Detalle de Ventas',
      cuotas:      'Cuotas por Cobrar',
      completadas: 'Ventas Completadas',
      cliente:     'Ventas por Cliente',
      creditos:    'Créditos por Cobrar',
      anuladas:    'Ventas Anuladas',
    };
    const alcance = this.tipoAlcance() === 'global'
      ? ' (Global)'
      : ` (${this.nombreUrbanizacionActual()})`;
    return (baseTitulo[this.reporteActual() as TipoReporte] || 'Reporte') + alcance;
  }

  getEstadoClass(estado: string): string {
    const m: Record<string, string> = {
      PAGADO:    'badge-pagado',
      PENDIENTE: 'badge-pendiente',
      CANCELADO: 'badge-cancelado',
    };
    return m[estado] ?? '';
  }
}