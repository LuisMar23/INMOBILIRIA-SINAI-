import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { TDocumentDefinitions, Content, ContentText, StyleDictionary } from 'pdfmake/interfaces';
import { environment } from '../../../../environments/environment';

declare const require: any;
import * as pdfMakeLib from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

const pdfMake: any = pdfMakeLib;
pdfMake.vfs = pdfFonts as any;

interface ManzanoDto {
  id: number;
  uuid: string;
  nombre: string;
}
interface LoteReporte {
  id: number;
  numeroLote: string;
  manzano: ManzanoDto | null; // ← ahora es objeto
  superficieM2: number;
  precioBase: number;
  ubicacion: string | null;
  ciudad: string;
  estado: string;
  urbanizacion: { id: number; nombre: string; ubicacion: string } | null;
}

interface ReporteLotesResponse {
  data: LoteReporte[];
  totalLotes: number;
  generadoEn: string;
}

interface LoteDetalle extends LoteReporte {
  totalVentas: number;
  totalReservas: number;
  totalCotizaciones: number;
  encargado: string | null;
}

interface ReporteLotesDetalleResponse {
  data: LoteDetalle[];
  totalLotes: number;
  totalSuperficieM2: number;
  totalPrecioBase: number;
  generadoEn: string;
}

interface ReporteGeneralResponse {
  disponibles: ReporteLotesResponse;
  vendidos: ReporteLotesResponse;
  reservados: ReporteLotesResponse;
  conOferta: ReporteLotesResponse;
  resumen: {
    totalDisponibles: number;
    totalVendidos: number;
    totalReservados: number;
    totalConOferta: number;
    totalLotes: number;
    totalSuperficieM2: number;
    totalPrecioBase: number;
  };
  generadoEn: string;
}

