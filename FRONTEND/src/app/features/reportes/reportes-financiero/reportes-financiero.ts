import { Component, OnInit, Input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MetodoPago } from '../../../core/interfaces/caja.interface';
import { TipoCuota, FiltroFecha, FiltroCobroCuotas, FiltroOtrosIngresos, FiltroGastos } from '../../../core/interfaces/reportes- financiero';
import { ReportesFinancierosPdfService } from '../../../core/services/reportes financieros pdf.service';
import { ReportesFinancierosService } from '../services/reportes-financiero.service';
import { faCalendarDays, faMoneyBillTrendUp, faMoneyBillTransfer, faFileInvoiceDollar, faFileInvoice, faFileLines, faReceipt, faMagnifyingGlass, faChartPie, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';


@Component({
  selector: 'app-reportes-financieros-panel',
  standalone: true,
  imports: [CommonModule, FormsModule,FontAwesomeModule],
  templateUrl: './reportes-financiero.html',
})
export class ReportesFinancierosPanelComponent implements OnInit {
 faCalendarDays = faCalendarDays;
  faMoneyBillTrendUp = faMoneyBillTrendUp;
  faMoneyBillTransfer = faMoneyBillTransfer;
  faFileInvoiceDollar = faFileInvoiceDollar;
  faFileInvoice = faFileInvoice;
  faFileLines = faFileLines;
  faReceipt = faReceipt;
  faMagnifyingGlass = faMagnifyingGlass;
  faChartPie = faChartPie;
  faTriangleExclamation = faTriangleExclamation;

  // Nombre de quien genera el reporte, para la línea "Generado por" del PDF.
  // Reemplazá esto por tu AuthService real (ej. this.auth.usuario().fullName).
  @Input() usuarioActual = 'Sistema';

  protected readonly service = inject(ReportesFinancierosService);
  protected readonly pdf = inject(ReportesFinancierosPdfService);

  // ── Filtros generales ────────────────────────────────────────────
  readonly filtrarPorFechas = signal(true);
  readonly fechaInicio = signal(this.primerDiaDelMes());
  readonly fechaFin = signal(this.hoy());

  // ── Filtros de Ingresos ───────────────────────────────────────────
  readonly formaPago = signal<MetodoPago | ''>('');
  readonly tipoCuota = signal<TipoCuota | ''>('');
  readonly bancoCajaIngreso = signal<number | ''>('');
  readonly conceptoIngreso = signal<number | ''>('');

  // ── Filtros de Gastos ─────────────────────────────────────────────
  readonly tipoGasto = signal<number | ''>('');
  readonly bancoCajaGasto = signal<number | ''>('');
  readonly conceptoGasto = signal<number | ''>('');

  // Set de opciones para los <select>, ya vienen agrupadas del backend
  readonly opciones = computed(() => this.service.opcionesFiltros.datos());

  ngOnInit(): void {
    this.service.cargarOpcionesFiltros();
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private primerDiaDelMes(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }

  // ── Construcción de filtros a partir del estado del panel ────────
  private filtroFecha(): FiltroFecha {
    if (!this.filtrarPorFechas()) return {};
    return { fechaInicio: this.fechaInicio(), fechaFin: this.fechaFin() };
  }

  private filtroCobroCuotas(): FiltroCobroCuotas {
    return {
      ...this.filtroFecha(),
      ...(this.formaPago() && { metodoPago: this.formaPago() as MetodoPago }),
      ...(this.tipoCuota() && { tipoCuota: this.tipoCuota() as TipoCuota }),
      ...(this.bancoCajaIngreso() !== '' && { cajaId: Number(this.bancoCajaIngreso()) }),
    };
  }

  private filtroOtrosIngresos(): FiltroOtrosIngresos {
    return {
      ...this.filtroFecha(),
      ...(this.conceptoIngreso() !== '' && { categoriaId: Number(this.conceptoIngreso()) }),
    };
  }

  private filtroGastos(): FiltroGastos {
    return {
      ...this.filtroFecha(),
      ...(this.tipoGasto() !== '' && { categoriaId: Number(this.tipoGasto()) }),
      ...(this.bancoCajaGasto() !== '' && { cajaId: Number(this.bancoCajaGasto()) }),
    };
  }

  private infoAdicional() {
    return { usuario: this.usuarioActual, fechaGeneracion: new Date().toLocaleString('es-BO') };
  }

  // ── Bloque Ingresos ────────────────────────────────────────────────

  async onOtrosIngresos() {
    await this.service.cargarOtrosIngresos(this.filtroOtrosIngresos());
    const datos = this.service.otrosIngresos.datos();
    if (datos) await this.pdf.generarPdfOtrosIngresos(datos, this.filtroFecha(), this.infoAdicional());
  }

  async onRecibosEmitidos() {
    await this.service.cargarRecibos(this.filtroFecha());
    const datos = this.service.recibos.datos();
    if (datos) await this.pdf.generarPdfRecibos(datos, this.filtroFecha(), this.infoAdicional());
  }

  async onReporteCobroCuotas() {
    await this.service.cargarCobroCuotas(this.filtroCobroCuotas());
    const datos = this.service.cobroCuotas.datos();
    if (datos) await this.pdf.generarPdfCobroCuotas(datos, this.filtroFecha(), this.infoAdicional());
  }

  async onIngresosPorBanco() {
    await this.service.cargarIngresosPorBanco(this.filtroFecha());
    const datos = this.service.ingresosPorBanco.datos();
    if (datos) await this.pdf.generarPdfIngresosPorBanco(datos, this.filtroFecha(), this.infoAdicional());
  }

  async onIngresosPorConcepto() {
    await this.service.cargarOtrosIngresosPorConcepto(this.filtroFecha());
    const datos = this.service.otrosIngresosPorConcepto.datos();
    if (datos) await this.pdf.generarPdfOtrosIngresosPorConcepto(datos, this.filtroFecha(), this.infoAdicional());
  }

  // ── Bloque Gastos ────────────────────────────────────────────────

  async onReporteGastos() {
    await this.service.cargarGastos(this.filtroGastos());
    const datos = this.service.gastos.datos();
    if (datos) await this.pdf.generarPdfGastos(datos, this.filtroFecha(), this.infoAdicional());
  }

  async onConsolidadoGastos() {
    await this.service.cargarConsolidadoGastos(this.filtroFecha());
    const datos = this.service.consolidadoGastos.datos();
    if (datos) await this.pdf.generarPdfConsolidadoGastos(datos, this.filtroFecha(), this.infoAdicional());
  }

  async onGastosPorBanco() {
    await this.service.cargarGastosPorBanco(this.filtroFecha());
    const datos = this.service.gastosPorBanco.datos();
    if (datos) await this.pdf.generarPdfGastosPorBanco(datos, this.filtroFecha(), this.infoAdicional());
  }

  async onGastosPorConcepto() {
    await this.service.cargarGastosPorConcepto(this.filtroFecha());
    const datos = this.service.gastosPorConcepto.datos();
    if (datos) await this.pdf.generarPdfGastosPorConcepto(datos, this.filtroFecha(), this.infoAdicional());
  }
}