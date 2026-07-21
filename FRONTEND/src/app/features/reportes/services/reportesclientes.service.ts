import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
declare const require: any;
import * as pdfMakeLib from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
const pdfMake: any = pdfMakeLib;
pdfMake.vfs = pdfFonts as any;
import { TDocumentDefinitions, Content, ContentText } from 'pdfmake/interfaces';
import { environment } from '../../../../environments/environment';


interface ClienteReporte {
  id: number;
  fullName: string;
  ci: string;
  email: string | null;
  telefono: string;
  direccion: string | null;
  observaciones: string | null;
  isActive: boolean;
  createdAt: string;
  totalVentas: number;
  totalReservas: number;
  totalVisitas: number;
  montoTotal: number;
}

interface ReporteClientesResponse {
  data: ClienteReporte[];
  totalClientes: number;
  generadoEn: string;
}

interface ReporteClientesPotencialesResponse {
  data: ClienteReporte[];
  totalMostrados: number;
  totalGeneralBs: number;
  nota: string;
  generadoEn: string;
}

@Injectable({ providedIn: 'root' })
export class ReportesClientesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reportes/clientes`;

  private formatMonto(monto: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  }

  private formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private async getLogoBase64(): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = reject;
      img.src = 'assets/logoSinai.jpg';
    });
  }

  private buildEncabezadoEmpresa(logoBase64: string): Content {
    return {
      columns: [
        {
          image: logoBase64,
          width: 70,
          margin: [0, 0, 10, 0],
        } as Content,
        {
          stack: [
            { text: 'SINAÍ BIENES RAÍCES', style: 'nombreEmpresa' } as ContentText,
            { text: 'NIT: 5813305010', style: 'datosEmpresa' } as ContentText,
            {
              text: 'AV. BARRIENTOS O. ENTRE C/ V. DE CHAGUAYA Y C/ G. BUCH - BERMEJO',
              style: 'datosEmpresa',
            } as ContentText,
            { text: 'Teléfono: 74532320', style: 'datosEmpresa' } as ContentText,
          ],
          alignment: 'center',
        },
        { text: '', width: 70 } as ContentText,
      ],
      margin: [0, 0, 0, 16],
    } as Content;
  }

  // ─── XLS: Todos los contactos ────────────────────────────────────────────
  async exportarTodosContactosXls(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<ReporteClientesResponse>(`${this.baseUrl}`)
    );

    const filas = res.data.map((c, i) => ({
      'N°': i + 1,
      'Nombre Completo': c.fullName,
      'CI/NIT': c.ci,
      'Email': c.email ?? '-',
      'Teléfono': c.telefono,
      'Dirección': c.direccion ?? '-',
      'Observaciones': c.observaciones ?? '-',
      'Ventas': c.totalVentas,
      'Reservas': c.totalReservas,
      'Visitas': c.totalVisitas,
      'Monto Total (Bs.)': c.montoTotal,
      'Estado': c.isActive ? 'Activo' : 'Inactivo',
      'Registro': this.formatFecha(c.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
    ws['!cols'] = [
      { wch: 5 },  { wch: 30 }, { wch: 15 }, { wch: 28 },
      { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 8 },
      { wch: 10 }, { wch: 8 },  { wch: 18 }, { wch: 10 }, { wch: 12 },
    ];
    XLSX.writeFile(wb, `todos_contactos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // ─── XLS: Solo clientes ──────────────────────────────────────────────────
  async exportarSoloClientesXls(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<ReporteClientesResponse>(`${this.baseUrl}`)
    );

    const filas = res.data.map((c, i) => ({
      'N°': i + 1,
      'Nombre Completo': c.fullName,
      'CI/NIT': c.ci,
      'Email': c.email ?? '-',
      'Teléfono': c.telefono,
      'Dirección': c.direccion ?? '-',
      'Ventas': c.totalVentas,
      'Reservas': c.totalReservas,
      'Monto Total (Bs.)': c.montoTotal,
      'Registro': this.formatFecha(c.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    ws['!cols'] = [
      { wch: 5 },  { wch: 30 }, { wch: 15 }, { wch: 28 },
      { wch: 15 }, { wch: 30 }, { wch: 8 },  { wch: 10 },
      { wch: 18 }, { wch: 12 },
    ];
    XLSX.writeFile(wb, `solo_clientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // ─── PDF: Lista de clientes ───────────────────────────────────────────────
  async exportarListaClientesPdf(): Promise<void> {
    const [res, logoBase64] = await Promise.all([
      firstValueFrom(this.http.get<ReporteClientesResponse>(`${this.baseUrl}`)),
      this.getLogoBase64(),
    ]);

    const filas: ContentText[][] = res.data.map((c, i) => [
      { text: String(i + 1),      style: 'celda',       alignment: 'center' } as ContentText,
      { text: c.fullName,         style: 'celdaNegrita'                      } as ContentText,
      { text: c.direccion ?? '-', style: 'celda'                             } as ContentText,
      { text: c.ci,               style: 'celda',       alignment: 'center' } as ContentText,
      { text: c.telefono,         style: 'celda',       alignment: 'center' } as ContentText,
    ]);

    const docDef: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [35, 35, 35, 40],
      footer: (currentPage, pageCount) => ({
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: 'center',
        style: 'footer',
        margin: [0, 8, 0, 0],
      }),
      content: [
        this.buildEncabezadoEmpresa(logoBase64),
        {
          canvas: [{
            type: 'line',
            x1: 0, y1: 0, x2: 525, y2: 0,
            lineWidth: 0.5,
            lineColor: '#cccccc',
          }],
          margin: [0, 0, 0, 10],
        },
        {
          text: 'REPORTE DE CLIENTES Y/O PROSPECTOS',
          style: 'tituloReporte',
          margin: [0, 0, 0, 12],
        } as ContentText,
        {
          table: {
            headerRows: 1,
            widths: [25, 120, '*', 65, 70],
            body: [
              [
                { text: 'Nº',        style: 'th', alignment: 'center' } as ContentText,
                { text: 'CLIENTE',   style: 'th', alignment: 'center' } as ContentText,
                { text: 'DIRECCIÓN', style: 'th', alignment: 'center' } as ContentText,
                { text: 'CI/NIT',    style: 'th', alignment: 'center' } as ContentText,
                { text: 'TELÉFONO', style: 'th', alignment: 'center' } as ContentText,
              ] as ContentText[],
              ...filas,
            ] as ContentText[][],
          },
          layout: {
            fillColor: (rowIndex: number) => (rowIndex === 0 ? '#000000' : null),
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#999999',
            vLineColor: () => '#999999',
          },
        } as Content,
        {
          text: `Total de clientes mostrados: ${res.totalClientes}`,
          style: 'totalPie',
          margin: [0, 10, 0, 0],
        } as ContentText,
      ],
      styles: {
        nombreEmpresa: {
          fontSize: 16,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 2],
        },
        datosEmpresa: {
          fontSize: 8,
          alignment: 'center',
          color: '#444444',
          margin: [0, 1, 0, 1],
        },
        tituloReporte: {
          fontSize: 11,
          bold: true,
          italics: true,
          alignment: 'center',
        },
        th: {
          fontSize: 8,
          bold: true,
          color: '#ffffff',
          margin: [4, 5, 4, 5],
        },
        celda: {
          fontSize: 7.5,
          color: '#222222',
          margin: [4, 4, 4, 4],
        },
        celdaNegrita: {
          fontSize: 7.5,
          bold: true,
          color: '#222222',
          margin: [4, 4, 4, 4],
        },
        totalPie: {
          fontSize: 9,
          bold: true,
          color: '#333333',
        },
        footer: {
          fontSize: 8,
          color: '#9ca3af',
        },
      },
    };

    pdfMake.createPdf(docDef).download(
      `lista_clientes_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  }

  // ─── PDF: Clientes potenciales ────────────────────────────────────────────
  async exportarClientesPotencialesPdf(): Promise<void> {
    const [res, logoBase64] = await Promise.all([
      firstValueFrom(
        this.http.get<ReporteClientesPotencialesResponse>(`${this.baseUrl}/potenciales`)
      ),
      this.getLogoBase64(),
    ]);

    const filas: ContentText[][] = res.data.map((c, i) => [
      { text: String(i + 1),                            style: 'celda',      alignment: 'center' } as ContentText,
      { text: c.fullName,                               style: 'celdaNegrita'                    } as ContentText,
      { text: c.direccion ?? '-',                       style: 'celda'                           } as ContentText,
      { text: c.ci,                                     style: 'celda',      alignment: 'center' } as ContentText,
      { text: c.telefono,                               style: 'celda',      alignment: 'center' } as ContentText,
      { text: `${this.formatMonto(c.montoTotal)} Bs.`,  style: 'celdaMonto', alignment: 'right'  } as ContentText,
    ]);

    const docDef: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [35, 35, 35, 40],
      footer: (currentPage, pageCount) => ({
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: 'center',
        style: 'footer',
        margin: [0, 8, 0, 0],
      }),
      content: [
        this.buildEncabezadoEmpresa(logoBase64),
        {
          canvas: [{
            type: 'line',
            x1: 0, y1: 0, x2: 525, y2: 0,
            lineWidth: 0.5,
            lineColor: '#cccccc',
          }],
          margin: [0, 0, 0, 10],
        },
        {
          text: 'REPORTE DE CLIENTES POTENCIALES',
          style: 'tituloReporte',
          margin: [0, 0, 0, 12],
        } as ContentText,
        {
          table: {
            headerRows: 1,
            widths: [25, 110, '*', 60, 65, 75],
            body: [
              [
                { text: 'Nº',           style: 'th', alignment: 'center' } as ContentText,
                { text: 'CLIENTE',      style: 'th', alignment: 'center' } as ContentText,
                { text: 'DIRECCIÓN',    style: 'th', alignment: 'center' } as ContentText,
                { text: 'CI/NIT',       style: 'th', alignment: 'center' } as ContentText,
                { text: 'TELÉFONO',    style: 'th', alignment: 'center' } as ContentText,
                { text: 'MONTO TOTAL', style: 'th', alignment: 'center' } as ContentText,
              ] as ContentText[],
              ...filas,
            ] as ContentText[][],
          },
          layout: {
            fillColor: (rowIndex: number) => (rowIndex === 0 ? '#000000' : null),
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#999999',
            vLineColor: () => '#999999',
          },
        } as Content,
        {
          columns: [
            {
              text: `Total de clientes mostrados: ${res.totalMostrados}`,
              style: 'totalPie',
            } as ContentText,
            {
              text: `Total general: BS ${this.formatMonto(res.totalGeneralBs)}`,
              style: 'totalPie',
              alignment: 'right',
            } as ContentText,
          ],
          margin: [0, 10, 0, 4],
        } as Content,
        {
          text: res.nota,
          style: 'nota',
          margin: [0, 4, 0, 0],
        } as ContentText,
      ],
      styles: {
        nombreEmpresa: {
          fontSize: 16,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 2],
        },
        datosEmpresa: {
          fontSize: 8,
          alignment: 'center',
          color: '#444444',
          margin: [0, 1, 0, 1],
        },
        tituloReporte: {
          fontSize: 11,
          bold: true,
          italics: true,
          alignment: 'center',
        },
        th: {
          fontSize: 8,
          bold: true,
          color: '#ffffff',
          margin: [4, 5, 4, 5],
        },
        celda: {
          fontSize: 7.5,
          color: '#222222',
          margin: [4, 4, 4, 4],
        },
        celdaNegrita: {
          fontSize: 7.5,
          bold: true,
          color: '#222222',
          margin: [4, 4, 4, 4],
        },
        celdaMonto: {
          fontSize: 7.5,
          bold: true,
          color: '#065f46',
          margin: [4, 4, 4, 4],
        },
        totalPie: {
          fontSize: 9,
          bold: true,
          color: '#333333',
        },
        nota: {
          fontSize: 7,
          italics: true,
          color: '#9ca3af',
        },
        footer: {
          fontSize: 8,
          color: '#9ca3af',
        },
      },
    };

    pdfMake.createPdf(docDef).download(
      `clientes_potenciales_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  }
}