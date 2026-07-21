// services/pdfEgresos.service.ts
import { Injectable } from '@angular/core';
import { FiltrosEgresoDto, EgresosResponse, ReporteCajasResponse } from '../../../core/interfaces/egresos.interface';

// ── Paleta institucional SINAI ─────────────────────────────────
const C = {
  verde:       '#16a34a',
  verdeOscuro: '#15803d',
  verdePale:   '#f0fdf4',
  verdeBorder: '#bbf7d0',
  slate800:    '#1e293b',
  slate700:    '#334155',
  slate600:    '#475569',
  slate500:    '#64748b',
  slate400:    '#94a3b8',
  slate300:    '#cbd5e1',
  slate200:    '#e2e8f0',
  slate100:    '#f1f5f9',
  slate50:     '#f8fafc',
  blanco:      '#ffffff',
  negro:       '#000000',
  grisTabla:   '#d1d5db',
};

// ── Datos de la empresa ────────────────────────────────────────
const EMPRESA = {
  nombre:    'SINAÍ BIENES RAÍCES',
  nit:       'NIT: 5813305010',
  direccion: 'AV. BARRIENTOS O. ENTRE C/ V. DE CHAGUAYA Y C/ G. BUCH - BERMEJO',
  telefono:  'Teléfono: 74532320',
};

@Injectable({ providedIn: 'root' })
export class PdfEgresosService {

  private async getPdfMake() {
    const pdfMake  = (await import('pdfmake/build/pdfmake')) as any;
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')) as any;
    pdfMake.default.vfs = pdfFonts.default.vfs ?? pdfFonts.vfs;
    return pdfMake.default ?? pdfMake;
  }

