import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as XLSX from 'xlsx';
import { CreditoRow } from '../../../../core/interfaces/creditos.interface';
declare const require: any;
import * as pdfMakeLib from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
const pdfMake: any = pdfMakeLib;
pdfMake.vfs = pdfFonts as any;
pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

@Component({
  selector: 'app-creditos',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe,FontAwesomeModule],
  templateUrl: './creditos-list.html',
})
export class CreditosListComponent implements OnInit {

  faFileInvoiceDollar = faFileInvoiceDollar;
  faFileExport = faFileExport;
  faArrowsRotate = faArrowsRotate;
  faMagnifyingGlass = faMagnifyingGlass;
  faUser = faUser;
  faIdCard = faIdCard;
  faCalendarDays = faCalendarDays;
  faCoins = faCoins;
  faScaleBalanced = faScaleBalanced;
  faBuilding = faBuilding;
  faSort = faSort;
  faFileLines = faFileLines;
  faClockRotateLeft = faClockRotateLeft;
  faTriangleExclamation = faTriangleExclamation;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

  svc = inject(CreditosService);
  // private primaryColor = '#059669';
  // private primaryLight = '#10B981';
  // private primaryDark = '#047857';
  // private accentColor = '#34D399';
  // private lightBg = '#ECFDF5';
  // private headerBg = '#059669';
  // private headerTextColor = '#FFFFFF';
  // private successColor = '#10B981';
  // private warningColor = '#F59E0B';
  // private errorColor = '#EF4444';
  // private textColor = '#1F2937';
  // private borderColor = '#D1FAE5';
  // ── Config ────────────────────────────────────────────────

  urbCtx = inject(UrbanizacionContextService); // ← agregar
  // ── Filtros / búsqueda ────────────────────────────────────
  searchInput = '';
  filtros = { ciudad: '', urbanizacion: '' };
  search$ = new Subject<string>();
  sortField = signal<'cliente' | 'fecha' | null>(null);
  sortDir = signal<'asc' | 'desc'>('asc');

  // ── Computed ──────────────────────────────────────────────
  offset = computed(() => (this.svc.currentPage() - 1) * this.svc.pagination().limit);

  sortedCreditos = computed(() => {
    const list = [...this.svc.creditos()];
    const field = this.sortField();
    if (!field) return list;
    return list.sort((a, b) => {
      let va = field === 'cliente' ? a.cliente : (a.siguienteCuota?.fecha ?? '');
      let vb = field === 'cliente' ? b.cliente : (b.siguienteCuota?.fecha ?? '');
      const cmp = va.localeCompare(vb);
      return this.sortDir() === 'asc' ? cmp : -cmp;
    });
  });
  pageNumbers = computed(() => {
    const total = this.svc.totalPages();
    const cur = this.svc.currentPage();

    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: (number | '...')[] = [];

    // Siempre mostrar página 1
    pages.push(1);

    // ... al inicio si la página actual está lejos del inicio
    if (cur > 4) pages.push('...');

    // Páginas cercanas a la actual
    for (let p = Math.max(2, cur - 2); p <= Math.min(total - 1, cur + 2); p++) {
      pages.push(p);
    }

    // ... al final si la página actual está lejos del final
    if (cur < total - 3) pages.push('...');

    // Siempre mostrar última página
    pages.push(total);

    return pages;
  });

  constructor(private destroyRef: DestroyRef) {
    // debounce búsqueda
    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        if (val.length === 0 || val.length >= 2) this.fetchPage(1);
      });
  }

  ngOnInit() {
    this.fetchPage(1);
    this.urbCtx.recuperar();
  }

  // ── Helpers ───────────────────────────────────────────────
  fetchPage(page: number) {
    this.svc
      .listar({
        page,
        limit: 10,
        search: this.searchInput || undefined,
        ciudad: this.filtros.ciudad || undefined,
        urbanizacion: this.filtros.urbanizacion || undefined,
        urbanizacionId: this.urbCtx.urbanizacionId ?? undefined, // ← agregar
      })
      .subscribe();
  }

  onFiltroChange() {
    this.fetchPage(1);
  }
  goPage(p: number) {
    if (p >= 1 && p <= this.svc.totalPages()) this.fetchPage(p);
  }
  reload() {
    this.fetchPage(this.svc.currentPage());
  }
  toggleSort(f: 'cliente' | 'fecha') {
    if (this.sortField() === f) this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      this.sortField.set(f);
      this.sortDir.set('asc');
    }
  }

  // Color del badge de fecha según vencimiento
badgeFechaClass(c: CreditoRow): string {
  if (!c.siguienteCuota) return '';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = this.parseFechaLocal(c.siguienteCuota.fecha);
  const dias = Math.ceil((fecha.getTime() - hoy.getTime()) / 86_400_000);
  const vencidas = c.siguienteCuota.cuotasVencidas;

  if (vencidas > 0 || dias < 0) return 'bg-red-500 text-white';
  if (dias <= 7) return 'bg-orange-400 text-white';
  if (dias <= 30) return 'bg-yellow-400 text-white';
  return 'bg-green-500 text-white';
}

