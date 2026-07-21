// movimientos-list.ts
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Movimiento } from '../../../core/interfaces/caja.interface';
import { MovimientoService } from '../service/movimiento.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PdfMovimientosService } from '../../caja/service/pdfMovimientos.service';


interface ColumnConfig {
  key: keyof Movimiento;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-movimientos-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './movimientos-list.html',
})
export class MovimientosList implements OnInit {
  private route = inject(ActivatedRoute);
  private movSvc = inject(MovimientoService);
  private notificationSvc = inject(NotificationService);
  private pdfService = inject(PdfMovimientosService);

  movimientos = signal<Movimiento[]>([]);
  allMovimientos = signal<Movimiento[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  cajaId = signal<number>(0);
  resumenFiltrado = signal<{ totalIngresos: number; totalEgresos: number } | null>(null);
  cajaData = signal<any>(null); // 👈 Para almacenar datos de la caja

  // Filtros
  filtroMes = signal<number | null>(null);
  filtroAnio = signal<number>(new Date().getFullYear());
  filtroTipo = signal<string>('');
  filtroMetodoPago = signal<string>('');
  filtroManzano = signal<string>('');
  filtroNumeroLote = signal<string>('');

  aniosDisponibles = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  meses = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  metodosPago = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

  sortColumn = signal<keyof Movimiento>('fecha');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'fecha', label: 'Fecha', sortable: true },
    { key: 'tipo', label: 'Tipo', sortable: true },
    { key: 'monto', label: 'Monto', sortable: true },
    { key: 'metodoPago', label: 'Método Pago', sortable: true },
    { key: 'descripcion', label: 'Descripción', sortable: true },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);
  saldoDiario = signal<any[]>([]); // 👈 Para almacenar saldo diario
  porMetodoPago = signal<any[]>([]); // 👈 Para almacenar datos por método de pago

  filteredMovimientos = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let movimientos = this.allMovimientos();

    if (term) {
      movimientos = movimientos.filter(
        (movimiento: Movimiento) =>
          movimiento.descripcion?.toLowerCase().includes(term) ||
          movimiento.tipo.toLowerCase().includes(term) ||
          movimiento.metodoPago.toLowerCase().includes(term) ||
          movimiento.fecha.toLowerCase().includes(term),
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return movimientos;

    return [...movimientos].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (column === 'fecha') {
        return direction === 'asc'
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aString = aValue.toString().toLowerCase();
      const bString = bValue.toString().toLowerCase();

      return direction === 'asc' ? aString.localeCompare(bString) : bString.localeCompare(aString);
    });
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.cajaId.set(id);
      if (id) {
        this.obtenerMovimientos();
        this.obtenerResumenCaja();
      }
    });
  }

  obtenerMovimientos() {
    this.cargando.set(true);
    this.error.set(null);

    this.movSvc
      .loadByCajaFiltrado(this.cajaId(), this.currentPage(), this.pageSize(), {
        mes: this.filtroMes() ?? undefined,
        anio: this.filtroAnio(),
        tipo: this.filtroTipo() || undefined,
        metodoPago: this.filtroMetodoPago() || undefined,
        manzano: this.filtroManzano() || undefined,
        numeroLote: this.filtroNumeroLote() || undefined,
      })
      .subscribe({
        next: (response) => {
  console.log('Primer movimiento completo:', response.data?.[0]);
  console.log('venta:', response.data?.[0]?.venta);
  console.log('cliente:', response.data?.[0]?.venta?.cliente);

          this.allMovimientos.set(response.data);
          this.movimientos.set(response.data);
          this.total.set(response.total);
          
          if (response.resumen) {
            this.resumenFiltrado.set(response.resumen);
          }
          
          // 👈 Guardar datos adicionales para PDF
          if (response.caja) {
            this.cajaData.set(response.caja);
          }
          
          if (response.porMetodoPago) {
            this.porMetodoPago.set(response.porMetodoPago);
          }
          
          if (response.saldoDiario) {
            this.saldoDiario.set(response.saldoDiario);
          }
          
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.error.set('Error al cargar los movimientos');
          this.notificationSvc.showError('Error al cargar los movimientos');
        },
      });
  }

  obtenerResumenCaja() {
    this.movSvc.getResumenCaja(this.cajaId()).subscribe({
      next: (resumen) => this.cajaData.set(resumen),
      error: (err) => {
        console.error('Error al obtener resumen:', err);
        this.notificationSvc.showError('Error al obtener el resumen de caja');
      },
    });
  }

  aplicarFiltros() {
    this.currentPage.set(1);
    this.obtenerMovimientos();
  }

  limpiarFiltros() {
    this.filtroMes.set(null);
    this.filtroAnio.set(new Date().getFullYear());
    this.filtroTipo.set('');
    this.filtroMetodoPago.set('');
    this.filtroManzano.set('');
    this.filtroNumeroLote.set('');
    this.currentPage.set(1);
    this.obtenerMovimientos();
  }

  hayFiltrosActivos(): boolean {
    return !!(
      this.filtroMes() ||
      this.filtroTipo() ||
      this.filtroMetodoPago() ||
      this.filtroManzano() ||
      this.filtroNumeroLote()
    );
  }

  cambiarOrden(columna: keyof Movimiento) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof Movimiento): string {
    if (this.sortColumn() !== columna) return 'opacity-30';
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  getTipoBadgeClass(tipo: string): string {
    const classes = {
      INGRESO: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      EGRESO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
    };
    return classes[tipo as keyof typeof classes] || classes['EGRESO'];
  }

  getTotalIngresos(): number {
    return (
      this.resumenFiltrado()?.totalIngresos ??
      this.allMovimientos()
        .filter((m) => m.tipo === 'INGRESO')
        .reduce((s, m) => s + Number(m.monto), 0)
    );
  }

  getTotalEgresos(): number {
    return (
      this.resumenFiltrado()?.totalEgresos ??
      this.allMovimientos()
        .filter((m) => m.tipo === 'EGRESO')
        .reduce((s, m) => s + Number(m.monto), 0)
    );
  }

  getBalance(): number {
    return this.getTotalIngresos() - this.getTotalEgresos();
  }

// movimientos-list.ts - Métodos PDF corregidos

  // ═══════════════════════════════════════════════════════════════
// REEMPLAZA los métodos generarPDFDetallado y generarPDFResumen
// en movimientos-list.ts por estos
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// REEMPLAZA los métodos PDF en movimientos-list.ts por estos
// El problema era que el PDF usaba los 10 registros paginados.
// Ahora hace una llamada aparte con pageSize=9999 para traer TODO.
// ═══════════════════════════════════════════════════════════════

  // ── Helpers ──────────────────────────────────────────────────

  private calcularResumenPDF(movimientos: Movimiento[]) {
    const ingresos = movimientos.filter(m => m.tipo === 'INGRESO');
    const egresos  = movimientos.filter(m => m.tipo === 'EGRESO');
    return {
      totalIngresos:    ingresos.reduce((s, m) => s + Number(m.monto), 0),
      totalEgresos:     egresos.reduce((s,  m) => s + Number(m.monto), 0),
      saldoNeto:        movimientos.reduce((s, m) => m.tipo === 'INGRESO' ? s + Number(m.monto) : s - Number(m.monto), 0),
      cantidadIngresos: ingresos.length,
      cantidadEgresos:  egresos.length,
    };
  }

  private calcularPorMetodoPDF(movimientos: Movimiento[]) {
    const mapa = new Map<string, { total: number; cantidad: number }>();
    movimientos.forEach(m => {
      const prev = mapa.get(m.metodoPago) ?? { total: 0, cantidad: 0 };
      mapa.set(m.metodoPago, { total: prev.total + Number(m.monto), cantidad: prev.cantidad + 1 });
    });
    return Array.from(mapa.entries()).map(([metodoPago, d]) => ({ metodoPago, ...d }));
  }

  private calcularSaldoDiarioPDF(movimientos: Movimiento[]) {
    const mapa = new Map<string, number>();
    [...movimientos]
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .forEach(m => {
        const dia   = new Date(m.fecha).toISOString().split('T')[0];
        const delta = m.tipo === 'INGRESO' ? Number(m.monto) : -Number(m.monto);
        mapa.set(dia, (mapa.get(dia) ?? 0) + delta);
      });
    let acumulado = 0;
    return Array.from(mapa.entries()).map(([dia, neto]) => {
      acumulado += neto;
      return { dia, netoDelDia: neto, saldoAcumulado: acumulado };
    });
  }

  private getCajaParaPDF() {
    const d = this.cajaData();
    return {
      id:              this.cajaId(),
      nombre:          d?.nombre           ?? `Caja ${this.cajaId()}`,
      saldoActual:     d?.saldoActual      ?? 0,
      montoInicial:    d?.montoInicial     ?? 0,
      estado:          d?.estado           ?? 'ACTIVA',
      usuarioApertura: d?.usuarioApertura,
    };
  }

  private getFiltrosActuales() {
    return {
      mes:        this.filtroMes()        ?? undefined,
      anio:       this.filtroAnio(),
      tipo:       this.filtroTipo()       || undefined,
      metodoPago: this.filtroMetodoPago() || undefined,
      manzano:    this.filtroManzano()    || undefined,
      numeroLote: this.filtroNumeroLote() || undefined,
    };
  }

  // ── Carga TODOS los movimientos filtrados (sin límite de página) ──
  // Usa el mismo endpoint /filtrado pero con pageSize=9999
  private cargarTodosParaPDF(): Promise<Movimiento[]> {
    return new Promise((resolve, reject) => {
      this.movSvc
        .loadByCajaFiltrado(
          this.cajaId(),
          1,
          9999, // ← trae todos sin límite de paginación
          this.getFiltrosActuales(),
        )
        .subscribe({
          next:  (res) => resolve(res.data ?? []),
          error: (err) => reject(err),
        });
    });
  }

  // ── PDF DETALLADO ────────────────────────────────────────────
  async generarPDFDetallado() {
    this.notificationSvc.showSuccess('Generando PDF, espere...');

    let movimientos: Movimiento[];
    try {
      // ✅ Trae TODOS los registros con los filtros actuales, no solo la página
      movimientos = await this.cargarTodosParaPDF();
    } catch {
      this.notificationSvc.showError('Error al obtener los datos para el PDF');
      return;
    }

    if (!movimientos.length) {
      this.notificationSvc.showWarning('No hay movimientos con los filtros actuales');
      return;
    }

    await this.pdfService.generarReporteMovimientos(
      movimientos,
      this.calcularResumenPDF(movimientos),
      this.calcularPorMetodoPDF(movimientos),
      this.getCajaParaPDF(),
      this.getFiltrosActuales(),
    );

    this.notificationSvc.showSuccess('Reporte PDF generado correctamente');
  }

  // ── PDF RESUMEN ──────────────────────────────────────────────
  async generarPDFResumen() {
    this.notificationSvc.showSuccess('Generando PDF, espere...');

    let movimientos: Movimiento[];
    try {
      // ✅ Trae TODOS los registros con los filtros actuales, no solo la página
      movimientos = await this.cargarTodosParaPDF();
    } catch {
      this.notificationSvc.showError('Error al obtener los datos para el PDF');
      return;
    }

    if (!movimientos.length) {
      this.notificationSvc.showWarning('No hay movimientos con los filtros actuales');
      return;
    }

    await this.pdfService.generarResumen(
      this.calcularResumenPDF(movimientos),
      this.calcularPorMetodoPDF(movimientos),
      this.calcularSaldoDiarioPDF(movimientos),
      this.getCajaParaPDF(),
      this.getFiltrosActuales(),
    );

    this.notificationSvc.showSuccess('Resumen PDF generado correctamente');
  }


  // ── Helpers privados para calcular datos PDF ─────────────────


  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((v) => v + 1);
      this.obtenerMovimientos();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((v) => v - 1);
      this.obtenerMovimientos();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.obtenerMovimientos();
    }
  }

  totalPages() {
    return Math.ceil(this.total() / this.pageSize());
  }

  pageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  rangeStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    const end = this.currentPage() * this.pageSize();
    return end > this.total() ? this.total() : end;
  }
}