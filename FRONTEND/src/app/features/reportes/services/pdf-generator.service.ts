// services/pdf-generator.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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

// ── Paleta unificada (mismo lenguaje visual que generarPdfCronograma) ──
// Header de tabla gris neutro, bordes negros, único color de énfasis = amarillo.
const C = {
  negro:       '#1a202c',
  grisOscuro:  '#2d3748',
  grisMedio:   '#718096',
  grisClaro:   '#e2e8f0',
  grisPale:    '#f7fafc',
  headerGris:  '#e0e0e0', // mismo gris que el header de la tabla del cronograma
  blanco:      '#ffffff',
  destacado:   '#FFFACD', // mismo amarillo que usa el cronograma para la fila "siguiente/pendiente"
  alerta:      '#c53030', // solo como color de texto, sin fondo saturado
};

@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {

  constructor(private http: HttpClient) {}

  // ── Helpers ───────────────────────────────────────────────────

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

  private money(v: number): string {
    return `BS ${(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private fecha(s: string): string {
    if (!s) return 'S/D';
    return new Date(s).toLocaleDateString('es-BO');
  }

  private periodo(f: any): string {
    if (f?.fechaInicio && f?.fechaFin)
      return `Periodo: ${this.fecha(f.fechaInicio)} al ${this.fecha(f.fechaFin)}`;
    if (f?.fechaInicio) return `Desde: ${this.fecha(f.fechaInicio)}`;
    if (f?.fechaFin)    return `Hasta: ${this.fecha(f.fechaFin)}`;
    return 'Periodo: Todos los tiempos';
  }

  /**
   * Nombre del inmueble asociado a una venta.
   * OJO: `lote.manzano` es una RELACIÓN (objeto Manzano { id, nombre, ... }),
   * no un string. Hay que usar `.nombre`, si no, JS lo concatena como
   * "[object Object]". Este es el bug que estaba en el service original.
   */
  private inmueble(venta: any): string {
    if (venta?.lote) {
      let t = `Lote ${venta.lote.numeroLote}`;
      const nombreManzano = venta.lote.manzano?.nombre ?? venta.lote.manzano;
      if (nombreManzano && typeof nombreManzano === 'string') {
        t += ` - Mz. ${nombreManzano}`;
      }
      if (venta.lote.ciudad) t += ` (${venta.lote.ciudad})`;
      return t;
    }
    if (venta?.propiedad) {
      let t = venta.propiedad.nombre || 'Propiedad';
      if (venta.propiedad.ciudad) t += ` - ${venta.propiedad.ciudad}`;
      return t;
    }
    return 'N/A';
  }

  /** Igual que `inmueble()` pero para objetos "inmueble" sueltos (reporte de cuotas) */
  private inmuebleDesdeCuota(c: any): string {
    if (!c?.venta?.inmueble) return 'N/A';
    const inm = c.venta.inmueble;
    if (c.venta.inmuebleTipo === 'LOTE') {
      let t = `Lote ${inm.numeroLote || 'N/A'}`;
      const nombreManzano = inm.manzano?.nombre ?? inm.manzano;
      if (nombreManzano && typeof nombreManzano === 'string') {
        t += ` - Mz. ${nombreManzano}`;
      }
      return t;
    }
    return inm.nombre || 'Propiedad';
  }

  // ── Bloques reutilizables (idénticos al estilo de generarPdfCronograma) ──

  /** Encabezado unificado (vertical) — igual que el cronograma */
  private buildHeader(logo: string | null, titulo: string): any {
    return [
      {
        columns: [
          logo
            ? { image: logo, width: 70, margin: [0, 0, 10, 0] }
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
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#000' },
        ],
        margin: [0, 0, 0, 8],
      },
      {
        text: titulo,
        fontSize: 11,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 12],
      },
    ];
  }

  /** Fila de periodo + fecha de generación */
  private subHeader(filtros: any): any {
    return {
      columns: [
        { text: this.periodo(filtros), fontSize: 9, bold: true, color: C.negro },
        { text: `Generado: ${new Date().toLocaleString('es-BO')}`, fontSize: 8, color: C.grisMedio, alignment: 'right' },
      ],
      margin: [0, 0, 0, 14],
    };
  }

  /** Línea de alcance/usuario/fecha (mismo formato en todos los reportes) */
  private scopeLine(infoAdicional: any): any {
    const alcanceTexto = infoAdicional?.alcance === 'global'
      ? 'GLOBAL (Todos los datos)'
      : `URBANIZACIÓN: ${infoAdicional?.urbanizacionNombre || 'Sin urbanización'}`;
    return {
      text: `Alcance: ${alcanceTexto} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | Fecha: ${infoAdicional?.fechaGeneracion || new Date().toLocaleString('es-BO')}`,
      fontSize: 8,
      italics: true,
      color: C.grisOscuro,
      alignment: 'center',
      margin: [0, 0, 0, 15],
    };
  }

  /** Tarjeta de estadística — monocromática, estilo cronograma (sin colores por tipo de dato) */
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

  /** Cabecera de celda de tabla — gris neutro + negro, igual que el cronograma */
  private thCell(text: string, align: 'left' | 'center' | 'right' = 'left'): any {
    return {
      text,
      bold: true,
      fontSize: 9,
      alignment: align,
      fillColor: C.headerGris,
      color: C.negro,
    };
  }

  /** Celda normal */
  private td(text: string, align: 'left' | 'center' | 'right' = 'left', bold = false, color = C.negro): any {
    return { text: text || '', fontSize: 9, bold, color, alignment: align };
  }

  /** Sección de título interno — bold + italic + línea, igual al título del cronograma */
  private secTitle(text: string): any {
    return {
      stack: [
        { text, fontSize: 10, bold: true, italics: true, alignment: 'center' },
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#000' }],
          margin: [0, 3, 0, 0],
        },
      ],
      margin: [0, 12, 0, 6],
    };
  }

  /** Layout de tabla — bordes negros, exactamente como en generarPdfCronograma */
  private layout = {
    hLineWidth: (i: number, node: any) =>
      i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
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

  private alcanceTag(infoAdicional?: any): string {
    return infoAdicional?.alcance === 'global'
      ? 'global'
      : (infoAdicional?.urbanizacionNombre || 'urbanizacion');
  }

  private tagFechas(filtros: any): string {
    return filtros?.fechaInicio && filtros?.fechaFin
      ? `${filtros.fechaInicio}_al_${filtros.fechaFin}`
      : 'todos';
  }

  // ── 1. REPORTE GENERAL ────────────────────────────────────────
  async generarReporteGeneral(data: any, filtros: any, infoAdicional?: any) {
    const logo    = await this.getLogoBase64('assets/logoSinai.jpg');
    const resumen = data?.resumen || {};
    const ventas  = data?.ventas  || [];

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'REPORTE GENERAL DE VENTAS'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        {
          columns: [
            this.statCard('TOTAL VENTAS', String(resumen.totalVentas || 0)),
            this.statCard('MONTO TOTAL', this.money(resumen.montoTotal || 0)),
            this.statCard('VENTAS PAGADAS', String(resumen.porEstado?.pagado || 0)),
            this.statCard('VENTAS PENDIENTES', String(resumen.porEstado?.pendiente || 0)),
          ],
          margin: [0, 0, 0, 10],
        },

        this.secTitle('DETALLE DE VENTAS'),

        {
          table: {
            headerRows: 1,
            widths: [28, '*', 55, '*', '*', 70, 58],
            body: [
              [
                this.thCell('Nº', 'center'),
                this.thCell('CLIENTE'),
                this.thCell('CI', 'center'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('ASESOR'),
                this.thCell('MONTO', 'center'),
                this.thCell('FECHA', 'center'),
              ],
              ...ventas.map((v: any) => [
                this.td(`#${v.id}`, 'center'),
                this.td(v.cliente?.fullName || 'S/R'),
                this.td(v.cliente?.ci || 'S/D', 'center'),
                this.td(this.inmueble(v)),
                this.td(v.asesor?.fullName || 'N/A'),
                this.td(this.money(v.precioFinal), 'center', true),
                this.td(this.fecha(v.createdAt), 'center'),
              ]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    pdfMake.createPdf(doc).download(`Reporte_General_${this.alcanceTag(infoAdicional)}_${this.tagFechas(filtros)}.pdf`);
  }

  // ── 2. VENTAS POR VENDEDOR ────────────────────────────────────
  async generarReporteVendedores(data: any, filtros: any, infoAdicional?: any) {
    const logo       = await this.getLogoBase64('assets/logoSinai.jpg');
    const vendedores = data?.vendedores || [];
    const resumen     = data?.resumen    || {};

    const posiciones = ['1er', '2do', '3er'];

    const rankingRows = vendedores.map((v: any, i: number) => ({
      columns: [
        {
          width: 30,
          stack: [{ text: posiciones[i] || `${i + 1}`, fontSize: 10, bold: true, alignment: 'center' }],
        },
        {
          width: '*',
          stack: [
            { text: v.asesor.fullName, fontSize: 10, bold: true, color: C.negro },
            { text: `${v.totalVentas} ventas  |  Pagadas: ${v.ventasPagadas}  |  Pendientes: ${v.ventasPendientes}`, fontSize: 8, color: C.grisMedio },
          ],
        },
        {
          width: 110,
          stack: [{ text: this.money(v.montoTotal), fontSize: 12, bold: true, alignment: 'right' }],
        },
      ],
      fillColor: i === 0 ? C.destacado : C.grisPale,
      margin: [0, 0, 0, 4],
    }));

    const detalleBody = vendedores.flatMap((v: any) =>
      v.detalle?.map((venta: any) => [
        this.td(v.asesor.fullName),
        this.td(venta.cliente?.fullName || 'S/R'),
        this.td(venta.cliente?.ci || 'S/D', 'center'),
        this.td(this.inmueble(venta)),
        this.td(this.money(venta.precioFinal), 'center', true),
      ]) || []
    );

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'REPORTE DE VENTAS POR VENDEDOR'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        {
          columns: [
            this.statCard('VENDEDORES', String(resumen.totalVendedores || 0)),
            this.statCard('TOTAL VENTAS', String(resumen.totalVentas || 0)),
            this.statCard('MONTO TOTAL', this.money(resumen.montoTotal || 0)),
          ],
          margin: [0, 0, 0, 10],
        },

        this.secTitle('RANKING DE VENDEDORES'),
        ...rankingRows,

        this.secTitle('DETALLE DE VENTAS POR VENDEDOR'),

        {
          table: {
            headerRows: 1,
            widths: ['*', '*', 55, '*', 75],
            body: [
              [
                this.thCell('VENDEDOR'),
                this.thCell('CLIENTE'),
                this.thCell('CI', 'center'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('MONTO', 'center'),
              ],
              ...(detalleBody.length ? detalleBody : [[
                { text: 'Sin detalle disponible', colSpan: 5, fontSize: 9, color: C.grisMedio, alignment: 'center', margin: [0, 6, 0, 6] },
                {}, {}, {}, {},
              ]]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    pdfMake.createPdf(doc).download(`Reporte_Vendedores_${this.alcanceTag(infoAdicional)}_${this.tagFechas(filtros)}.pdf`);
  }

  // ── 3. CUOTAS POR COBRAR ──────────────────────────────────────
  async generarReporteCuotas(data: any, filtros: any, infoAdicional?: any) {
    const logo    = await this.getLogoBase64('assets/logoSinai.jpg');
    const cuotas   = data?.cuotas  || [];
    const resumen  = data?.resumen || {};

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'REPORTE DE CUOTAS POR COBRAR'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        {
          columns: [
            this.statCard('TOTAL POR COBRAR', this.money(resumen.totalPorCobrar || 0)),
            this.statCard('PLANES VENCIDOS', String(resumen.planesVencidos || 0)),
            this.statCard('PLANES ACTIVOS', String(resumen.totalPlanes || 0)),
          ],
          margin: [0, 0, 0, 10],
        },

        this.secTitle('DETALLE DE CUOTAS PENDIENTES'),

        {
          table: {
            headerRows: 1,
            widths: ['*', 55, 70, '*', 80, 60, 50],
            body: [
              [
                this.thCell('CLIENTE'),
                this.thCell('CI', 'center'),
                this.thCell('TELEFONO'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('SALDO', 'center'),
                this.thCell('VENCIMIENTO', 'center'),
                this.thCell('ESTADO', 'center'),
              ],
              ...cuotas.map((c: any) => {
                const vencido = c.estaVencido;
                return [
                  this.td(c.venta?.cliente?.fullName || 'S/R'),
                  this.td(c.venta?.cliente?.ci || 'S/D', 'center'),
                  this.td(c.venta?.cliente?.telefono || 'S/D'),
                  this.td(this.inmuebleDesdeCuota(c)),
                  this.td(this.money(c.saldoPendiente), 'center', true, vencido ? C.alerta : C.negro),
                  this.td(this.fecha(c.fechaVencimiento), 'center'),
                  {
                    text: vencido ? 'VENCIDO' : 'AL DIA',
                    fontSize: 8,
                    bold: true,
                    alignment: 'center',
                    color: vencido ? C.alerta : C.negro,
                    fillColor: vencido ? C.destacado : null,
                  },
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

    pdfMake.createPdf(doc).download(`Cuotas_por_Cobrar_${this.alcanceTag(infoAdicional)}_${this.tagFechas(filtros)}.pdf`);
  }

  // ── 4. DETALLE DE VENTAS ──────────────────────────────────────
  async generarReporteDetalle(data: any, filtros: any, infoAdicional?: any) {
    const logo   = await this.getLogoBase64('assets/logoSinai.jpg');
    const ventas  = data || [];

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'DETALLE COMPLETO DE VENTAS'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        {
          columns: [this.statCard('TOTAL REGISTROS', String(ventas.length))],
          margin: [0, 0, 0, 10],
        },

        this.secTitle('LISTADO DE VENTAS'),

        {
          table: {
            headerRows: 1,
            widths: [28, '*', 55, '*', '*', 72, 58],
            body: [
              [
                this.thCell('Nº', 'center'),
                this.thCell('CLIENTE'),
                this.thCell('CI', 'center'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('ASESOR'),
                this.thCell('PRECIO', 'center'),
                this.thCell('FECHA', 'center'),
              ],
              ...ventas.map((v: any) => [
                this.td(`#${v.id}`, 'center'),
                this.td(v.cliente?.fullName || 'S/R'),
                this.td(v.cliente?.ci || 'S/D', 'center'),
                this.td(this.inmueble(v)),
                this.td(v.asesor?.fullName || 'N/A'),
                this.td(this.money(v.precioFinal), 'center', true),
                this.td(this.fecha(v.createdAt), 'center'),
              ]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    pdfMake.createPdf(doc).download(`Detalle_Ventas_${this.alcanceTag(infoAdicional)}_${this.tagFechas(filtros)}.pdf`);
  }

  // ── 5. VENTAS COMPLETADAS ─────────────────────────────────────
  async generarReporteCompletadas(data: any, filtros: any, infoAdicional?: any) {
    const logo    = await this.getLogoBase64('assets/logoSinai.jpg');
    const resumen  = data?.resumen || {};
    const ventas   = data?.ventas  || [];

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'VENTAS COMPLETADAS - 100% PAGADAS'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        {
          columns: [
            this.statCard('VENTAS PAGADAS', String(resumen.totalCompletadas || 0)),
            this.statCard('MONTO TOTAL', this.money(resumen.montoTotal || 0)),
          ],
          margin: [0, 0, 0, 10],
        },

        this.secTitle('DETALLE DE VENTAS COMPLETADAS'),

        {
          table: {
            headerRows: 1,
            widths: [28, '*', 55, '*', 72, 65],
            body: [
              [
                this.thCell('Nº', 'center'),
                this.thCell('CLIENTE'),
                this.thCell('CI', 'center'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('MONTO', 'center'),
                this.thCell('FECHA PAGO', 'center'),
              ],
              ...ventas.map((v: any) => [
                this.td(`#${v.id}`, 'center'),
                this.td(v.cliente?.fullName || 'S/R'),
                this.td(v.cliente?.ci || 'S/D', 'center'),
                this.td(this.inmueble(v)),
                this.td(this.money(v.precioFinal), 'center', true),
                this.td(this.fecha(v.updatedAt || v.createdAt), 'center'),
              ]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    pdfMake.createPdf(doc).download(`Ventas_Completadas_${this.alcanceTag(infoAdicional)}_${this.tagFechas(filtros)}.pdf`);
  }

  // ── 6. VENTAS POR CLIENTE ─────────────────────────────────────
  async generarReporteCliente(data: any, filtros: any, infoAdicional?: any) {
    const logo    = await this.getLogoBase64('assets/logoSinai.jpg');
    const cliente  = data?.cliente || {};
    const resumen  = data?.resumen || {};
    const ventas   = data?.ventas  || [];

    const fichaRow = (label: string, value: string) => ({
      columns: [
        { text: label, fontSize: 9, bold: true, color: C.grisMedio, width: 120 },
        { text: value || 'S/D', fontSize: 9, color: C.negro, width: '*' },
      ],
      margin: [0, 2, 0, 2],
    });

    const doc: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40],
      content: [
        ...this.buildHeader(logo, 'HISTORIAL DE VENTAS POR CLIENTE'),
        this.scopeLine(infoAdicional),
        this.subHeader(filtros),

        this.secTitle('DATOS DEL CLIENTE'),
        {
          fillColor: C.grisPale,
          stack: [
            fichaRow('Nombre completo:', cliente?.fullName),
            fichaRow('Cedula de identidad:', cliente?.ci),
            fichaRow('Telefono:', cliente?.telefono),
            fichaRow('Email:', cliente?.email),
          ],
          margin: [8, 8, 8, 8],
        },

        {
          columns: [
            this.statCard('TOTAL VENTAS', String(resumen.totalVentas || 0)),
            this.statCard('MONTO TOTAL', this.money(resumen.montoTotal || 0)),
            this.statCard('PAGADAS', String(resumen.ventasPagadas || 0)),
            this.statCard('PENDIENTES', String(resumen.ventasPendientes || 0)),
          ],
          margin: [0, 12, 0, 10],
        },

        this.secTitle('HISTORIAL DE COMPRAS'),

        {
          table: {
            headerRows: 1,
            widths: [28, '*', '*', 72, 58],
            body: [
              [
                this.thCell('Nº', 'center'),
                this.thCell('INMUEBLE / MANZANO'),
                this.thCell('ASESOR'),
                this.thCell('MONTO', 'center'),
                this.thCell('FECHA', 'center'),
              ],
              ...ventas.map((v: any) => [
                this.td(`#${v.id}`, 'center'),
                this.td(this.inmueble(v)),
                this.td(v.asesor?.fullName || 'N/A'),
                this.td(this.money(v.precioFinal), 'center', true),
                this.td(this.fecha(v.createdAt), 'center'),
              ]),
            ],
          },
          layout: this.layout,
        },
      ],
      footer: this.footer,
      defaultStyle: { font: 'Roboto', color: C.negro },
    };

    const nombre = cliente?.fullName?.replace(/\s+/g, '_') || 'Cliente';
    pdfMake.createPdf(doc).download(`Historial_${nombre}_${this.alcanceTag(infoAdicional)}.pdf`);
  }
}