@Injectable({ providedIn: 'root' })
export class ReportesLotesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reportes/lotes`;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private formatMonto(monto: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  }

  private formatFecha(fecha: Date = new Date()): string {
    return fecha.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

private buildParams(urbanizacionId?: number, manzanoId?: number): HttpParams {
  let params = new HttpParams();
  if (urbanizacionId) params = params.set('urbanizacionId', urbanizacionId);
  if (manzanoId)      params = params.set('manzanoId', manzanoId);
  return params;
}


async getManzanos(urbanizacionId?: number): Promise<ManzanoDto[]> {
  let params = new HttpParams();
  if (urbanizacionId) params = params.set('urbanizacionId', urbanizacionId);
  return firstValueFrom(
    this.http.get<ManzanoDto[]>(`${this.baseUrl}/manzanos`, { params })
  );
}

  private async getLogoBase64(): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = reject;
      img.src = 'assets/logoSinai.jpg';
    });
  }

  // ─── Estilos ─────────────────────────────────────────────────────────────────

  private get estilosBase(): StyleDictionary {
    return {
      nombreEmpresa:  { fontSize: 14, bold: true,  alignment: 'center' as const, margin: [0, 4, 0, 2] },
      datosEmpresa:   { fontSize: 8,  alignment: 'center' as const, color: '#222222', margin: [0, 1, 0, 1] },
      subtituloUrb:   { fontSize: 10, bold: true,  alignment: 'center' as const, margin: [0, 6, 0, 4] },
      tituloReporte:  { fontSize: 9,  bold: true,  italics: true, alignment: 'center' as const, margin: [0, 0, 0, 6] },
      th:             { fontSize: 8,  bold: true,  color: '#000000', margin: [4, 5, 4, 5] },
      celda:          { fontSize: 8,  color: '#000000', margin: [4, 4, 4, 4] },
      celdaNegrita:   { fontSize: 8,  bold: true,  color: '#000000', margin: [4, 4, 4, 4] },
      celdaMonto:     { fontSize: 8,  bold: false, color: '#000000', margin: [4, 4, 4, 4] },
      celdaTotal:     { fontSize: 8,  bold: true,  color: '#000000', margin: [4, 5, 4, 5] },
      subtitulo:      { fontSize: 9,  bold: true,  color: '#000000', margin: [0, 10, 0, 4] },
      footer:         { fontSize: 7,  color: '#555555' },
    };
  }

  /** Layout limpio: solo bordes finos, sin rellenos de color */
  private get layoutLimpio() {
    return {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#000000',
      vLineColor: () => '#000000',
      fillColor:  () => null,
    };
  }

  /** Layout para la fila de totales: borde superior de separación más grueso */
  private layoutConTotal(totalRowIndex: number) {
    return {
      hLineWidth: (i: number) => (i === totalRowIndex ? 1 : 0.5),
      vLineWidth: () => 0.5,
      hLineColor: () => '#000000',
      vLineColor: () => '#000000',
      fillColor:  () => null,
    };
  }

  // ─── Encabezado institucional ─────────────────────────────────────────────────

  private buildEncabezado(logoBase64: string): Content {
    return {
      columns: [
        { image: logoBase64, width: 65, margin: [0, 0, 10, 0] } as Content,
        {
          stack: [
            { text: 'SINAÍ BIENES RAÍCES',                                                      style: 'nombreEmpresa' } as ContentText,
            { text: 'NIT: 5813305010',                                                           style: 'datosEmpresa'  } as ContentText,
            { text: 'AV. BARRIENTOS O. ENTRE C/ V. DE CHAGUAYA Y C/ G. BUCH - BERMEJO',         style: 'datosEmpresa'  } as ContentText,
            { text: 'Teléfono: 74532320',                                                        style: 'datosEmpresa'  } as ContentText,
          ],
          alignment: 'center' as const,
        },
        { text: '', width: 65 } as ContentText,
      ],
      margin: [0, 0, 0, 8],
    } as Content;
  }

  // ─── Tabla Nº | MANZANA-LOTE | ÁREA | PRECIO ─────────────────────────────────

 private buildTablaLotes(
  lotes: LoteReporte[],
  headerMonto: string,
  campoMonto: (l: LoteReporte) => number,
): Content {
  const totalSuperficie = lotes.reduce((s, l) => s + l.superficieM2, 0);
  const totalMonto      = lotes.reduce((s, l) => s + campoMonto(l), 0);

  const filas: any[][] = lotes.map((l, i) => [
    { text: String(i + 1),
      style: 'celda', alignment: 'center' as const },
    { text: `LOTE ${l.numeroLote}${l.manzano ? ' - MANZANO ' + l.manzano.nombre : ''}`, // ← .nombre
      style: 'celda' },
    { text: `${l.superficieM2} M²`,
      style: 'celda', alignment: 'center' as const },
    { text: `BS ${this.formatMonto(campoMonto(l))}`,
      style: 'celdaMonto', alignment: 'right' as const },
  ]);

  const totalRowIndex = filas.length + 1;

  return {
    table: {
      headerRows: 1,
      widths: [25, '*', 80, 90],
      body: [
        [
          { text: 'Nº',              style: 'th', alignment: 'center' as const },
          { text: 'MANZANA - LOTE',  style: 'th', alignment: 'center' as const },
          { text: 'ÁREA',            style: 'th', alignment: 'center' as const },
          { text: headerMonto,       style: 'th', alignment: 'center' as const },
        ],
        ...filas,
        [
          { text: '',                                               style: 'celdaTotal' },
          { text: 'TOTAL',                                          style: 'celdaTotal', alignment: 'right' as const },
          { text: `${totalSuperficie.toFixed(2)} M²`,               style: 'celdaTotal', alignment: 'center' as const },
          { text: `BS ${this.formatMonto(totalMonto)}`,             style: 'celdaTotal', alignment: 'right' as const },
        ],
      ],
    },
    layout: this.layoutConTotal(totalRowIndex),
  } as Content;
}

  // ─── Generador PDF portrait ───────────────────────────────────────────────────

  private async generarPdfPortrait(
    lotes: LoteReporte[],
    logoBase64: string,
    nombreUrbanizacion: string,
    tituloReporte: string,
    nombreArchivo: string,
    headerMonto: string,
    campoMonto: (l: LoteReporte) => number,
  ): Promise<void> {
    const hoy = this.formatFecha();

    const docDef: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 35, 40, 40],
      footer: (currentPage, pageCount) => ({
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: 'center' as const,
        style: 'footer',
        margin: [0, 8, 0, 0],
      }),
      content: [
        this.buildEncabezado(logoBase64),
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#000000' }],
          margin: [0, 0, 0, 4],
        },
        { text: nombreUrbanizacion.toUpperCase(), style: 'subtituloUrb' } as ContentText,
        { text: `${tituloReporte} AL ${hoy}`,     style: 'tituloReporte' } as ContentText,
        this.buildTablaLotes(lotes, headerMonto, campoMonto),
      ],
      styles: this.estilosBase,
    };

    pdfMake.createPdf(docDef).download(
      `${nombreArchivo}_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  }

  // ─── Métodos públicos ─────────────────────────────────────────────────────────

  private nombreUrb(lotes: LoteReporte[]): string {
    const u = lotes[0]?.urbanizacion;
    return u ? `${u.nombre} (${u.ubicacion})` : 'URBANIZACIÓN';
  }