private parseFechaLocal(fecha: string | Date): Date {
  if (fecha instanceof Date) return fecha;
  const soloFecha = fecha.split('T')[0];
  const [anio, mes, dia] = soloFecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}
loteMzCorto(numeroLote: string, nombreManzano: string): string {
  const limpioLote = (numeroLote ?? '').replace(/lote/gi, '').replace(/[-\s]/g, '');
  const limpioManzano = (nombreManzano ?? '').replace(/manzano/gi, '').replace(/[-\s]/g, '');

  const numeroLoteFmt = /^\d+$/.test(limpioLote) ? String(Number(limpioLote)) : limpioLote;
  const manzanoFmt = /^\d+$/.test(limpioManzano) ? String(Number(limpioManzano)) : limpioManzano.toUpperCase();

  return `L${numeroLoteFmt}${manzanoFmt ? '-M' + manzanoFmt : ''}`;
}
  // Acciones (placeholders — los PDF van aquí después)

  // ─────────────────────────────────────────────────────────────
  // AGREGAR ESTE MÉTODO AL PdfService EXISTENTE
  // También agregar el helper numeroALetras() al final
  // ─────────────────────────────────────────────────────────────

  // Reemplaza el método onPagare actual con este:
  // ── REEMPLAZA estos dos métodos en creditos-list.component.ts ──

  // ── REEMPLAZA estos dos métodos en creditos-list.component.ts ──

  // ── REEMPLAZA onPagare y formatDate en creditos-list.component.ts ──

  onPagare(c: CreditoRow) {
    const plazo = (c as any).plazo as number;
    const modalidad = (c as any).periodicidad as string; // ahora: DIARIO/SEMANAL/QUINCENAL/MENSUAL/...
 const fechaInicio = this.parseFechaLocal((c as any).fechaInicioPlan ?? new Date().toISOString());
    fechaInicio.setHours(0, 0, 0, 0);

    if (!plazo || plazo <= 0) {
      console.warn('Pagaré: plazo inválido', c);
      return;
    }

    const montoFinanciado = c.totalVenta - (c as any).montoInicial;
    const montoCuota = +(montoFinanciado / plazo).toFixed(2);

    if (montoCuota <= 0) {
      console.warn('Pagaré: monto de cuota inválido', { montoFinanciado, plazo });
      return;
    }

    const cuotas = Array.from({ length: plazo }, (_, i) => {
      const fecha = new Date(fechaInicio);
      switch (modalidad) {
        case 'DIARIO':
          fecha.setDate(fecha.getDate() + (i + 1));
          break;
        case 'SEMANAL':
          fecha.setDate(fecha.getDate() + (i + 1) * 7);
          break;
        case 'QUINCENAL':
          fecha.setDate(fecha.getDate() + (i + 1) * 15);
          break;
        case 'BIMESTRAL':
          fecha.setMonth(fecha.getMonth() + (i + 1) * 2);
          break;
        case 'TRIMESTRAL':
          fecha.setMonth(fecha.getMonth() + (i + 1) * 3);
          break;
        case 'SEMESTRAL':
          fecha.setMonth(fecha.getMonth() + (i + 1) * 6);
          break;
        case 'ANUAL':
          fecha.setFullYear(fecha.getFullYear() + (i + 1));
          break;
        case 'MENSUAL':
        default:
          fecha.setMonth(fecha.getMonth() + (i + 1));
          break;
      }
      return {
        numeroCuota: i + 1,
        fechaVencimiento: this.formatDate(fecha),
        monto: montoCuota,
      };
    });

    const etiquetas: Record<string, string> = {
      DIARIO: 'Diario',
      SEMANAL: 'Semanal',
      QUINCENAL: 'Quincenal',
      MENSUAL: 'Mensual',
      BIMESTRAL: 'Bimestral',
      TRIMESTRAL: 'Trimestral',
      SEMESTRAL: 'Semestral',
      ANUAL: 'Anual',
    };

    this.generarPdfPagare({
      cliente: { fullName: c.cliente, ci: (c as any).ci ?? 'S/D' },
      lote: {
        numeroLote: c.loteMz?.split('-')[0] ?? '',
        manzano: c.loteMz?.split('-')[1] ?? '',
        ciudad: this.filtros.ciudad || 'TARIJA',
      },
      planPagoId: c.ventaId,
      total: c.totalVenta,
      montoInicial: (c as any).montoInicial ?? 0,
      plazo,
      periodicidad: etiquetas[modalidad] ?? 'Mensual',
      fechaInicio: this.formatDate(fechaInicio),
      cuotas,
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  generarPdfPagare(credito: {
    cliente: { fullName: string; ci: string };
    lote: { numeroLote: string; manzano: string; ciudad: string };
    planPagoId: number;
    total: number;
    montoInicial: number;
    plazo: number;
    periodicidad: string;
    fechaInicio: string;
    cuotas: Array<{
      numeroCuota: number;
      fechaVencimiento: string;
      monto: number;
    }>;
  }): void {
    try {
      if (!credito) return;

    const fechaEmision = this.formatDateLocal(this.parseFechaLocal(credito.fechaInicio));
      const bloques: any[] = [];

      credito.cuotas.forEach((cuota, idx) => {
      const fechaVence = this.formatDateLocal(this.parseFechaLocal(cuota.fechaVencimiento)); 
        const montoLetras = this.numeroALetras(cuota.monto);
        const esUltimo = idx === credito.cuotas.length - 1;
        const nroCuota = `${String(cuota.numeroCuota).padStart(2, '0')}/${String(credito.plazo).padStart(2, '0')}`;
        const montoFormato = cuota.monto.toLocaleString('es-BO', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        bloques.push({
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    // ── Fila 1: N° | VENCIMIENTO | POR BS ──────────────────
                    {
                      columns: [
                        // N°
                        {
                          width: 'auto',
                          stack: [
                            { text: 'N°:', fontSize: 8, bold: true, margin: [0, 0, 0, 2] },
                            {
                              table: {
                                widths: [50],
                                body: [
                                  [
                                    {
                                      text: nroCuota,
                                      fontSize: 10,
                                      bold: true,
                                      alignment: 'center',
                                    },
                                  ],
                                ],
                              },
                              layout: {
                                hLineWidth: () => 1.5,
                                vLineWidth: () => 1.5,
                                hLineColor: () => '#000',
                                vLineColor: () => '#000',
                                paddingTop: () => 4,
                                paddingBottom: () => 4,
                                paddingLeft: () => 6,
                                paddingRight: () => 6,
                              },
                            },
                          ],
                          margin: [0, 0, 16, 0],
                        },
                        // VENCIMIENTO
                        {
                          width: '*',
                          stack: [
                            { text: 'VENCIMIENTO:', fontSize: 8, bold: true, margin: [0, 0, 0, 2] },
                            {
                              table: {
                                widths: ['*'],
                                body: [
                                  [
                                    {
                                      text: fechaVence,
                                      fontSize: 10,
                                      bold: true,
                                      alignment: 'center',
                                    },
                                  ],
                                ],
                              },
                              layout: {
                                hLineWidth: () => 1.5,
                                vLineWidth: () => 1.5,
                                hLineColor: () => '#000',
                                vLineColor: () => '#000',
                                paddingTop: () => 4,
                                paddingBottom: () => 4,
                                paddingLeft: () => 6,
                                paddingRight: () => 6,
                              },
                            },
                          ],
                          margin: [0, 0, 16, 0],
                        },
                        // POR BS
                        {
                          width: 'auto',
                          stack: [
                            { text: 'POR BS:', fontSize: 8, bold: true, margin: [0, 0, 0, 2] },
                            {
                              table: {
                                widths: [80],
                                body: [
                                  [
                                    {
                                      text: montoFormato,
                                      fontSize: 10,
                                      bold: true,
                                      alignment: 'right',
                                    },
                                  ],
                                ],
                              },
                              layout: {
                                hLineWidth: () => 1.5,
                                vLineWidth: () => 1.5,
                                hLineColor: () => '#000',
                                vLineColor: () => '#000',
                                paddingTop: () => 4,
                                paddingBottom: () => 4,
                                paddingLeft: () => 6,
                                paddingRight: () => 6,
                              },
                            },
                          ],
                        },
                      ],
                      margin: [0, 0, 0, 10],
                    },

                    // ── Fila 2: Señor(a) + a la fecha ──────────────────────
                    {
                      columns: [
                        {
                          width: '*',
                          columns: [
                            {
                              text: 'Señor(a):',
                              fontSize: 9,
                              bold: true,
                              width: 'auto',
                              margin: [0, 0, 6, 0],
                            },
                            {
                              width: '*',
                              stack: [
                                { text: credito.cliente.fullName.toUpperCase(), fontSize: 9 },
                                {
                                  canvas: [
                                    {
                                      type: 'line',
                                      x1: 0,
                                      y1: 1,
                                      x2: 240,
                                      y2: 1,
                                      lineWidth: 0.5,
                                      lineColor: '#000',
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          width: 'auto',
                          columns: [
                            {
                              text: 'a la fecha:',
                              fontSize: 9,
                              bold: true,
                              width: 'auto',
                              margin: [0, 0, 6, 0],
                            },
                            { text: fechaEmision, fontSize: 9, width: 'auto' },
                          ],
                          margin: [12, 0, 0, 0],
                        },
                      ],
                      margin: [0, 0, 0, 6],
                    },

                    // ── Fila 3: En la fecha + pagaré sin protesto ───────────
                    {
                      columns: [
                        {
                          text: 'En la fecha:',
                          fontSize: 9,
                          bold: true,
                          width: 'auto',
                          margin: [0, 0, 6, 0],
                        },
                        {
                          width: 100,
                          stack: [
                            { text: fechaVence, fontSize: 9 },
                            {
                              canvas: [
                                {
                                  type: 'line',
                                  x1: 0,
                                  y1: 1,
                                  x2: 90,
                                  y2: 1,
                                  lineWidth: 0.5,
                                  lineColor: '#000',
                                },
                              ],
                            },
                          ],
                        },
                        {
                          text: 'pagaré sin protesto incondicionalmente',
                          fontSize: 9,
                          italics: true,
                          width: '*',
                          margin: [6, 0, 0, 0],
                        },
                      ],
                      margin: [0, 0, 0, 6],
                    },

                    // ── Fila 4: la cantidad de ──────────────────────────────
                    {
                      columns: [
                        {
                          text: 'la cantidad de:',
                          fontSize: 9,
                          bold: true,
                          width: 'auto',
                          margin: [0, 0, 6, 0],
                        },
                        {
                          width: '*',
                          stack: [
                            { text: montoLetras.toUpperCase(), fontSize: 9 },
                            {
                              canvas: [
                                {
                                  type: 'line',
                                  x1: 0,
                                  y1: 1,
                                  x2: 370,
                                  y2: 1,
                                  lineWidth: 0.5,
                                  lineColor: '#000',
                                },
                              ],
                            },
                          ],
                        },
                      ],
                      margin: [0, 0, 0, 6],
                    },

                    // ── Fila 5: a entera satisfacción ──────────────────────
                    {
                      text: 'a entera satisfacción pagadero sin protesto',
                      fontSize: 9,
                      italics: true,
                      margin: [0, 0, 0, 16],
                    },

                    // ── Fila 6: Firma ───────────────────────────────────────
                    {
                      columns: [
                        { width: '*', text: '' },
                        {
                          width: 200,
                          stack: [
                            {
                              canvas: [
                                {
                                  type: 'line',
                                  x1: 0,
                                  y1: 0,
                                  x2: 200,
                                  y2: 0,
                                  lineWidth: 0.5,
                                  lineColor: '#000',
                                },
                              ],
                            },
                            {
                              text: credito.cliente.fullName.toUpperCase(),
                              fontSize: 9,
                              bold: true,
                              alignment: 'center',
                              margin: [0, 3, 0, 0],
                            },
                            {
                              text: `CI : ${credito.cliente.ci}`,
                              fontSize: 9,
                              alignment: 'center',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  margin: [12, 10, 12, 10],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 1.5,
            vLineWidth: () => 1.5,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
            paddingTop: () => 0,
            paddingBottom: () => 0,
            paddingLeft: () => 0,
            paddingRight: () => 0,
          },
          margin: [0, 0, 0, esUltimo ? 0 : 10],
        });
      });

      const fechaGeneracion = new Date().toLocaleDateString('es-BO').replace(/\//g, '-');
      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [35, 35, 35, 35],
        content: bloques,
        defaultStyle: { font: 'Roboto', color: '#1F2937' },
      };

      const fileName = `Pagares_${credito.cliente.fullName.replace(/\s+/g, '_')}_${fechaGeneracion}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF de pagarés:', error);
    }
  }

  private formatDateLocal(date: Date): string {
    if (!date || isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }
  private get urbLabel(): string {
    const urb = this.urbCtx.urbanizacion();
    if (!urb) return 'NUEVA ESPERANZA';
    return `${urb.nombre} (${urb.ciudad})`;
  }
  //historial de pagos
  // ── AGREGAR este método al componente creditos-list.component.ts ──
  // También necesitas inyectar HttpClient para leer el logo, o usar una URL base64

  async onHistorial(c: CreditoRow) {
    // 1. Llamar al backend para obtener el historial completo
    this.svc.getHistorialPagos(c.ventaId).subscribe({
      next: (resp: any) => {
        const data = resp.data;
        this.generarPdfHistorial(c, data);
      },
      error: (err) => console.error('Error obteniendo historial', err),
    });
  }

  private async generarPdfHistorial(c: CreditoRow, historial: any) {
    try {
      // Leer logo como base64
      const logoBase64 = await this.getLogoBase64('assets/logoSinai.jpg');

      const montoCuota = (c as any).montoCuotaPendiente || c.siguienteCuota?.monto || 0;
      const totalCredito = c.montoRestante;
      const totalInicial = c.totalVenta - c.montoRestante;
      const urbanizacion = c.loteMz?.includes('-')
        ? `MANZANO ${c.loteMz.split('-')[1]} - LOTE ${c.loteMz.split('-')[0]?.replace('L', '')}`
        : c.loteMz;

      // ── Calcular equiv. cuotas por pago ──────────────────────
      let saldoAcumulado = totalCredito;
      let totalEquivCuotas = 0;

      const filasPagos = (historial.pagos ?? []).map((p: any, idx: number) => {
        const monto = Number(p.monto);
        const equivCuota = montoCuota > 0 ? Math.round(monto / montoCuota) : 1;
        totalEquivCuotas += equivCuota;
        saldoAcumulado -= monto;

        const fechaStr = new Date(p.fechaPago).toLocaleDateString('es-BO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return [
          { text: String(idx + 1), alignment: 'center', fontSize: 9 },
          { text: fechaStr, fontSize: 9 },
          {
            text: `BS ${monto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
            bold: true,
            fontSize: 9,
            alignment: 'center',
          },
          { text: String(equivCuota), alignment: 'center', fontSize: 9 },
          {
            text: `BS ${Math.max(0, saldoAcumulado).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
            fontSize: 9,
            alignment: 'right',
          },
        ];
      });

      // Fila subtotal
      const subtotalMonto = (historial.pagos ?? []).reduce(
        (acc: number, p: any) => acc + Number(p.monto),
        0,
      );
      filasPagos.push([
        {
          text: 'SUBTOTAL',
          colSpan: 2,
          bold: true,
          fontSize: 9,
          alignment: 'right',
          fillColor: '#f5f5f5',
        },
        {},
        {
          text: `BS ${subtotalMonto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
          bold: true,
          fontSize: 9,
          alignment: 'center',
          fillColor: '#f5f5f5',
        },
        {
          text: String(totalEquivCuotas),
          alignment: 'center',
          bold: true,
          fontSize: 9,
          fillColor: '#f5f5f5',
        },
        { text: '', fillColor: '#f5f5f5' },
      ]);

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 40, 40, 40],

        content: [
          // ── HEADER ────────────────────────────────────────────────────
          {
            columns: [
              // Logo
              logoBase64
                ? { image: logoBase64, width: 70, margin: [0, 0, 10, 0] }
                : { text: '', width: 70 },
              // Empresa
              {
                width: '*',
                stack: [
                  { text: 'SINAÍ BIENES RAICES', fontSize: 14, bold: true, alignment: 'center' },
                  { text: 'NIT: 5813305010', fontSize: 9, alignment: 'center' },
                  {
                    text: 'AV. BARRIENTOS O. ENTRE C/ V. DE CHAGUAYA Y C/ G. BUCH - BERMEJO',
                    fontSize: 8,
                    alignment: 'center',
                  },
                  { text: 'Teléfono: 74532320', fontSize: 9, alignment: 'center' },
                ],
              },
            ],
            margin: [0, 0, 0, 12],
          },

          // ── Separador ─────────────────────────────────────────────────
          {
            canvas: [
              { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#000' },
            ],
            margin: [0, 0, 0, 8],
          },

          // ── Urbanización ──────────────────────────────────────────────
          {
            text: this.urbLabel,
            fontSize: 11,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 12],
          },

          // ── Info cliente ──────────────────────────────────────────────
          {
            stack: [
              {
                columns: [
                  { text: 'Cliente:', bold: true, fontSize: 9, width: 70 },
                  {
                    text: `${c.cliente.toUpperCase()} | CI: ${(c as any).ci ?? 'S/D'}`,
                    fontSize: 9,
                    width: '*',
                  },
                ],
                margin: [0, 0, 0, 3],
              },
              {
                columns: [
                  { text: 'Lote', bold: true, fontSize: 9, width: 70 },
                  {
                    text: urbanizacion,
                    fontSize: 9,
                    decoration: 'underline',
                    bold: true,
                    width: '*',
                  },
                ],
                margin: [0, 0, 0, 3],
              },
              {
                columns: [
                  { text: 'Pagado:', bold: true, fontSize: 9, width: 70 },
                  {
                    text: `BS ${subtotalMonto.toLocaleString('es-BO', { minimumFractionDigits: 2 })} | Total Inicial: BS ${totalInicial.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
                    fontSize: 9,
                    width: '*',
                  },
                ],
                margin: [0, 0, 0, 3],
              },
              {
                columns: [
                  { text: 'Total Crédito:', bold: true, fontSize: 9, width: 70 },
                  {
                    text: `BS ${totalCredito.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
                    fontSize: 9,
                    width: '*',
                  },
                ],
                margin: [0, 0, 0, 3],
              },
              {
                columns: [
                  { text: 'Total Venta:', bold: true, fontSize: 9, width: 70 },
                  {
                    text: `BS ${c.totalVenta.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
                    fontSize: 9,
                    width: '*',
                  },
                ],
                margin: [0, 0, 0, 10],
              },
            ],
          },

          // ── Título tabla pagos ─────────────────────────────────────────
          {
            text: `PAGOS REALIZADOS - INICIAL: BS ${totalInicial.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
            fontSize: 10,
            bold: true,
            italics: true,
            alignment: 'center',
            margin: [0, 0, 0, 6],
          },

          // ── Tabla pagos ───────────────────────────────────────────────
          {
            table: {
              headerRows: 1,
              widths: [25, '*', 110, 70, 90],
              body: [
                // Header
                [
                  {
                    text: 'Nº',
                    bold: true,
                    fontSize: 9,
                    alignment: 'center',
                    fillColor: '#e0e0e0',
                  },
                  {
                    text: 'FECHA Y HORA',
                    bold: true,
                    fontSize: 9,
                    alignment: 'center',
                    fillColor: '#e0e0e0',
                  },
                  {
                    text: 'MONTO RECIBIDO',
                    bold: true,
                    fontSize: 9,
                    alignment: 'center',
                    fillColor: '#e0e0e0',
                  },
                  {
                    text: 'EQV.CUOTAS',
                    bold: true,
                    fontSize: 9,
                    alignment: 'center',
                    fillColor: '#e0e0e0',
                  },
                  {
                    text: 'SALDO',
                    bold: true,
                    fontSize: 9,
                    alignment: 'center',
                    fillColor: '#e0e0e0',
                  },
                ],
                ...filasPagos,
              ],
            },
            layout: {
              hLineWidth: (i: number, node: any) =>
                i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000',
              vLineColor: () => '#000',
              paddingTop: () => 4,
              paddingBottom: () => 4,
              paddingLeft: () => 5,
              paddingRight: () => 5,
            },
            margin: [0, 0, 0, 8],
          },

          // ── Fila: PRINCIPAL - PAGOS MENSUALES ─────────────────────────
          {
            table: {
              widths: ['*', 90],
              body: [
                [
                  {
                    text: 'PRINCIPAL - PAGOS MENSUALES',
                    bold: true,
                    fontSize: 9,
                    alignment: 'right',
                  },
                  {
                    text: `BS ${totalCredito.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
                    bold: true,
                    fontSize: 9,
                    alignment: 'right',
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000',
              vLineColor: () => '#000',
              paddingTop: () => 4,
              paddingBottom: () => 4,
              paddingLeft: () => 5,
              paddingRight: () => 5,
            },
            margin: [0, 0, 0, 4],
          },

          // ── Fila: TOTAL GENERAL ───────────────────────────────────────
          {
            table: {
              widths: [110, '*', 70, 90],
              body: [
                [
                  { text: 'TOTAL GENERAL', bold: true, fontSize: 9, alignment: 'right' },
                  {
                    text: `BS ${subtotalMonto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
                    bold: true,
                    fontSize: 9,
                    alignment: 'center',
                  },
                  { text: '-', fontSize: 9, alignment: 'center' },
                  {
                    text: `BS ${totalCredito.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
                    bold: true,
                    fontSize: 9,
                    alignment: 'right',
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000',
              vLineColor: () => '#000',
              paddingTop: () => 4,
              paddingBottom: () => 4,
              paddingLeft: () => 5,
              paddingRight: () => 5,
            },
            margin: [0, 0, 0, 0],
          },
        ],

        defaultStyle: { font: 'Roboto', color: '#000000' },
      };

      const fecha = new Date().toLocaleDateString('es-BO').replace(/\//g, '-');
      const fileName = `Historial_${c.cliente.replace(/\s+/g, '_')}_${fecha}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF historial:', error);
    }
  }
  // ── REEMPLAZA el método onCronograma y agrega generarPdfCronograma ──

  async onCronograma(c: CreditoRow) {
    this.svc.getCronograma(c.ventaId).subscribe({
      next: (resp: any) => {
        this.generarPdfCronograma(c, resp.data);
      },
      error: (err) => console.error('Error obteniendo cronograma', err),
    });
  }
fechaLocal(fecha: string | Date): Date {
  if (fecha instanceof Date) return fecha;
  const soloFecha = fecha.split('T')[0];
  const [anio, mes, dia] = soloFecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}
  private async generarPdfCronograma(c: CreditoRow, data: any) {
    try {
      const logoBase64 = await this.getLogoBase64('assets/logoSinai.jpg');

      const plazo = data.plazo as number;
      // const periodicidad = data.periodicidad as string;
      const montoCuota = data.montoFinanciado / plazo;
      const totalCredito = data.montoFinanciado as number;
      const urbanizacion = c.numeroLote + ' ' + c.nombreManzano

      const periodicidadLabel = (data.periodicidad as string)?.toUpperCase() ?? 'MENSUAL';
      // ── Generar filas del cronograma ─────────────────────────
      const filas: any[] = [];

      // Fila 0: saldo inicial (sin número)
      filas.push([
        { text: '', fontSize: 9 },
        { text: '', fontSize: 9 },
        {
          text: `BS ${totalCredito.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
          fontSize: 9,
          bold: true,
          alignment: 'center',
        },
        { text: '', fontSize: 9 },
      ]);

      // Filas de cuotas
      (data.cuotas as any[]).forEach((cuota, idx) => {
  const fecha = this.formatDateLocal(this.parseFechaLocal(cuota.fechaVencimiento));
        const saldoTras = totalCredito - montoCuota * (idx + 1);
        const saldoFinal = Math.max(0, saldoTras);
        const esPagada = cuota.estado === 'PAGADA';
        const esVencida = cuota.estado === 'VENCIDA';

        // Amarillo = siguiente cuota pendiente (la primera que NO está pagada)
        // En la imagen, la fila 1 está amarilla porque es la próxima a pagar
        const esSiguiente =
          !esPagada && idx === (data.cuotas as any[]).findIndex((q: any) => q.estado !== 'PAGADA');
        const fillColor = esSiguiente ? '#FFFACD' : null;

        filas.push([
          { text: String(idx + 1), fontSize: 9, alignment: 'center', fillColor },
          { text: fecha, fontSize: 9, alignment: 'center', fillColor },
          {
            text: `BS ${saldoFinal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
            fontSize: 9,
            alignment: 'center',
            fillColor,
          },
          {
            text: `BS ${montoCuota.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
            fontSize: 9,
            bold: true,
            alignment: 'center',
            fillColor,
          },
        ]);
      });

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 40, 40, 40],

        content: [
          // ── HEADER ──────────────────────────────────────────────────
          {
            columns: [
              logoBase64
                ? { image: logoBase64, width: 70, margin: [0, 0, 10, 0] }
                : { text: '', width: 70 },
              {
                width: '*',
                stack: [
                  { text: 'SINAÍ BIENES RAICES', fontSize: 14, bold: true, alignment: 'center' },
                  { text: 'NIT: 5813305010', fontSize: 9, alignment: 'center' },
                  {
                    text: 'AV. BARRIENTOS O. ENTRE C/ V. DE CHAGUAYA Y C/ G. BUCH - BERMEJO',
                    fontSize: 8,
                    alignment: 'center',
                  },
                  { text: 'Teléfono: 74532320', fontSize: 9, alignment: 'center' },
                ],
              },
            ],
            margin: [0, 0, 0, 12],
          },

          // ── Separador ────────────────────────────────────────────────
          {
            canvas: [
              { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#000' },
            ],
            margin: [0, 0, 0, 8],
          },

          // ── Urbanización ─────────────────────────────────────────────
          {
            text: this.urbLabel,
            fontSize: 11,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 12],
          },

          // ── Info cliente ─────────────────────────────────────────────
          {
            stack: [
              {
                columns: [
                  { text: 'Cliente:', bold: true, fontSize: 9, width: 75 },
                  {
                    text: `${c.cliente.toUpperCase()} | CI: ${(c as any).ci ?? 'S/D'}`,
                    fontSize: 9,
                    width: '*',
                  },
                ],
                margin: [0, 0, 0, 3],
              },
              {
                columns: [
                  { text: 'Lote', bold: true, fontSize: 9, width: 75 },
                  {
                    text: urbanizacion,
                    fontSize: 9,
                    decoration: 'underline',
                    bold: true,
                    width: '*',
                  },
                ],
                margin: [0, 0, 0, 3],
              },
              {
                columns: [
                  { text: 'Pagado:', bold: true, fontSize: 9, width: 75 },
                  {
                    text: `BS ${data.montoPagado.toLocaleString('es-BO', { minimumFractionDigits: 2 })} | Total Inicial: BS ${data.montoInicial.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
                    fontSize: 9,
                    width: '*',
                  },
                ],
                margin: [0, 0, 0, 3],
              },
              {
                columns: [
                  { text: 'Total Crédito:', bold: true, fontSize: 9, width: 75 },
                  {
                    text: `BS ${totalCredito.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
                    fontSize: 9,
                    width: '*',
                  },
                ],
                margin: [0, 0, 0, 3],
              },
              {
                columns: [
                  { text: 'Total Venta:', bold: true, fontSize: 9, width: 75 },
                  {
                    text: `BS ${c.totalVenta.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
                    fontSize: 9,
                    width: '*',
                  },
                ],
                margin: [0, 0, 0, 12],
              },
            ],
          },

          // ── Título tabla ─────────────────────────────────────────────
          {
            stack: [
              {
                text: `CRONOGRAMA DE PAGOS - ${periodicidadLabel} - PRINCIPAL`,
                fontSize: 10,
                bold: true,
                italics: true,
                alignment: 'center',
              },
              {
                text: `${plazo} CUOTAS ${periodicidadLabel}`,
                fontSize: 9,
                bold: true,
                alignment: 'center',
                margin: [0, 2, 0, 0],
              },
            ],
            margin: [0, 0, 0, 6],
          },

          // ── Tabla cronograma ─────────────────────────────────────────
          {
            table: {
              headerRows: 1,
              widths: [25, '*', '*', '*'],
              body: [
                // Header
                [
                  {
                    text: 'Nº',
                    bold: true,
                    fontSize: 9,
                    alignment: 'center',
                    fillColor: '#e0e0e0',
                  },
                  {
                    text: 'FECHA PAGO',
                    bold: true,
                    fontSize: 9,
                    alignment: 'center',
                    fillColor: '#e0e0e0',
                  },
                  {
                    text: 'MONTO RESTANTE',
                    bold: true,
                    fontSize: 9,
                    alignment: 'center',
                    fillColor: '#e0e0e0',
                  },
                  {
                    text: 'CUOTA MENSUAL',
                    bold: true,
                    fontSize: 9,
                    alignment: 'center',
                    fillColor: '#e0e0e0',
                  },
                ],
                ...filas,
              ],
            },
            layout: {
              hLineWidth: (i: number, node: any) =>
                i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000',
              vLineColor: () => '#000',
              paddingTop: () => 4,
              paddingBottom: () => 4,
              paddingLeft: () => 5,
              paddingRight: () => 5,
            },
          },
        ],

        defaultStyle: { font: 'Roboto', color: '#000000' },
      };

      const fecha = new Date().toLocaleDateString('es-BO').replace(/\//g, '-');
      const fileName = `Cronograma_${c.cliente.replace(/\s+/g, '_')}_${fecha}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF cronograma:', error);
    }
  }
  // Convierte una imagen de assets a base64 para pdfMake
  private getLogoBase64(path: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = () => resolve(null);
      img.src = path;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // HELPER: convierte número a letras en español (bolivianos)
  // Agregar como método privado del PdfService
  // ─────────────────────────────────────────────────────────────
  private numeroALetras(monto: number): string {
    const entero = Math.floor(monto);
    const centavos = Math.round((monto - entero) * 100);

    const unidades = [
      '',
      'UN',
      'DOS',
      'TRES',
      'CUATRO',
      'CINCO',
      'SEIS',
      'SIETE',
      'OCHO',
      'NUEVE',
      'DIEZ',
      'ONCE',
      'DOCE',
      'TRECE',
      'CATORCE',
      'QUINCE',
      'DIECISÉIS',
      'DIECISIETE',
      'DIECIOCHO',
      'DIECINUEVE',
    ];
    const decenas = [
      '',
      '',
      'VEINTE',
      'TREINTA',
      'CUARENTA',
      'CINCUENTA',
      'SESENTA',
      'SETENTA',
      'OCHENTA',
      'NOVENTA',
    ];
    const centenas = [
      '',
      'CIENTO',
      'DOSCIENTOS',
      'TRESCIENTOS',
      'CUATROCIENTOS',
      'QUINIENTOS',
      'SEISCIENTOS',
      'SETECIENTOS',
      'OCHOCIENTOS',
      'NOVECIENTOS',
    ];

    const convertirCentenas = (n: number): string => {
      if (n === 0) return '';
      if (n === 100) return 'CIEN';
      const c = Math.floor(n / 100);
      const resto = n % 100;
      const strCentena = centenas[c] ? centenas[c] + (resto > 0 ? ' ' : '') : '';
      if (resto < 20) return strCentena + unidades[resto];
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      return strCentena + decenas[d] + (u > 0 ? ' Y ' + unidades[u] : '');
    };

    const convertirMiles = (n: number): string => {
      if (n === 0) return '';
      if (n < 1000) return convertirCentenas(n);
      const miles = Math.floor(n / 1000);
      const resto = n % 1000;
      const strMiles = miles === 1 ? 'MIL' : convertirCentenas(miles) + ' MIL';
      return strMiles + (resto > 0 ? ' ' + convertirCentenas(resto) : '');
    };

    const strEntero = entero === 0 ? 'CERO' : convertirMiles(entero);
    const strCentavos = String(centavos).padStart(2, '0');

    return `${strEntero} Y ${strCentavos}/100 BOLIVIANOS`;
  }
  // onHistorial(c: CreditoRow) {
  //   console.log('historial PDF', c.ventaId);
  // }
  onAcciones(c: CreditoRow) {
    console.log('acciones', c.ventaId);
  }
  // onExport() {
  //   console.log('export');
  // }

  // ── REEMPLAZA el método onExport en creditos-list.component.ts ──
  // Requiere: import * as XLSX from 'xlsx'; en el componente

  onExport() {
    const creditos = this.svc.creditos();
    if (!creditos.length) return;

    // Armar filas
    const filas = creditos.map((c, i) => ({
      'N°': i + 1,
      Cliente: c.cliente,
      CI: (c as any).ci ?? '',
      'Lote-Mz': c.loteMz,
      'Sig. CP.': c.siguienteCuota
        ? new Date(c.siguienteCuota.fecha).toLocaleDateString('es-BO')
        : '',
      'N° Cuota P.': c.siguienteCuota?.cuotasVencidas ?? 0,
      'M.Cuota P.': c.montoCuotaPendiente,
      'M. Restante': c.montoRestante,
      'Total Venta': c.totalVenta,
    }));

    // Crear hoja
    const ws = XLSX.utils.json_to_sheet(filas);

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 5 }, // N°
      { wch: 30 }, // Cliente
      { wch: 12 }, // CI
      { wch: 12 }, // Lote-Mz
      { wch: 14 }, // Sig. CP.
      { wch: 12 }, // N° Cuota P.
      { wch: 14 }, // M.Cuota P.
      { wch: 14 }, // M. Restante
      { wch: 14 }, // Total Venta
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Créditos');

    const fecha = new Date().toLocaleDateString('es-BO').replace(/\//g, '-');
    XLSX.writeFile(wb, `Creditos_${fecha}.xlsx`);
  }
}

// Pipe helper para min (usado en el template)
import { Pipe, PipeTransform } from '@angular/core';
import { CreditosService } from '../../service/credito.service';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';
import { faFileExport, faArrowsRotate, faMagnifyingGlass, faUser, faIdCard, faCalendarDays, faCoins, faScaleBalanced, faBuilding, faSort, faFileLines, faClockRotateLeft, faTriangleExclamation, faChevronLeft, faChevronRight, faFileInvoiceDollar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
@Pipe({ name: 'min', standalone: true })
export class MinPipe implements PipeTransform {
  transform(value: [number, number]): number {
    return Math.min(value[0], value[1]);
  }
}
