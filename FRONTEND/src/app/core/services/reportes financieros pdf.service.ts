// reportes-financieros-pdf.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as pdfMakeLib from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

import { FiltroFecha, PagoPlanPagoCobro, IngresoPorBanco, ReciboEmitido, OtroIngreso, OtroIngresoPorConcepto, ConsolidadoGastos, GastoPorBanco, GastoPorConcepto,Egreso } from '../interfaces/reportes- financiero';



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

// ── Misma paleta que pdf-generator.service.ts (estilo generarPdfCronograma) ──
// NOTA: estos helpers están duplicados a propósito para que este service sea
// independiente. Si preferís no duplicar, se puede extraer una clase base
// abstracta compartida (`PdfBaseService`) de la que ambos services hereden —
// avisame si querés que lo refactorice así.
const C = {
  negro:      '#1a202c',
  grisOscuro: '#2d3748',
  grisMedio:  '#718096',
  grisPale:   '#f7fafc',
  headerGris: '#e0e0e0',
  destacado:  '#FFFACD',
  alerta:     '#c53030',
};

@Injectable({ providedIn: 'root' })
export class ReportesFinancierosPdfService {

  constructor(private http: HttpClient) {}

  // ── Helpers compartidos ──────────────────────────────────────────

  private async getLogoBase64(assetPath: string): Promise<string | null> {
    try {
      const blob = await firstValueFrom(this.http.get(assetPath, { responseType: 'blob' }));
      return new Promise(resolve => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  private money(v: number | null | undefined): string {
    return `BS ${(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private fecha(s?: string | null): string {
    if (!s) return 'S/D';
    return new Date(s).toLocaleDateString('es-BO');
  }

  private periodo(f: FiltroFecha): string {
    if (f?.fechaInicio && f?.fechaFin) return `Periodo: ${this.fecha(f.fechaInicio)} al ${this.fecha(f.fechaFin)}`;
    if (f?.fechaInicio) return `Desde: ${this.fecha(f.fechaInicio)}`;
    if (f?.fechaFin) return `Hasta: ${this.fecha(f.fechaFin)}`;
    return 'Periodo: Todos los tiempos';
  }

  private buildHeader(logo: string | null, titulo: string): any {
    return [
      {
        columns: [
          logo ? { image: logo, width: 70, margin: [0, 0, 10, 0] } : { text: '', width: 70 },
          {
            width: '*',
            stack: [
              { text: 'SINAÍ BIENES RAICES', fontSize: 14, bold: true, alignment: 'center' },
              { text: 'NIT: 5813305010', fontSize: 9, alignment: 'center' },
              { text: 'AV. BARRIENTOS O. ENTRE C/ V. DE CHAGUAYA Y C/ G. BUCH - BERMEJO', fontSize: 8, alignment: 'center' },
              { text: 'Teléfono: 74532320', fontSize: 9, alignment: 'center' },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#000' }], margin: [0, 0, 0, 8] },
      { text: titulo, fontSize: 11, bold: true, alignment: 'center', margin: [0, 0, 0, 12] },
    ];
  }

  private subHeader(filtros: FiltroFecha): any {
    return {
      columns: [
        { text: this.periodo(filtros), fontSize: 9, bold: true, color: C.negro },
        { text: `Generado: ${new Date().toLocaleString('es-BO')}`, fontSize: 8, color: C.grisMedio, alignment: 'right' },
      ],
      margin: [0, 0, 0, 14],
    };
  }

  private scopeLine(infoAdicional?: any): any {
    return {
      text: `Generado por: ${infoAdicional?.usuario || 'Sistema'} | Fecha: ${infoAdicional?.fechaGeneracion || new Date().toLocaleString('es-BO')}`,
      fontSize: 8,
      italics: true,
      color: C.grisOscuro,
      alignment: 'center',
      margin: [0, 0, 0, 15],
    };
  }

  private statCard(label: string, value: string): any {
    return {
      stack: [
        { text: label, fontSize: 8, bold: true, color: C.grisMedio, alignment: 'center', margin: [0, 0, 0, 4] },
        { text: value, fontSize: 15, bold: true, color: C.negro, alignment: 'center' },
      ],
      fillColor: C.grisPale,
      margin: [3, 6, 3, 6],
    };
  }

  private thCell(text: string, align: 'left' | 'center' | 'right' = 'left'): any {
    return { text, bold: true, fontSize: 9, alignment: align, fillColor: C.headerGris, color: C.negro };
  }

  private td(text: string, align: 'left' | 'center' | 'right' = 'left', bold = false, color = C.negro): any {
    return { text: text || '', fontSize: 9, bold, color, alignment: align };
  }

  private secTitle(text: string): any {
    return {
      stack: [
        { text, fontSize: 10, bold: true, italics: true, alignment: 'center' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#000' }], margin: [0, 3, 0, 0] },
      ],
      margin: [0, 12, 0, 6],
    };
  }

  private layout = {
    hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
    vLineWidth: () => 0.5,
    hLineColor: () => '#000',
    vLineColor: () => '#000',
    paddingTop: () => 4,
    paddingBottom: () => 4,
    paddingLeft: () => 5,
    paddingRight: () => 5,
  };

  private footer = (page: number, pages: number) => ({
    text: `Página ${page} de ${pages}  |  SINAÍ BIENES RAICES`,
    fontSize: 7,
    color: C.grisMedio,
    alignment: 'center',
    margin: [0, 8, 0, 0],
  });

  /** Nombre del inmueble de una venta, con el mismo cuidado del bug de manzano-objeto */
  private inmuebleDeVenta(venta: any): string {
    if (venta?.lote) {
      let t = `Lote ${venta.lote.numeroLote}`;
      const nombreManzano = venta.lote.manzano?.nombre ?? venta.lote.manzano;
      if (nombreManzano && typeof nombreManzano === 'string') t += ` - Mz. ${nombreManzano}`;
      return t;
    }
    if (venta?.propiedad) return venta.propiedad.nombre || 'Propiedad';
    return 'N/A';
  }

  private descargar(doc: any, fileName: string) {
    pdfMake.createPdf(doc).download(fileName);
  }

  private tagFechas(filtros: FiltroFecha): string {
    return filtros?.fechaInicio && filtros?.fechaFin ? `${filtros.fechaInicio}_al_${filtros.fechaFin}` : 'todos';
  }

  // ════════════════════════════════════════════════════════════
  // 1. REPORTE COBRO DE CUOTAS (ingresos reales por ventas)
  // ════════════════════════════════════════════════════════════
  async generarPdfCobroCuotas(datos: PagoPlanPagoCobro[], filtros: FiltroFecha, infoAdicional?: any) {
    const logo = await this.getLogoBase64('assets/logoSinai.jpg');
    const totalCobrado = datos.reduce((sum, p) => sum + Number(p.monto), 0);

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'REPORTE DE COBRO DE CUOTAS'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        {
          columns: [
            this.statCard('PAGOS REGISTRADOS', String(datos.length)),
            this.statCard('TOTAL COBRADO', this.money(totalCobrado)),
          ],
          margin: [0, 0, 0, 10],
        },

        this.secTitle('DETALLE DE PAGOS'),

        {
          table: {
            headerRows: 1,
            widths: ['*', '*', 55, '*', 60, 55],
            body: [
              [
                this.thCell('CLIENTE'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('TIPO CUOTA', 'center'),
                this.thCell('CAJA'),
                this.thCell('MONTO', 'center'),
                this.thCell('FECHA', 'center'),
              ],
              ...datos.map((p) => {
                const venta = p.planPago?.venta;
                const tiposCuota = Array.from(
                  new Set(p.pagoCuotas.map((pc:any) => pc.cuota.tipo)),
                ).join(' / ');
                return [
                  this.td(venta?.cliente?.fullName || 'S/R'),
                  this.td(this.inmuebleDeVenta(venta)),
                  this.td(tiposCuota || '—', 'center'),
                  this.td(venta?.caja?.nombre || 'S/D'),
                  this.td(this.money(p.monto), 'center', true),
                  this.td(this.fecha(p.fecha_pago), 'center'),
                ];
              }),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    this.descargar(doc, `Cobro_Cuotas_${this.tagFechas(filtros)}.pdf`);
  }

  // ════════════════════════════════════════════════════════════
  // 2. INGRESOS POR BANCO
  // ════════════════════════════════════════════════════════════
  async generarPdfIngresosPorBanco(datos: IngresoPorBanco[], filtros: FiltroFecha, infoAdicional?: any) {
    const logo = await this.getLogoBase64('assets/logoSinai.jpg');
    const total = datos.reduce((sum, d) => sum + d.total, 0);

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'INGRESOS POR BANCO / CAJA'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        {
          columns: [this.statCard('TOTAL INGRESADO', this.money(total))],
          margin: [0, 0, 0, 10],
        },

        this.secTitle('DETALLE POR CAJA'),

        {
          table: {
            headerRows: 1,
            widths: ['*', 70, '*'],
            body: [
              [this.thCell('CAJA / BANCO'), this.thCell('CANTIDAD', 'center'), this.thCell('TOTAL', 'center')],
              ...datos.map((d) => [
                this.td(d.nombre),
                this.td(String(d.cantidad), 'center'),
                this.td(this.money(d.total), 'center', true),
              ]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    this.descargar(doc, `Ingresos_por_Banco_${this.tagFechas(filtros)}.pdf`);
  }

  // ════════════════════════════════════════════════════════════
  // 3. RECIBOS EMITIDOS
  // ════════════════════════════════════════════════════════════
  async generarPdfRecibos(datos: ReciboEmitido[], filtros: FiltroFecha, infoAdicional?: any) {
    const logo = await this.getLogoBase64('assets/logoSinai.jpg');

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'RECIBOS EMITIDOS'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        { columns: [this.statCard('TOTAL RECIBOS', String(datos.length))], margin: [0, 0, 0, 10] },

        this.secTitle('LISTADO DE RECIBOS'),

        {
          table: {
            headerRows: 1,
            widths: [28, 60, '*', '*', 65],
            body: [
              [
                this.thCell('Nº', 'center'),
                this.thCell('OPERACIÓN', 'center'),
                this.thCell('CLIENTE'),
                this.thCell('REGISTRADO POR'),
                this.thCell('FECHA', 'center'),
              ],
              ...datos.map((r) => [
                this.td(`#${r.id}`, 'center'),
                this.td(r.tipoOperacion, 'center'),
                this.td(r.venta?.cliente?.fullName || r.reserva?.cliente?.fullName || 'S/R'),
                this.td(r.usuarioRegistro?.fullName || 'N/A'),
                this.td(this.fecha(r.creado_en), 'center'),
              ]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    this.descargar(doc, `Recibos_Emitidos_${this.tagFechas(filtros)}.pdf`);
  }

  // ════════════════════════════════════════════════════════════
  // 4. OTROS INGRESOS (modelo Ingreso, no ligado a ventas)
  // ════════════════════════════════════════════════════════════
  async generarPdfOtrosIngresos(datos: OtroIngreso[], filtros: FiltroFecha, infoAdicional?: any) {
    const logo = await this.getLogoBase64('assets/logoSinai.jpg');
    const total = datos.reduce((sum, d) => sum + Number(d.monto), 0);

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'OTROS INGRESOS'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        {
          columns: [
            this.statCard('REGISTROS', String(datos.length)),
            this.statCard('MONTO TOTAL', this.money(total)),
          ],
          margin: [0, 0, 0, 10],
        },

        this.secTitle('DETALLE'),

        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*', 65],
            body: [
              [this.thCell('CONCEPTO'), this.thCell('DESCRIPCIÓN'), this.thCell('REGISTRADO POR'), this.thCell('MONTO', 'center')],
              ...datos.map((i) => [
                this.td(i.categoria?.nombre || 'Sin categoría'),
                this.td(i.descripcion || '—'),
                this.td(i.usuario?.fullName || 'N/A'),
                this.td(this.money(i.monto), 'center', true),
              ]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    this.descargar(doc, `Otros_Ingresos_${this.tagFechas(filtros)}.pdf`);
  }

  // ════════════════════════════════════════════════════════════
  // 5. OTROS INGRESOS POR CONCEPTO
  // ════════════════════════════════════════════════════════════
  async generarPdfOtrosIngresosPorConcepto(datos: OtroIngresoPorConcepto[], filtros: FiltroFecha, infoAdicional?: any) {
    const logo = await this.getLogoBase64('assets/logoSinai.jpg');
    const total = datos.reduce((sum, d) => sum + d.total, 0);

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'OTROS INGRESOS POR CONCEPTO'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        { columns: [this.statCard('TOTAL', this.money(total))], margin: [0, 0, 0, 10] },

        this.secTitle('DETALLE POR CONCEPTO'),

        {
          table: {
            headerRows: 1,
            widths: ['*', 70, '*'],
            body: [
              [this.thCell('CONCEPTO'), this.thCell('CANTIDAD', 'center'), this.thCell('TOTAL', 'center')],
              ...datos.map((d) => [
                this.td(d.concepto),
                this.td(String(d.cantidad), 'center'),
                this.td(this.money(d.total), 'center', true),
              ]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    this.descargar(doc, `Otros_Ingresos_por_Concepto_${this.tagFechas(filtros)}.pdf`);
  }

  // ════════════════════════════════════════════════════════════
  // 6. REPORTE DE GASTOS
  // ════════════════════════════════════════════════════════════
  async generarPdfGastos(datos: Egreso[], filtros: FiltroFecha, infoAdicional?: any) {
    const logo = await this.getLogoBase64('assets/logoSinai.jpg');
    const total = datos.reduce((sum, d) => sum + Number(d.monto), 0);

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'REPORTE DE GASTOS'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        {
          columns: [
            this.statCard('REGISTROS', String(datos.length)),
            this.statCard('MONTO TOTAL', this.money(total)),
          ],
          margin: [0, 0, 0, 10],
        },

        this.secTitle('DETALLE DE GASTOS'),

        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*', 65, 55],
            body: [
              [
                this.thCell('CONCEPTO'),
                this.thCell('DESCRIPCIÓN'),
                this.thCell('CAJA'),
                this.thCell('MONTO', 'center'),
                this.thCell('FECHA', 'center'),
              ],
              ...datos.map((e) => [
                this.td(e.categoria?.nombre || 'Sin categoría'),
                this.td(e.descripcion || '—'),
                this.td(e.caja?.nombre || 'S/D'),
                this.td(this.money(e.monto), 'center', true, C.alerta),
                this.td(this.fecha(e.fecha), 'center'),
              ]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    this.descargar(doc, `Reporte_Gastos_${this.tagFechas(filtros)}.pdf`);
  }

  // ════════════════════════════════════════════════════════════
  // 7. CONSOLIDADO DE GASTOS
  // ════════════════════════════════════════════════════════════
  async generarPdfConsolidadoGastos(datos: ConsolidadoGastos, filtros: FiltroFecha, infoAdicional?: any) {
    const logo = await this.getLogoBase64('assets/logoSinai.jpg');

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'CONSOLIDADO DE GASTOS'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        {
          columns: [
            this.statCard('TOTAL GASTADO', this.money(datos.totalGastado)),
            this.statCard('CANTIDAD DE EGRESOS', String(datos.cantidadEgresos)),
          ],
          margin: [0, 0, 0, 10],
        },

        this.secTitle('POR CATEGORÍA'),
        {
          table: {
            headerRows: 1,
            widths: ['*', '*'],
            body: [
              [this.thCell('CATEGORÍA'), this.thCell('TOTAL', 'center')],
              ...datos.porCategoria.map((c:any) => [this.td(c.nombre), this.td(this.money(c.total), 'center', true)]),
            ],
          },
          layout: this.layout,
        },

        this.secTitle('POR CAJA'),
        {
          table: {
            headerRows: 1,
            widths: ['*', '*'],
            body: [
              [this.thCell('CAJA'), this.thCell('TOTAL', 'center')],
              ...datos.porCaja.map((c:any) => [this.td(c.nombre), this.td(this.money(c.total), 'center', true)]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    this.descargar(doc, `Consolidado_Gastos_${this.tagFechas(filtros)}.pdf`);
  }

  // ════════════════════════════════════════════════════════════
  // 8. GASTOS POR BANCO
  // ════════════════════════════════════════════════════════════
  async generarPdfGastosPorBanco(datos: GastoPorBanco[], filtros: FiltroFecha, infoAdicional?: any) {
    const logo = await this.getLogoBase64('assets/logoSinai.jpg');
    const total = datos.reduce((sum, d) => sum + d.total, 0);

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'GASTOS POR BANCO / CAJA'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        { columns: [this.statCard('TOTAL GASTADO', this.money(total))], margin: [0, 0, 0, 10] },

        this.secTitle('DETALLE POR CAJA'),
        {
          table: {
            headerRows: 1,
            widths: ['*', 70, '*'],
            body: [
              [this.thCell('CAJA / BANCO'), this.thCell('CANTIDAD', 'center'), this.thCell('TOTAL', 'center')],
              ...datos.map((d) => [
                this.td(d.nombre),
                this.td(String(d.cantidad), 'center'),
                this.td(this.money(d.total), 'center', true, C.alerta),
              ]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    this.descargar(doc, `Gastos_por_Banco_${this.tagFechas(filtros)}.pdf`);
  }

  // ════════════════════════════════════════════════════════════
  // 9. GASTOS POR CONCEPTO
  // ════════════════════════════════════════════════════════════
  async generarPdfGastosPorConcepto(datos: GastoPorConcepto[], filtros: FiltroFecha, infoAdicional?: any) {
    const logo = await this.getLogoBase64('assets/logoSinai.jpg');
    const total = datos.reduce((sum, d) => sum + d.total, 0);

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'GASTOS POR CONCEPTO'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        { columns: [this.statCard('TOTAL GASTADO', this.money(total))], margin: [0, 0, 0, 10] },

        this.secTitle('DETALLE POR CONCEPTO'),
        {
          table: {
            headerRows: 1,
            widths: ['*', 70, '*'],
            body: [
              [this.thCell('CONCEPTO'), this.thCell('CANTIDAD', 'center'), this.thCell('TOTAL', 'center')],
              ...datos.map((d) => [
                this.td(d.concepto),
                this.td(String(d.cantidad), 'center'),
                this.td(this.money(d.total), 'center', true, C.alerta),
              ]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    this.descargar(doc, `Gastos_por_Concepto_${this.tagFechas(filtros)}.pdf`);
  }
}