async exportarLotesVendidosPdf(urbanizacionId?: number, manzanoId?: number): Promise<void> {
  const [res, logo] = await Promise.all([
    firstValueFrom(this.http.get<ReporteLotesResponse>(
      `${this.baseUrl}/vendidos`,
      { params: this.buildParams(urbanizacionId, manzanoId) }
    )),
    this.getLogoBase64(),
  ]);
  await this.generarPdfPortrait(res.data, logo, this.nombreUrb(res.data),
    'LISTA DE LOTES VENDIDOS', 'lotes_vendidos', 'PRECIO VENTA', (l) => l.precioBase);
}

 async exportarLotesDisponiblesPdf(urbanizacionId?: number, manzanoId?: number): Promise<void> {
  const [res, logo] = await Promise.all([
    firstValueFrom(this.http.get<ReporteLotesResponse>(
      `${this.baseUrl}/disponibles`,
      { params: this.buildParams(urbanizacionId, manzanoId) }
    )),
    this.getLogoBase64(),
  ]);
  await this.generarPdfPortrait(res.data, logo, this.nombreUrb(res.data),
    'LISTA DE LOTES DISPONIBLES', 'lotes_disponibles', 'PRECIO BASE', (l) => l.precioBase);
}

 async exportarLotesReservadosPdf(urbanizacionId?: number, manzanoId?: number): Promise<void> {
  const [res, logo] = await Promise.all([
    firstValueFrom(this.http.get<ReporteLotesResponse>(
      `${this.baseUrl}/reservados`,
      { params: this.buildParams(urbanizacionId, manzanoId) }
    )),
    this.getLogoBase64(),
  ]);
  await this.generarPdfPortrait(res.data, logo, this.nombreUrb(res.data),
    'LISTA DE LOTES RESERVADOS', 'lotes_reservados', 'MONTO', (l) => l.precioBase);
}

async exportarTotalLotesPdf(urbanizacionId?: number, manzanoId?: number): Promise<void> {
  const [res, logo] = await Promise.all([
    firstValueFrom(this.http.get<ReporteLotesResponse>(
      `${this.baseUrl}`,
      { params: this.buildParams(urbanizacionId, manzanoId) }
    )),
    this.getLogoBase64(),
  ]);
  await this.generarPdfPortrait(res.data, logo, this.nombreUrb(res.data),
    'LISTA TOTAL DE LOTES', 'total_lotes', 'PRECIO BASE', (l) => l.precioBase);
}

  // ─── Reporte detallado (landscape por cantidad de columnas) ──────────────────