  // ── Helpers ───────────────────────────────────────────────────
  private money(v: number | string): string {
    return `BS ${Number(v).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private fecha(s: string): string {
    return new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private rango(f: FiltrosEgresoDto): string {
    if (f.fechaInicio && f.fechaFin) return `${this.fecha(f.fechaInicio)} al ${this.fecha(f.fechaFin)}`;
    if (f.fechaInicio) return `Desde: ${this.fecha(f.fechaInicio)}`;
    if (f.fechaFin)    return `Hasta: ${this.fecha(f.fechaFin)}`;
    return 'Todos los tiempos';
  }

  // ── Logo en base64 desde assets ───────────────────────────────
  private async getLogoBase64(): Promise<string | null> {
    try {
      const response = await fetch('assets/logoSinai.jpg');
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  // ── ENCABEZADO INSTITUCIONAL (estilo comprobante SINAI) ───────
  private async buildHeader(tituloReporte: string, subtitulo: string, filtros: FiltrosEgresoDto): Promise<any[]> {
    const logo = await this.getLogoBase64();

    const logoCol: any = logo
      ? { image: logo, width: 60, rowSpan: 3, alignment: 'center', margin: [0, 4, 0, 0] }
      : { text: 'SINAI', fontSize: 14, bold: true, color: C.verde, rowSpan: 3, alignment: 'center', margin: [0, 10, 0, 0] };

    return [
      // ── Bloque superior: logo + datos empresa ─────────────────
      {
        table: {
          widths: [70, '*'],
          body: [
            [
              logoCol,
              { text: EMPRESA.nombre, fontSize: 16, bold: true, alignment: 'center', color: C.slate800, margin: [0, 4, 0, 2] },
            ],
            [
              {},
              { text: EMPRESA.nit, fontSize: 9, alignment: 'center', color: C.slate600 },
            ],
            [
              {},
              { text: EMPRESA.direccion, fontSize: 8, alignment: 'center', color: C.slate600, margin: [0, 1, 0, 1] },
            ],
            [
              { text: EMPRESA.telefono, colSpan: 2, fontSize: 8, alignment: 'center', color: C.slate600, border: [false, false, false, false] },
              {},
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0,
          vLineWidth: (i: number, node: any) => (i === 0 || i === node.table.widths.length) ? 1 : 0,
          hLineColor: () => C.grisTabla,
          vLineColor: () => C.grisTabla,
          paddingLeft:   () => 4,
          paddingRight:  () => 4,
          paddingTop:    () => 2,
          paddingBottom: () => 2,
        },
        margin: [0, 0, 0, 0],
      },

      // ── Banda de título del reporte ───────────────────────────
      {
        table: {
          widths: ['*'],
          body: [[
            { text: tituloReporte, fontSize: 10, bold: true, alignment: 'center', color: C.slate800, margin: [0, 5, 0, 5] },
          ]],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => C.grisTabla,
          vLineColor: () => C.grisTabla,
          paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
        },
        margin: [0, 6, 0, 0],
      },

      // ── Subtítulo / período ───────────────────────────────────
      {
        table: {
          widths: ['*'],
          body: [[
            { text: subtitulo, fontSize: 9, bold: true, alignment: 'center', color: C.slate700, margin: [0, 4, 0, 4] },
          ]],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === node.table.body.length) ? 1 : 0,
          vLineWidth: () => 1,
          hLineColor: () => C.grisTabla,
          vLineColor: () => C.grisTabla,
          paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 10],
      },
    ];
  }

  // ── Ficha de resumen (estilo comprobante) ─────────────────────
  private fichaResumen(filas: { label: string; valor: string; bold?: boolean }[]): any {
    return {
      table: {
        widths: [120, '*'],
        body: filas.map(f => [
          { text: f.label, fontSize: 9, bold: true, color: C.slate700, border: [false, false, false, false], margin: [2, 2, 2, 2] },
          { text: f.valor, fontSize: 9, bold: f.bold ?? false, color: f.bold ? C.slate800 : C.slate600, border: [false, false, false, false], margin: [2, 2, 2, 2] },
        ]),
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 10],
    };
  }

  // ── Encabezado de columna de tabla ────────────────────────────
  private th(text: string, align: 'left' | 'center' | 'right' = 'left'): any {
    return {
      text,
      fontSize: 8,
      bold: true,
      color: C.blanco,
      fillColor: C.slate700,
      alignment: align,
      margin: [5, 5, 5, 5],
      border: [true, true, true, true],
    };
  }

  // ── Celda normal ──────────────────────────────────────────────
  private td(text: string, align: 'left' | 'center' | 'right' = 'left', bold = false, color = C.slate700, rowIdx = 0): any {
    return {
      text: text ?? '',
      fontSize: 8,
      bold,
      color,
      alignment: align,
      fillColor: rowIdx % 2 !== 0 ? C.slate50 : C.blanco,
      margin: [5, 4, 5, 4],
      border: [true, false, true, true],
    };
  }

  // ── Fila de subtotal / total ──────────────────────────────────
  private tdTotal(text: string, align: 'left' | 'center' | 'right' = 'left', accent = false): any {
    return {
      text,
      fontSize: 8,
      bold: true,
      color: accent ? C.verde : C.slate800,
      alignment: align,
      fillColor: accent ? C.verdePale : C.slate100,
      margin: [5, 5, 5, 5],
      border: [true, true, true, true],
    };
  }

  // ── Layout de tabla con bordes completos ──────────────────────
  private get tableLayout() {
    return {
      hLineWidth: () => 0.8,
      vLineWidth: () => 0.8,
      hLineColor: () => C.grisTabla,
      vLineColor: () => C.grisTabla,
      paddingLeft:   () => 0,
      paddingRight:  () => 0,
      paddingTop:    () => 0,
      paddingBottom: () => 0,
    };
  }

  // ── Título de sección interno ─────────────────────────────────
  private secTitle(text: string): any {
    return {
      table: {
        widths: ['*'],
        body: [[{
          text,
          fontSize: 9,
          bold: true,
          color: C.slate700,
          fillColor: C.slate100,
          margin: [6, 4, 6, 4],
          border: [true, true, true, true],
        }]],
      },
      layout: this.tableLayout,
      margin: [0, 12, 0, 0],
    };
  }

  // ── Pie de página ─────────────────────────────────────────────
  private footer(label: string) {
    return (page: number, pages: number) => ({
      columns: [
        { text: `${EMPRESA.nombre} - ${label}`, fontSize: 7, color: C.slate400 },
        {
          text: `Generado: ${new Date().toLocaleString('es-BO')}   |   Página ${page} de ${pages}`,
          fontSize: 7,
          color: C.slate400,
          alignment: 'right',
        },
      ],
      margin: [30, 8, 30, 0],
    });
  }

  // ════════════════════════════════════════════════════════════
  // 1. REPORTE DE GASTOS
  // ════════════════════════════════════════════════════════════
  async generarReporteGastos(data: EgresosResponse, filtros: FiltrosEgresoDto) {
    const pdfMake = await this.getPdfMake();
    const { resumen, egresos } = data;
    const header = await this.buildHeader(
      'REPORTE DE GASTOS',
      `PERÍODO: ${this.rango(filtros)}`,
      filtros,
    );

    const docDef: any = {
      pageSize: 'A4',
      pageMargins: [30, 30, 30, 40],
      content: [
        ...header,

        // Ficha resumen
        this.fichaResumen([
          { label: 'Total de Egresos:',  valor: String(resumen.totalEgresos) },
          { label: 'Monto Total:',       valor: this.money(resumen.montoTotal), bold: true },
          { label: 'Fecha de Reporte:',  valor: new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' }) },
        ]),

        // Tabla detalle
        this.secTitle('DETALLE DE EGRESOS'),
        {
          table: {
            headerRows: 1,
            widths: [20, 55, '*', 80, 90, 80],
            body: [
              [
                this.th('N°',           'center'),
                this.th('Fecha'),
                this.th('Descripción'),
                this.th('Categoría'),
                this.th('Caja'),
                this.th('Monto', 'right'),
              ],
              ...egresos.map((e, i) => [
                this.td(String(i + 1),                    'center', false, C.slate500, i),
                this.td(this.fecha(e.fecha),              'left',   false, C.slate600, i),
                this.td(e.descripcion,                    'left',   false, C.slate700, i),
                this.td(e.categoria?.nombre ?? '—',       'left',   false, C.slate600, i),
                this.td(e.caja?.nombre ?? '—',            'left',   false, C.slate600, i),
                this.td(this.money(e.monto),              'right',  true,  C.slate800, i),
              ]),
              // Fila subtotal
              [
                this.tdTotal('SUBTOTAL', 'left'),
                { ...this.tdTotal(''), colSpan: 4 }, {}, {}, {},
                this.tdTotal(this.money(resumen.montoTotal), 'right', true),
              ],
            ],
          },
          layout: this.tableLayout,
          margin: [0, 0, 0, 0],
        },

        // Bloque total general
        {
          table: {
            widths: ['*', 120],
            body: [[
              this.tdTotal('TOTAL GENERAL', 'right'),
              this.tdTotal(this.money(resumen.montoTotal), 'right', true),
            ]],
          },
          layout: this.tableLayout,
          margin: [0, 0, 0, 0],
        },
      ],
      footer: this.footer('Reporte de Gastos'),
    };

    pdfMake.createPdf(docDef).download(`reporte-gastos-${Date.now()}.pdf`);
  }

  // ════════════════════════════════════════════════════════════
  // 2. CONSOLIDADO DE GASTOS
  // ════════════════════════════════════════════════════════════
  async generarConsolidado(data: EgresosResponse, filtros: FiltrosEgresoDto) {
    const pdfMake = await this.getPdfMake();
    const { resumen, egresos } = data;
    const header = await this.buildHeader(
      'CONSOLIDADO DE GASTOS',
      `PERÍODO: ${this.rango(filtros)}`,
      filtros,
    );

    // Agrupar por mes
    const porMes = new Map<string, { total: number; cantidad: number }>();
    for (const e of egresos) {
      const key = new Date(e.fecha).toLocaleDateString('es-BO', { year: 'numeric', month: 'long' });
      const prev = porMes.get(key) ?? { total: 0, cantidad: 0 };
      porMes.set(key, { total: prev.total + Number(e.monto), cantidad: prev.cantidad + 1 });
    }

    const promedio = porMes.size ? resumen.montoTotal / porMes.size : 0;

    const docDef: any = {
      pageSize: 'A4',
      pageMargins: [30, 30, 30, 40],
      content: [
        ...header,

        // Ficha
        this.fichaResumen([
          { label: 'Total de Egresos:',  valor: String(resumen.totalEgresos) },
          { label: 'Monto Total:',       valor: this.money(resumen.montoTotal), bold: true },
          { label: 'Meses con Gastos:',  valor: String(porMes.size) },
          { label: 'Promedio Mensual:',  valor: this.money(promedio) },
        ]),

        // Tabla por mes
        this.secTitle('RESUMEN POR MES'),
        {
          table: {
            headerRows: 1,
            widths: ['*', 80, 110],
            body: [
              [this.th('Mes'), this.th('Cantidad', 'center'), this.th('Total', 'right')],
              ...Array.from(porMes.entries()).map(([mes, v], i) => [
                this.td(mes,                  'left',   false, C.slate700, i),
                this.td(String(v.cantidad),   'center', false, C.slate600, i),
                this.td(this.money(v.total),  'right',  true,  C.slate800, i),
              ]),
              [
                this.tdTotal('SUBTOTAL', 'left'),
                this.tdTotal(String(resumen.totalEgresos), 'center'),
                this.tdTotal(this.money(resumen.montoTotal), 'right', true),
              ],
            ],
          },
          layout: this.tableLayout,
          margin: [0, 0, 0, 0],
        },
        {
          table: {
            widths: ['*', 80, 110],
            body: [[
              this.tdTotal('TOTAL GENERAL', 'right'),
              this.tdTotal('', 'center'),
              this.tdTotal(this.money(resumen.montoTotal), 'right', true),
            ]],
          },
          layout: this.tableLayout,
          margin: [0, 0, 0, 16],
        },

        // Tabla detalle completo
        this.secTitle('DETALLE COMPLETO DE EGRESOS'),
        {
          table: {
            headerRows: 1,
            widths: [55, '*', 90, 80],
            body: [
              [this.th('Fecha'), this.th('Descripción'), this.th('Caja'), this.th('Monto', 'right')],
              ...egresos.map((e, i) => [
                this.td(this.fecha(e.fecha),    'left',  false, C.slate600, i),
                this.td(e.descripcion,          'left',  false, C.slate700, i),
                this.td(e.caja?.nombre ?? '—',  'left',  false, C.slate600, i),
                this.td(this.money(e.monto),    'right', true,  C.slate800, i),
              ]),
              [
                this.tdTotal('SUBTOTAL', 'left'),
                { ...this.tdTotal(''), colSpan: 2 }, {},
                this.tdTotal(this.money(resumen.montoTotal), 'right', true),
              ],
            ],
          },
          layout: this.tableLayout,
          margin: [0, 0, 0, 0],
        },
        {
          table: {
            widths: ['*', 80],
            body: [[
              this.tdTotal('TOTAL GENERAL', 'right'),
              this.tdTotal(this.money(resumen.montoTotal), 'right', true),
            ]],
          },
          layout: this.tableLayout,
        },
      ],
      footer: this.footer('Consolidado de Gastos'),
    };

    pdfMake.createPdf(docDef).download(`consolidado-gastos-${Date.now()}.pdf`);
  }

  // ════════════════════════════════════════════════════════════
  // 3. GASTOS POR CAJA
  // ════════════════════════════════════════════════════════════
  async generarGastosPorCaja(data: ReporteCajasResponse, filtros: FiltrosEgresoDto) {
    const pdfMake = await this.getPdfMake();
    const { resumen, cajas } = data;
    const header = await this.buildHeader(
      'GASTOS POR CAJA',
      `PERÍODO: ${this.rango(filtros)}`,
      filtros,
    );

    const content: any[] = [
      ...header,

      this.fichaResumen([
        { label: 'Total Cajas:',   valor: String(resumen.totalCajas) },
        { label: 'Monto Total:',   valor: this.money(resumen.montoTotal), bold: true },
      ]),

      // Tabla resumen de cajas
      this.secTitle('RESUMEN POR CAJA'),
      {
        table: {
          headerRows: 1,
          widths: ['*', 65, 100, 65],
          body: [
            [
              this.th('Caja'),
              this.th('Egresos', 'center'),
              this.th('Total', 'right'),
              this.th('Estado', 'center'),
            ],
            ...cajas.map((g, i) => [
              this.td(g.caja.nombre,             'left',   false, C.slate700, i),
              this.td(String(g.totalEgresos),     'center', false, C.slate600, i),
              this.td(this.money(g.montoTotal),   'right',  true,  C.slate800, i),
              {
                text: g.caja.estado,
                fontSize: 8,
                bold: true,
                alignment: 'center',
                color: g.caja.estado === 'ABIERTA' ? C.verde : C.slate500,
                fillColor: g.caja.estado === 'ABIERTA'
                  ? C.verdePale
                  : (i % 2 !== 0 ? C.slate50 : C.blanco),
                margin: [5, 4, 5, 4],
                border: [true, false, true, true],
              },
            ]),
            [
              this.tdTotal('SUBTOTAL', 'left'),
              this.tdTotal(String(resumen.totalCajas), 'center'),
              this.tdTotal(this.money(resumen.montoTotal), 'right', true),
              this.tdTotal('', 'center'),
            ],
          ],
        },
        layout: this.tableLayout,
        margin: [0, 0, 0, 0],
      },
      {
        table: {
          widths: ['*', 65, 100, 65],
          body: [[
            this.tdTotal('TOTAL GENERAL', 'right'),
            this.tdTotal('', 'center'),
            this.tdTotal(this.money(resumen.montoTotal), 'right', true),
            this.tdTotal('', 'center'),
          ]],
        },
        layout: this.tableLayout,
        margin: [0, 0, 0, 0],
      },
    ];

    // ── Detalle por cada caja ────────────────────────────────
    for (const grupo of cajas) {
      content.push(this.secTitle(`CAJA: ${grupo.caja.nombre.toUpperCase()}`));

      // Mini ficha de la caja
      content.push({
        table: {
          widths: ['*', '*', '*'],
          body: [[
            {
              text: `${grupo.totalEgresos} egresos registrados`,
              fontSize: 8, color: C.slate600, border: [true, false, true, false],
              margin: [5, 3, 5, 3],
            },
            {
              text: `Saldo Actual: ${this.money(grupo.caja.saldoActual)}`,
              fontSize: 8, color: C.slate600, alignment: 'center',
              border: [true, false, true, false], margin: [5, 3, 5, 3],
            },
            {
              text: `Total Gastos: ${this.money(grupo.montoTotal)}`,
              fontSize: 8, bold: true, color: C.slate800, alignment: 'right',
              border: [true, false, true, false], margin: [5, 3, 5, 3],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.8,
          hLineColor: () => C.grisTabla,
          vLineColor: () => C.grisTabla,
          paddingLeft: () => 0, paddingRight: () => 0,
          paddingTop: () => 0, paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 0],
      });

      // Detalle de egresos de la caja (si vienen)
      if ((grupo as any).egresos?.length) {
        content.push({
          table: {
            headerRows: 1,
            widths: [55, '*', 90, 80],
            body: [
              [this.th('Fecha'), this.th('Descripción'), this.th('Registrado por'), this.th('Monto', 'right')],
              ...(grupo as any).egresos.map((e: any, i: number) => [
                this.td(this.fecha(e.fecha),          'left',  false, C.slate600, i),
                this.td(e.descripcion,                'left',  false, C.slate700, i),
                this.td(e.usuario?.fullName ?? '—',   'left',  false, C.slate600, i),
                this.td(this.money(e.monto),          'right', true,  C.slate800, i),
              ]),
              [
                this.tdTotal('SUBTOTAL', 'left'),
                { ...this.tdTotal(''), colSpan: 2 }, {},
                this.tdTotal(this.money(grupo.montoTotal), 'right', true),
              ],
            ],
          },
          layout: this.tableLayout,
          margin: [0, 0, 0, 12],
        });
      } else {
        content.push({
          text: 'Sin detalle de egresos disponible para esta caja.',
          fontSize: 8,
          color: C.slate400,
          italics: true,
          margin: [5, 4, 5, 12],
        });
      }
    }

    // Total final
    content.push({
      table: {
        widths: ['*', 120],
        body: [[
          this.tdTotal('TOTAL GENERAL TODAS LAS CAJAS', 'right'),
          this.tdTotal(this.money(resumen.montoTotal), 'right', true),
        ]],
      },
      layout: this.tableLayout,
      margin: [0, 8, 0, 0],
    });

    const docDef: any = {
      pageSize: 'A4',
      pageMargins: [30, 30, 30, 40],
      content,
      footer: this.footer('Gastos por Caja'),
    };

    pdfMake.createPdf(docDef).download(`gastos-por-caja-${Date.now()}.pdf`);
  }
}