async exportarDetalleLotesPdf(urbanizacionId?: number, manzanoId?: number): Promise<void> {
  const [res, logo] = await Promise.all([
    firstValueFrom(this.http.get<ReporteLotesDetalleResponse>(
      `${this.baseUrl}/detalle`,
      { params: this.buildParams(urbanizacionId, manzanoId) }
    )),
    this.getLogoBase64(),
  ]);

  const hoy = this.formatFecha();

  const filas: any[][] = res.data.map((l, i) => [
    { text: String(i + 1),                                                                         style: 'celda',      alignment: 'center' as const },
    { text: `LOTE ${l.numeroLote}${l.manzano ? ' - MANZANO ' + l.manzano.nombre : ''}`,           style: 'celdaNegrita' }, // ← .nombre
    { text: `${l.superficieM2} M²`,                                                                style: 'celda',      alignment: 'center' as const },
    { text: `BS ${this.formatMonto(l.precioBase)}`,                                                style: 'celdaMonto', alignment: 'right'  as const },
    { text: l.estado,                                                                              style: 'celda',      alignment: 'center' as const },
    { text: String(l.totalVentas),                                                                 style: 'celda',      alignment: 'center' as const },
    { text: String(l.totalReservas),                                                               style: 'celda',      alignment: 'center' as const },
    { text: l.encargado ?? '-',                                                                    style: 'celda'                                    },
  ]);

    const totalRowIndex = filas.length + 1;

    const docDef: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [35, 35, 35, 40],
      footer: (currentPage, pageCount) => ({
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: 'center' as const,
        style: 'footer',
        margin: [0, 8, 0, 0],
      }),
      content: [
        this.buildEncabezado(logo),
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 770, y2: 0, lineWidth: 0.5, lineColor: '#000000' }],
          margin: [0, 0, 0, 4],
        },
        { text: this.nombreUrb(res.data).toUpperCase(),       style: 'subtituloUrb'  } as ContentText,
        { text: `REPORTE DETALLADO DE LOTES AL ${hoy}`,       style: 'tituloReporte' } as ContentText,
        {
          table: {
            headerRows: 1,
            widths: [25, '*', 60, 90, 65, 40, 45, 80],
            body: [
              [
                { text: 'Nº',             style: 'th', alignment: 'center' as const },
                { text: 'MANZANA - LOTE', style: 'th', alignment: 'center' as const },
                { text: 'ÁREA',           style: 'th', alignment: 'center' as const },
                { text: 'PRECIO BASE',    style: 'th', alignment: 'center' as const },
                { text: 'ESTADO',         style: 'th', alignment: 'center' as const },
                { text: 'VENTAS',         style: 'th', alignment: 'center' as const },
                { text: 'RESERVAS',       style: 'th', alignment: 'center' as const },
                { text: 'ENCARGADO',      style: 'th', alignment: 'center' as const },
              ],
              ...filas,
              [
                { text: '',                                                          style: 'celdaTotal' },
                { text: 'TOTAL',                                                     style: 'celdaTotal', alignment: 'right' as const },
                { text: `${res.totalSuperficieM2.toFixed(2)} M²`,                   style: 'celdaTotal', alignment: 'center' as const },
                { text: `BS ${this.formatMonto(res.totalPrecioBase)}`,               style: 'celdaTotal', alignment: 'right' as const },
                { text: '',                                                          style: 'celdaTotal' },
                { text: '',                                                          style: 'celdaTotal' },
                { text: '',                                                          style: 'celdaTotal' },
                { text: `${res.totalLotes} lotes`,                                  style: 'celdaTotal', alignment: 'center' as const },
              ],
            ],
          },
          layout: this.layoutConTotal(totalRowIndex),
        } as Content,
      ],
      styles: this.estilosBase,
    };

    pdfMake.createPdf(docDef).download(
      `detalle_lotes_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  }

  // ─── Reporte general detallado ────────────────────────────────────────────────

  async exportarGeneralDetalladoPdf(urbanizacionId?: number): Promise<void> {
    const [res, logo] = await Promise.all([
      firstValueFrom(this.http.get<ReporteGeneralResponse>(`${this.baseUrl}/general-detallado`, { params: this.buildParams(urbanizacionId) })),
      this.getLogoBase64(),
    ]);

    const hoy = this.formatFecha();

    const seccion = (titulo: string, lotes: LoteReporte[], headerMonto: string): Content[] => [
      { text: titulo, style: 'subtitulo', margin: [0, 12, 0, 4] } as ContentText,
      this.buildTablaLotes(lotes, headerMonto, (l) => l.precioBase),
    ];

    const docDef: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 35, 40, 40],
      footer: (currentPage, pageCount) => ({
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: 'center' as const,
        style: 'footer',
        margin: [0, 8, 0, 0],
      }),
      content: [
        this.buildEncabezado(logo),
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#000000' }],
          margin: [0, 0, 0, 4],
        },
        { text: `REPORTE GENERAL DETALLADO DE LOTES AL ${hoy}`, style: 'tituloReporte' } as ContentText,
        // Tabla resumen
        {
          table: {
            widths: ['*', '*', '*', '*', '*'],
            body: [
              [
                { text: 'TOTAL LOTES',  style: 'th', alignment: 'center' as const },
                { text: 'DISPONIBLES',  style: 'th', alignment: 'center' as const },
                { text: 'VENDIDOS',     style: 'th', alignment: 'center' as const },
                { text: 'RESERVADOS',   style: 'th', alignment: 'center' as const },
                { text: 'CON OFERTA',   style: 'th', alignment: 'center' as const },
              ],
              [
                { text: String(res.resumen.totalLotes),       style: 'celdaNegrita', alignment: 'center' as const },
                { text: String(res.resumen.totalDisponibles), style: 'celda',        alignment: 'center' as const },
                { text: String(res.resumen.totalVendidos),    style: 'celda',        alignment: 'center' as const },
                { text: String(res.resumen.totalReservados),  style: 'celda',        alignment: 'center' as const },
                { text: String(res.resumen.totalConOferta),   style: 'celda',        alignment: 'center' as const },
              ],
            ],
          },
          layout: this.layoutLimpio,
          margin: [0, 0, 0, 4],
        } as Content,
        ...seccion('Lotes Disponibles', res.disponibles.data, 'PRECIO BASE'),
        ...seccion('Lotes Vendidos',    res.vendidos.data,    'PRECIO VENTA'),
        ...seccion('Lotes Reservados',  res.reservados.data,  'MONTO'),
        ...seccion('Lotes Con Oferta',  res.conOferta.data,   'PRECIO BASE'),
        {
          columns: [
            { text: `Superficie total: ${res.resumen.totalSuperficieM2.toFixed(2)} M²`,      style: 'celdaTotal'                              },
            { text: `Precio base total: BS ${this.formatMonto(res.resumen.totalPrecioBase)}`, style: 'celdaTotal', alignment: 'right' as const },
          ],
          margin: [0, 10, 0, 0],
        } as Content,
      ],
      styles: this.estilosBase,
    };

    pdfMake.createPdf(docDef).download(
      `reporte_general_lotes_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  }
}