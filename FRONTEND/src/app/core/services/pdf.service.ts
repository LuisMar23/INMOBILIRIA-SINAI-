import { Injectable } from '@angular/core';
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

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  constructor() {}

  private primaryColor = '#059669';
  private primaryLight = '#10B981';
  private primaryDark = '#047857';
  private accentColor = '#34D399';
  private lightBg = '#ECFDF5';
  private headerBg = '#059669';
  private headerTextColor = '#FFFFFF';
  private successColor = '#10B981';
  private warningColor = '#F59E0B';
  private errorColor = '#EF4444';
  private textColor = '#1F2937';
  private borderColor = '#D1FAE5';

  generarPdfClientes(clientes: any[]): void {
    try {
      if (!clientes || clientes.length === 0) {
        return;
      }
      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaGeneracion = new Date().toLocaleDateString('es-BO');
      const tableBody: any[] = [];

      tableBody.push([
        { text: 'N°', style: 'tableHeader', alignment: 'center' },
        { text: 'CLIENTE', style: 'tableHeader', alignment: 'left' },
        { text: 'DOCUMENTO', style: 'tableHeader', alignment: 'center' },
        { text: 'TELÉFONO', style: 'tableHeader', alignment: 'center' },
        { text: 'TOTAL DEUDA', style: 'tableHeader', alignment: 'center' },
        { text: 'TOTAL PAGADO', style: 'tableHeader', alignment: 'center' },
        { text: 'SALDO', style: 'tableHeader', alignment: 'center' },
        { text: 'AVANCE', style: 'tableHeader', alignment: 'center' },
      ]);

      clientes.forEach((cliente, index) => {
        const infoPlanPago = this.obtenerInfoPlanPagoCliente(cliente);
        tableBody.push([
          { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
          { text: cliente.fullName || 'N/A', style: 'tableCellBold' },
          { text: cliente.ci || 'N/A', style: 'tableCell', alignment: 'center' },
          { text: cliente.telefono || 'N/A', style: 'tableCell', alignment: 'center' },
          {
            text: infoPlanPago.tienePlan
              ? this.formatCurrency(infoPlanPago.totalDeuda)
              : 'SIN DEUDA',
            style: infoPlanPago.tienePlan ? 'tableCellBold' : 'tableCell',
            alignment: 'center',
          },
          {
            text: infoPlanPago.tienePlan ? this.formatCurrency(infoPlanPago.totalPagado) : 'N/A',
            style: 'tableCell',
            alignment: 'center',
          },
          {
            text: infoPlanPago.tienePlan ? this.formatCurrency(infoPlanPago.saldoPendiente) : 'N/A',
            style: infoPlanPago.saldoPendiente > 0 ? 'deudaWarning' : 'tableCell',
            alignment: 'center',
          },
          {
            text: infoPlanPago.tienePlan ? `${infoPlanPago.porcentajePagado}%` : 'N/A',
            style: infoPlanPago.tienePlan ? 'tableCellBold' : 'tableCell',
            alignment: 'center',
          },
        ]);
      });

      const totalClientes = clientes.length;
      const clientesConPlan = clientes.filter(
        (cliente) => this.obtenerInfoPlanPagoCliente(cliente).tienePlan
      ).length;

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 150, 20, 60],
        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595.28,
                  h: 120,
                  color: this.headerBg,
                },
              ],
            },
            {
              stack: [
                {
                  text: 'GESTIÓN INMOBILIARIA',
                  style: 'companyName',
                  margin: [0, 15, 0, 0],
                },
                {
                  text: 'REPORTE DE CLIENTES',
                  style: 'mainHeader',
                  margin: [0, 10, 0, 0],
                },
                {
                  text: `Estado de Pagos y Finanzas`,
                  style: 'headerSubtitle',
                  margin: [0, 5, 0, 0],
                },
                {
                  text: `Generado el ${fechaHora}`,
                  style: 'headerDate',
                  margin: [0, 10, 0, 0],
                },
              ],
              alignment: 'center',
              margin: [20, -110, 20, 0],
            },
          ],
        },
        footer: (currentPage: number, pageCount: number) => {
          return {
            stack: [
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 595.28,
                    h: 40,
                    color: this.lightBg,
                  },
                ],
              },
              {
                columns: [
                  {
                    text: 'Sistema de Gestión Inmobiliaria - Todos los derechos reservados',
                    style: 'footer',
                    alignment: 'left',
                    margin: [20, -30, 0, 0],
                  },
                  {
                    text: `Página ${currentPage} de ${pageCount}`,
                    style: 'footer',
                    alignment: 'right',
                    margin: [0, -30, 20, 0],
                  },
                ],
              },
            ],
          };
        },
        content: [
          {
            columns: [
              {
                width: '50%',
                stack: [
                  {
                    text: 'TOTAL CLIENTES',
                    style: 'statLabel',
                    alignment: 'center',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: totalClientes.toString(),
                    style: 'statValue',
                    alignment: 'center',
                  },
                ],
              },
              {
                width: '50%',
                stack: [
                  {
                    text: 'CON PLAN PAGO',
                    style: 'statLabel',
                    alignment: 'center',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: clientesConPlan.toString(),
                    style: 'statValue',
                    alignment: 'center',
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 20],
          },
          {
            table: {
              headerRows: 1,
              widths: ['5%', '25%', '12%', '13%', '15%', '15%', '10%', '5%'],
              body: tableBody,
            },
            layout: {
              fillColor: (rowIndex: number) => (rowIndex === 0 ? this.primaryDark : null),
              hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
              vLineWidth: () => 0.5,
              hLineColor: () => this.primaryDark,
              vLineColor: () => this.borderColor,
              paddingTop: (i: number) => (i === 0 ? 10 : 8),
              paddingBottom: (i: number) => (i === 0 ? 10 : 8),
            },
          },
        ],
        styles: {
          companyName: {
            fontSize: 12,
            bold: true,
            color: '#E5E7EB',
            alignment: 'center',
          },
          mainHeader: {
            fontSize: 20,
            bold: true,
            color: this.headerTextColor,
            alignment: 'center',
          },
          headerSubtitle: {
            fontSize: 12,
            color: '#E5E7EB',
            alignment: 'center',
          },
          headerDate: {
            fontSize: 10,
            color: '#E5E7EB',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: this.primaryDark,
            bold: true,
          },
          statLabel: {
            fontSize: 11,
            color: this.primaryColor,
            bold: true,
          },
          statValue: {
            fontSize: 16,
            color: this.primaryDark,
            bold: true,
          },
          tableHeader: {
            fontSize: 9,
            bold: true,
            color: this.headerTextColor,
          },
          tableCell: {
            fontSize: 9,
            color: this.textColor,
          },
          tableCellBold: {
            fontSize: 9,
            color: this.textColor,
            bold: true,
          },
          deudaWarning: {
            fontSize: 9,
            bold: true,
            color: this.errorColor,
          },
        },
        defaultStyle: {
          font: 'Roboto',
          color: this.textColor,
        },
      };

      const fileName = `Clientes_${fechaGeneracion.replace(/\//g, '-')}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF de clientes:', error);
    }
  }

// Reemplaza el método generarPdfClienteIndividual completo

private async getLogoBase64(path = 'assets/logoSinai.jpg'): Promise<string | null> {
  try {
    const res  = await fetch(path);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

private money(v: number | string | null | undefined): string {
  return `Bs. ${Number(v ?? 0).toLocaleString('es-BO', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
}

async generarPdfClienteIndividual(cliente: any): Promise<void> {
  console.log('Datos del cliente:', cliente);
  
  try {
    if (!cliente) return;

    const logo = await this.getLogoBase64();
    const fechaHora = new Date().toLocaleString('es-BO');
    
    // Extraer resumen financiero directamente
    const resumen = cliente.resumenFinanciero || {};
    const tienePlan = resumen.tienePlanActivo || false;
    const totalVenta = resumen.totalVentas || 0;
    const montoInicial = resumen.montoInicialTotal || 0;
    const totalCredito = resumen.totalCredito || 0;
    const totalPagado = resumen.totalPagado || 0;
    const saldoPendiente = resumen.saldoPendiente || 0;
    const porcentajePagado = resumen.porcentajePagado || 0;

    const money = (value: number) => `Bs ${value.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

    // Header
    const header: any[] = [
      {
        columns: [
          logo ? { image: logo, width: 70, margin: [0, 0, 10, 0] } : { text: '', width: 70 },
          {
            width: '*',
            stack: [
              { text: 'SINAÍ BIENES RAÍCES', fontSize: 14, bold: true, alignment: 'center' },
              { text: 'NIT: 5813305010', fontSize: 9, alignment: 'center' },
              { text: 'AV. BARRIENTOS O. ENTRE C/ V. DE CHAGUAYA Y C/ G. BUCH - BERMEJO', fontSize: 8, alignment: 'center' },
              { text: 'Teléfono: 74532320', fontSize: 9, alignment: 'center' },
            ],
          },
        ],
        margin: [0, 0, 0, 10],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#000' }], margin: [0, 0, 0, 8] },
      { text: 'INFORMACIÓN DETALLADA DEL CLIENTE', fontSize: 11, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
    ];

    // Info del cliente
    const infoCliente = {
      stack: [
        { columns: [{ text: 'Cliente:', bold: true, fontSize: 9, width: 100 }, { text: (cliente.fullName ?? 'N/A').toUpperCase(), fontSize: 9, width: '*' }], margin: [0, 0, 0, 3] },
        { columns: [{ text: 'CI:', bold: true, fontSize: 9, width: 100 }, { text: cliente.ci ?? 'No registrado', fontSize: 9, width: '*' }], margin: [0, 0, 0, 3] },
        { columns: [{ text: 'Teléfono:', bold: true, fontSize: 9, width: 100 }, { text: cliente.telefono ?? 'No registrado', fontSize: 9, width: '*' }], margin: [0, 0, 0, 3] },
        { columns: [{ text: 'Dirección:', bold: true, fontSize: 9, width: 100 }, { text: cliente.direccion ?? 'No registrada', fontSize: 9, width: '*' }], margin: [0, 0, 0, 3] },
        { columns: [{ text: 'Observaciones:', bold: true, fontSize: 9, width: 100 }, { text: cliente.observaciones ?? 'Ninguna', fontSize: 9, width: '*' }], margin: [0, 0, 0, 12] },
      ],
      margin: [0, 0, 0, 14],
    };

    // Tabla resumen financiero
    const resumenFinanciero = {
      table: {
        widths: ['*', '*'],
        body: [
          [{ text: 'Estado del Plan:', bold: true, fontSize: 9, fillColor: '#e0e0e0' }, { text: tienePlan ? 'CON PLAN DE PAGO' : 'SIN PLAN DE PAGO', fontSize: 9 }],
          [{ text: 'Total Venta:', bold: true, fontSize: 9, fillColor: '#e0e0e0' }, { text: money(totalVenta), fontSize: 9 }],
          [{ text: 'Monto Inicial:', bold: true, fontSize: 9, fillColor: '#e0e0e0' }, { text: money(montoInicial), fontSize: 9 }],
          [{ text: 'Total Crédito:', bold: true, fontSize: 9, fillColor: '#e0e0e0' }, { text: money(totalCredito), fontSize: 9 }],
          [{ text: 'Total Pagado:', bold: true, fontSize: 9, fillColor: '#e0e0e0' }, { text: money(totalPagado), fontSize: 9 }],
          [{ text: 'Saldo Pendiente:', bold: true, fontSize: 9, fillColor: '#e0e0e0' }, { text: money(saldoPendiente), fontSize: 9, bold: true }],
          [{ text: '% Pagado:', bold: true, fontSize: 9, fillColor: '#e0e0e0' }, { text: `${porcentajePagado.toFixed(1)}%`, fontSize: 9 }],
        ],
      },
      layout: {
        hLineWidth: () => 0.5, vLineWidth: () => 0.5,
        hLineColor: () => '#000', vLineColor: () => '#000',
        paddingTop: () => 4, paddingBottom: () => 4,
        paddingLeft: () => 6, paddingRight: () => 6,
      },
      margin: [0, 0, 0, 14],
    };

    // Tabla de ventas
    const ventas = cliente.ventasComoCliente || [];
const ventasBody = [];

// Header sin fillColor
ventasBody.push([
  { text: 'ID', bold: true, fontSize: 8, alignment: 'center' },
  { text: 'Fecha', bold: true, fontSize: 8, alignment: 'center' },
  { text: 'Inmueble', bold: true, fontSize: 8 },
  { text: 'Monto', bold: true, fontSize: 8, alignment: 'right' },
  { text: 'Estado', bold: true, fontSize: 8, alignment: 'center' },
]);
for (const venta of ventas) {
  let inmueble = '';
  if (venta.lote) {
    inmueble = `Lote ${venta.lote.numeroLote}`;
    if (venta.lote.manzano) inmueble += ` - Mz ${venta.lote.manzano}`;
  } else if (venta.propiedad) {
    inmueble = venta.propiedad.nombre || 'Propiedad';
  } else {
    inmueble = 'N/A';
  }

  ventasBody.push([
    { text: `#${venta.id}`, fontSize: 8, alignment: 'center' },
    { text: new Date(venta.createdAt).toLocaleDateString('es-BO'), fontSize: 8, alignment: 'center' },
    { text: inmueble, fontSize: 8 },
    { text: money(Number(venta.precioFinal)), fontSize: 8, alignment: 'right' },
    { text: venta.estado, fontSize: 8, alignment: 'center', color: venta.estado === 'PAGADO' ? '#16a34a' : '#eab308' },
  ]);
}

const detalleVentas = ventas.length === 0 
  ? [{ text: 'No hay ventas registradas para este cliente', fontSize: 9, alignment: 'center', margin: [0, 10, 0, 10] }]
  : [{ 
      table: { 
        widths: [30, '*', '*', '*', '*'], 
        body: ventasBody 
      }, 
      layout: 'lightHorizontalLines', // Layout más simple que no necesita fillColor
      margin: [0, 0, 0, 10] 
    }];

    // Documento final
    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 50],
      content: [
        ...header,
        infoCliente,
        { text: 'RESUMEN FINANCIERO', fontSize: 10, bold: true, italics: true, alignment: 'center', margin: [0, 0, 0, 6] },
        resumenFinanciero,
        { text: 'DETALLE DE VENTAS', fontSize: 10, bold: true, italics: true, alignment: 'center', margin: [0, 0, 0, 6] },
        ...detalleVentas,
      ],
      footer: (page: number, pages: number) => ({
        columns: [
          { text: `SINAÍ BIENES RAÍCES — Cliente #${cliente.id}`, fontSize: 7, color: '#666', margin: [40, 10, 0, 0] },
          { text: `Generado: ${fechaHora}   |   Página ${page} de ${pages}`, fontSize: 7, color: '#666', alignment: 'right', margin: [0, 10, 40, 0] },
        ],
      }),
      defaultStyle: { font: 'Roboto', color: '#000000' },
    };

    const fecha = new Date().toISOString().split('T')[0];
    pdfMake.createPdf(docDefinition).download(`Cliente_${cliente.id}_${fecha}.pdf`);

  } catch (error) {
    console.error('Error generando PDF individual de cliente:', error);
  }
}

  generarPdfReservas(reservas: any[]): void {
    try {
      if (!reservas || reservas.length === 0) {
        return;
      }
      const fechaHora = new Date().toLocaleString('es-BO');
      const fechaGeneracion = new Date().toLocaleDateString('es-BO');
      
      // Calcular estadísticas
      const reservasActivas = reservas.filter(r => r.estado === 'ACTIVA').length;
      const reservasVencidas = reservas.filter(r => r.estado === 'VENCIDA').length;
      const reservasCanceladas = reservas.filter(r => r.estado === 'CANCELADA').length;
      
      const tableBody: any[] = [];

      tableBody.push([
        { text: 'N°', style: 'tableHeader', alignment: 'center' },
        { text: 'RESERVA', style: 'tableHeader', alignment: 'center' },
        { text: 'CLIENTE', style: 'tableHeader', alignment: 'left' },
        { text: 'LOTE', style: 'tableHeader', alignment: 'left' },
        { text: 'FECHA INICIO', style: 'tableHeader', alignment: 'center' },
        { text: 'FECHA VENCE', style: 'tableHeader', alignment: 'center' },
        { text: 'ASESOR', style: 'tableHeader', alignment: 'left' },
        { text: 'ESTADO', style: 'tableHeader', alignment: 'center' },
      ]);

      reservas.forEach((reserva, index) => {
        const clienteNombre = reserva.cliente?.fullName || 'N/A';
        const asesorNombre = reserva.asesor?.fullName || 'N/A';
        const loteInfo = reserva.lote ? 
          ` ${reserva.lote.numeroLote}${reserva.lote.urbanizacion?.nombre ? ` - ${reserva.lote.urbanizacion.nombre}` : ''}` : 
          'N/A';

        tableBody.push([
          { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
          { text: `#${reserva.id}`, style: 'tableCellBold', alignment: 'center' },
          { text: clienteNombre, style: 'tableCell' },
          { text: loteInfo, style: 'tableCell' },
          { text: this.formatFecha(reserva.fechaInicio), style: 'tableCell', alignment: 'center' },
          { text: this.formatFecha(reserva.fechaVencimiento), style: 'tableCell', alignment: 'center' },
          { text: asesorNombre, style: 'tableCell' },
          {
            text: reserva.estado || 'N/A',
            style: this.getEstadoReservaStyle(reserva.estado),
            alignment: 'center',
          },
        ]);
      });

      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 150, 20, 60],
        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595.28,
                  h: 120,
                  color: this.headerBg,
                },
              ],
            },
            {
              stack: [
                {
                  text: 'GESTIÓN INMOBILIARIA SINAÍ',
                  style: 'companyName',
                  margin: [0, 15, 0, 0],
                },
                {
                  text: 'REPORTE DE RESERVAS',
                  style: 'mainHeader',
                  margin: [0, 10, 0, 0],
                },
                {
                  text: `Control de Reservas de Inmuebles`,
                  style: 'headerSubtitle',
                  margin: [0, 5, 0, 0],
                },
                {
                  text: `Generado el ${fechaHora}`,
                  style: 'headerDate',
                  margin: [0, 10, 0, 0],
                },
              ],
              alignment: 'center',
              margin: [20, -110, 20, 0],
            },
          ],
        },
        footer: (currentPage: number, pageCount: number) => {
          return {
            stack: [
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 595.28,
                    h: 40,
                    color: this.lightBg,
                  },
                ],
              },
              {
                columns: [
                  {
                    text: 'Sistema de Gestión Inmobiliaria - Todos los derechos reservados',
                    style: 'footer',
                    alignment: 'left',
                    margin: [20, -30, 0, 0],
                  },
                  {
                    text: `Página ${currentPage} de ${pageCount}`,
                    style: 'footer',
                    alignment: 'right',
                    margin: [0, -30, 20, 0],
                  },
                ],
              },
            ],
          };
        },
        content: [
          {
            columns: [
              {
                width: '33%',
                stack: [
                  {
                    text: 'TOTAL RESERVAS',
                    style: 'statLabel',
                    alignment: 'center',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: reservas.length.toString(),
                    style: 'statValue',
                    alignment: 'center',
                  },
                ],
              },
              {
                width: '33%',
                stack: [
                  {
                    text: 'ACTIVAS',
                    style: 'statLabel',
                    alignment: 'center',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: reservasActivas.toString(),
                    style: 'statValue',
                    alignment: 'center',
                    color: this.successColor,
                  },
                ],
              },
              {
                width: '33%',
                stack: [
                  {
                    text: 'VENCIDAS',
                    style: 'statLabel',
                    alignment: 'center',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: reservasVencidas.toString(),
                    style: 'statValue',
                    alignment: 'center',
                    color: this.errorColor,
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 20],
          },
          {
            table: {
              headerRows: 1,
              widths: ['4%', '6%', '18%', '18%', '12%', '12%', '18%', '12%'],
              body: tableBody,
            },
            layout: {
              fillColor: (rowIndex: number) => (rowIndex === 0 ? this.primaryDark : null),
              hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
              vLineWidth: () => 0.5,
              hLineColor: () => this.primaryDark,
              vLineColor: () => this.borderColor,
              paddingTop: (i: number) => (i === 0 ? 10 : 8),
              paddingBottom: (i: number) => (i === 0 ? 10 : 8),
            },
          },
        ],
        styles: {
          companyName: {
            fontSize: 12,
            bold: true,
            color: '#E5E7EB',
            alignment: 'center',
          },
          mainHeader: {
            fontSize: 20,
            bold: true,
            color: this.headerTextColor,
            alignment: 'center',
          },
          headerSubtitle: {
            fontSize: 12,
            color: '#E5E7EB',
            alignment: 'center',
          },
          headerDate: {
            fontSize: 10,
            color: '#E5E7EB',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: this.primaryDark,
            bold: true,
          },
          statLabel: {
            fontSize: 11,
            color: this.primaryColor,
            bold: true,
          },
          statValue: {
            fontSize: 16,
            bold: true,
          },
          tableHeader: {
            fontSize: 9,
            bold: true,
            color: this.headerTextColor,
          },
          tableCell: {
            fontSize: 9,
            color: this.textColor,
          },
          tableCellBold: {
            fontSize: 9,
            color: this.textColor,
            bold: true,
          },
        },
        defaultStyle: {
          font: 'Roboto',
          color: this.textColor,
        },
      };

      const fileName = `Reservas_${fechaGeneracion.replace(/\//g, '-')}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF de reservas:', error);
    }
  }

  generarPdfReservaIndividual(reserva: any): void {
    try {
      if (!reserva) {
        return;
      }
      const fechaHora = new Date().toLocaleString('es-BO');

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 160, 40, 60],
        header: {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 595.28,
                  h: 130,
                  color: this.headerBg,
                },
              ],
            },
            {
              stack: [
                {
                  text: 'GESTIÓN INMOBILIARIA SINAÍ',
                  style: 'companyName',
                  margin: [0, 15, 0, 0],
                },
                {
                  text: 'COMPROBANTE DE RESERVA',
                  style: 'mainHeader',
                  margin: [0, 10, 0, 0],
                },
                {
                  text: `Reserva #${reserva.id}`,
                  style: 'headerSubtitle',
                  margin: [0, 5, 0, 0],
                },
                {
                  text: `Generado el ${fechaHora}`,
                  style: 'headerDate',
                  margin: [0, 10, 0, 0],
                },
              ],
              alignment: 'center',
              margin: [40, -120, 40, 0],
            },
          ],
        },
        footer: (currentPage: number, pageCount: number) => {
          return {
            stack: [
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 595.28,
                    h: 40,
                    color: this.lightBg,
                  },
                ],
              },
              {
                columns: [
                  {
                    text: `Generado: ${fechaHora}`,
                    style: 'footer',
                    alignment: 'left',
                    margin: [40, -30, 0, 0],
                  },
                  {
                    text: `Página ${currentPage} de ${pageCount}`,
                    style: 'footer',
                    alignment: 'right',
                    margin: [0, -30, 40, 0],
                  },
                ],
              },
            ],
          };
        },
        content: [
          {
            columns: [
              {
                width: '50%',
                stack: [
                  {
                    text: 'INFORMACIÓN GENERAL',
                    style: 'sectionTitle',
                    background: this.lightBg,
                    margin: [0, 0, 0, 10],
                  },
                  {
                    table: {
                      widths: ['35%', '65%'],
                      body: [
                        [
                          { text: 'Estado:', style: 'labelCell' },
                          {
                            text: reserva.estado || 'N/A',
                            style: this.getEstadoReservaStyle(reserva.estado),
                          },
                        ],
                        [
                          { text: 'Fecha Inicio:', style: 'labelCell' },
                          { text: this.formatFecha(reserva.fechaInicio), style: 'valueCell' },
                        ],
                        [
                          { text: 'Fecha Vence:', style: 'labelCell' },
                          { text: this.formatFecha(reserva.fechaVencimiento), style: 'valueCell' },
                        ],
                      ],
                    },
                    layout: 'noBorders',
                  },
                ],
              },
              {
                width: '50%',
                stack: [
                  {
                    text: 'CLIENTE',
                    style: 'sectionTitle',
                    background: this.lightBg,
                    margin: [0, 0, 0, 10],
                  },
                  {
                    table: {
                      widths: ['100%'],
                      body: [
                        [
                          {
                            stack: [
                              { text: reserva.cliente?.fullName || 'N/A', style: 'clientName' },
                              {
                                text: `CI: ${reserva.cliente?.ci || 'N/A'}`,
                                style: 'clientDetail',
                              },
                              {
                                text: `Tel: ${reserva.cliente?.telefono || 'N/A'}`,
                                style: 'clientDetail',
                              },
                            ],
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineWidth: () => 2,
                      vLineWidth: () => 2,
                      hLineColor: () => this.headerBg,
                      vLineColor: () => this.headerBg,
                      paddingTop: () => 10,
                      paddingBottom: () => 10,
                      paddingLeft: () => 10,
                      paddingRight: () => 10,
                    },
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 25],
          },
          {
            text: 'ASESOR RESPONSABLE',
            style: 'sectionTitle',
            background: this.lightBg,
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              widths: ['100%'],
              body: [
                [
                  {
                    stack: [
                      { text: reserva.asesor?.fullName || 'N/A', style: 'clientName' },
                      {
                        text: `Email: ${reserva.asesor?.email || 'N/A'}`,
                        style: 'clientDetail',
                      },
                      {
                        text: `Tel: ${reserva.asesor?.telefono || 'N/A'}`,
                        style: 'clientDetail',
                      },
                    ],
                  },
                ],
              ],
            },
            layout: {
              fillColor: this.lightBg,
              hLineWidth: () => 0,
              vLineWidth: () => 0,
              paddingTop: () => 10,
              paddingBottom: () => 10,
              paddingLeft: () => 10,
              paddingRight: () => 10,
            },
            margin: [0, 0, 0, 25],
          },
          {
            text: 'DETALLE DEL LOTE',
            style: 'sectionTitle',
            background: this.lightBg,
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              widths: ['25%', '25%', '25%', '25%'],
              body: [
                [
                  { text: 'Lote', style: 'labelCell', fillColor: this.lightBg },
                  { text: 'Superficie', style: 'labelCell', fillColor: this.lightBg },
                  { text: 'Urbanización', style: 'labelCell', fillColor: this.lightBg },
                  { text: 'Precio Base', style: 'labelCell', fillColor: this.lightBg },
                ],
                [
                  { text: reserva.lote?.numeroLote || 'N/A', style: 'valueCell' },
                  { text: `${reserva.lote?.superficieM2 || 'N/A'} m²`, style: 'valueCell' },
                  { text: reserva.lote?.urbanizacion?.nombre || 'Independiente', style: 'valueCell' },
                  { text: this.formatCurrency(reserva.lote?.precioBase || 0), style: 'valueCell' },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => this.borderColor,
              vLineColor: () => this.borderColor,
            },
          },
          {
            text: '\nNota: Esta reserva tiene una vigencia de 24 horas desde su fecha de inicio.',
            style: 'footer',
            margin: [0, 20, 0, 0],
          },
        ],
        styles: {
          companyName: {
            fontSize: 12,
            bold: true,
            color: '#E5E7EB',
            alignment: 'center',
          },
          mainHeader: {
            fontSize: 18,
            bold: true,
            color: this.headerTextColor,
            alignment: 'center',
          },
          headerSubtitle: {
            fontSize: 14,
            color: '#E5E7EB',
            alignment: 'center',
          },
          headerDate: {
            fontSize: 10,
            color: '#E5E7EB',
            alignment: 'center',
          },
          footer: {
            fontSize: 8,
            color: this.primaryDark,
            bold: true,
          },
          sectionTitle: {
            fontSize: 14,
            bold: true,
            color: this.primaryDark,
            padding: [10, 5, 10, 5],
          },
          labelCell: {
            fontSize: 10,
            bold: true,
            color: this.textColor,
          },
          valueCell: {
            fontSize: 10,
            color: this.textColor,
          },
          clientName: {
            fontSize: 12,
            bold: true,
            color: this.primaryDark,
          },
          clientDetail: {
            fontSize: 10,
            color: this.textColor,
          },
        },
        defaultStyle: {
          font: 'Roboto',
          color: this.textColor,
        },
      };

      const fileName = `Reserva_${reserva.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error('Error generando PDF individual de reserva:', error);
    }
  }

generarPdfVentas(ventas: any[]): void {
  try {
    if (!ventas || ventas.length === 0) {
      return;
    }
    
    const fechaHora = new Date().toLocaleString('es-BO');
    const fechaGeneracion = new Date().toLocaleDateString('es-BO');
    const tableBody: any[] = [];

    let totalGeneral = 0;
    let totalPagadoGeneral = 0;
    let totalSaldoGeneral = 0;

    tableBody.push([
      { text: 'N°', style: 'tableHeader', alignment: 'center' },
      { text: 'ID', style: 'tableHeader', alignment: 'center' },
      { text: 'CLIENTE', style: 'tableHeader', alignment: 'left' },
      { text: 'TIPO', style: 'tableHeader', alignment: 'center' },
      { text: 'INMUEBLE', style: 'tableHeader', alignment: 'left' },
      { text: 'FECHA', style: 'tableHeader', alignment: 'center' },
      { text: 'TOTAL', style: 'tableHeader', alignment: 'right' },
      { text: 'PAGADO', style: 'tableHeader', alignment: 'right' },
      { text: 'SALDO', style: 'tableHeader', alignment: 'right' },
      { text: 'AVANCE', style: 'tableHeader', alignment: 'center' },
    ]);

    ventas.forEach((venta: any, index: number) => {
      const planPago = venta.planPago || venta.plan_pago;
      const totalPagado = planPago
        ? Number(planPago.total_pagado || planPago.monto_pagado || 0)
        : 0;
      const totalVenta = Number(venta.precioFinal || venta.total || 0);
      const saldoPendiente = totalVenta - totalPagado;
      const porcentajePagado = totalVenta > 0 ? (totalPagado / totalVenta) * 100 : 0;
      const fechaVenta = venta.fecha_venta || (planPago ? planPago.fecha_inicio : venta.createdAt);

      totalGeneral += totalVenta;
      totalPagadoGeneral += totalPagado;
      totalSaldoGeneral += saldoPendiente;

      let inmuebleInfo = 'N/A';
      let tipoCorto = 'N/A';
      
      if (venta.inmuebleTipo === 'LOTE' && venta.lote) {
        inmuebleInfo = `Lote ${venta.lote.numeroLote}`;
        if (venta.lote.urbanizacion?.nombre) {
          inmuebleInfo += ` - ${venta.lote.urbanizacion.nombre}`;
        }
        tipoCorto = 'LOTE';
      } else if (venta.inmuebleTipo === 'PROPIEDAD' && venta.propiedad) {
        inmuebleInfo = venta.propiedad.nombre;
        if (venta.propiedad.tipo) {
          inmuebleInfo += ` (${venta.propiedad.tipo})`;
        }
        tipoCorto = 'PROP';
      }

      let saldoColor = '#1F2937';
      if (porcentajePagado === 100) {
        saldoColor = '#059669';
      } else if (porcentajePagado < 30) {
        saldoColor = '#DC2626';
      }

      tableBody.push([
        { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
        { text: `#${venta.id}`, style: 'tableCellMedium', alignment: 'center' },
        { text: venta.cliente?.fullName || 'N/A', style: 'tableCell' },
        { text: tipoCorto, style: 'tableCell', alignment: 'center' },
        { text: inmuebleInfo, style: 'tableCell', fontSize: 6 },
        { text: this.formatFecha(fechaVenta), style: 'tableCell', alignment: 'center' },
        { text: this.formatCurrency(totalVenta), style: 'tableCellBold', alignment: 'right' },
        { text: this.formatCurrency(totalPagado), style: 'tableCell', alignment: 'right' },
        { 
          text: this.formatCurrency(saldoPendiente), 
          style: 'tableCell', 
          alignment: 'right',
          color: saldoColor 
        },
        { 
          text: `${porcentajePagado.toFixed(0)}%`, 
          style: 'tableCell', 
          alignment: 'center',
          bold: porcentajePagado === 100
        },
      ]);
    });

    tableBody.push([
      { text: '', border: [false, true, false, false] },
      { text: '', border: [false, true, false, false] },
      { text: '', border: [false, true, false, false] },
      { text: '', border: [false, true, false, false] },
      { text: '', border: [false, true, false, false] },
      { text: 'TOTALES:', style: 'totalLabel', alignment: 'right', border: [false, true, false, false] },
      { text: this.formatCurrency(totalGeneral), style: 'totalValue', alignment: 'right', border: [false, true, false, false] },
      { text: this.formatCurrency(totalPagadoGeneral), style: 'totalValue', alignment: 'right', border: [false, true, false, false] },
      { text: this.formatCurrency(totalSaldoGeneral), style: 'totalValue', alignment: 'right', border: [false, true, false, false] },
      { text: '', border: [false, true, false, false] },
    ]);

    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [30, 100, 30, 50],
      
      header: {
        margin: [30, 20, 30, 0],
        columns: [
          {
            stack: [
              {
                text: 'GESTIÓN INMOBILIARIA SINAÍ',
                style: 'companyName',
              },
              {
                text: 'NIT: 123456789',
                style: 'companyInfo',
                margin: [0, 2, 0, 0],
              },
            ],
            width: '60%',
          },
          {
            stack: [
              {
                text: 'REPORTE DE VENTAS',
                style: 'reportTitle',
                alignment: 'right',
              },
              {
                text: `Fecha: ${fechaGeneracion}`,
                style: 'reportDate',
                alignment: 'right',
                margin: [0, 2, 0, 0],
              },
              {
                text: `Generado: ${fechaHora}`,
                style: 'reportDate',
                alignment: 'right',
                margin: [0, 1, 0, 0],
              },
            ],
            width: '40%',
          },
        ],
      },

      footer: (currentPage: number, pageCount: number) => {
        return {
          margin: [30, 0, 30, 20],
          columns: [
            {
              text: '© 2025 Gestión Inmobiliaria Sinaí. Todos los derechos reservados.',
              style: 'footer',
              alignment: 'left',
            },
            {
              text: `Página ${currentPage} de ${pageCount}`,
              style: 'footer',
              alignment: 'right',
            },
          ],
        };
      },

      content: [
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 781.89 - 60,
              y2: 0,
              lineWidth: 1,
              lineColor: '#E5E7EB',
            },
          ],
          margin: [0, 0, 0, 15],
        },

        {
          columns: [
            {
              width: '25%',
              stack: [
                { text: 'TOTAL VENTAS', style: 'summaryLabel' },
                { text: ventas.length.toString(), style: 'summaryValue' },
              ],
            },
            {
              width: '25%',
              stack: [
                { text: 'MONTO TOTAL', style: 'summaryLabel' },
                { text: this.formatCurrency(totalGeneral), style: 'summaryValue' },
              ],
            },
            {
              width: '25%',
              stack: [
                { text: 'TOTAL PAGADO', style: 'summaryLabel' },
                { text: this.formatCurrency(totalPagadoGeneral), style: 'summaryValue', color: '#059669' },
              ],
            },
            {
              width: '25%',
              stack: [
                { text: 'SALDO PENDIENTE', style: 'summaryLabel' },
                { text: this.formatCurrency(totalSaldoGeneral), style: 'summaryValue', color: totalSaldoGeneral > 0 ? '#DC2626' : '#059669' },
              ],
            },
          ],
          margin: [0, 0, 0, 20],
        },

        {
          table: {
            headerRows: 1,
            widths: ['3%', '5%', '18%', '5%', '17%', '9%', '11%', '11%', '11%', '6%'],
            body: tableBody,
          },
          layout: {
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return '#F9FAFB';
              if (rowIndex === tableBody.length - 1) return '#F3F4F6';
              return rowIndex % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
            },
            hLineWidth: (i: number, node: any) => {
              if (i === 0 || i === 1) return 1.5;
              if (i === node.table.body.length - 1) return 1.5;
              if (i === node.table.body.length) return 1.5;
              return 0.5;
            },
            vLineWidth: () => 0,
            hLineColor: (i: number, node: any) => {
              if (i === 0 || i === 1 || i === node.table.body.length - 1 || i === node.table.body.length) {
                return '#9CA3AF';
              }
              return '#E5E7EB';
            },
            paddingTop: () => 6,
            paddingBottom: () => 6,
            paddingLeft: () => 8,
            paddingRight: () => 8,
          },
        },
      ],

      styles: {
        companyName: {
          fontSize: 14,
          bold: true,
          color: '#1F2937',
        },
        companyInfo: {
          fontSize: 8,
          color: '#6B7280',
        },
        reportTitle: {
          fontSize: 16,
          bold: true,
          color: '#1F2937',
        },
        reportDate: {
          fontSize: 8,
          color: '#6B7280',
        },
        summaryLabel: {
          fontSize: 7,
          color: '#6B7280',
          bold: true,
          margin: [0, 0, 0, 3],
        },
        summaryValue: {
          fontSize: 12,
          bold: true,
          color: '#1F2937',
        },
        tableHeader: {
          fontSize: 7,
          bold: true,
          color: '#374151',
        },
        tableCell: {
          fontSize: 7,
          color: '#1F2937',
        },
        tableCellMedium: {
          fontSize: 7,
          color: '#1F2937',
          bold: true,
        },
        tableCellBold: {
          fontSize: 7,
          color: '#1F2937',
          bold: true,
        },
        totalLabel: {
          fontSize: 8,
          bold: true,
          color: '#374151',
        },
        totalValue: {
          fontSize: 8,
          bold: true,
          color: '#1F2937',
        },
        footer: {
          fontSize: 7,
          color: '#6B7280',
        },
      },

      defaultStyle: {
        font: 'Roboto',
        color: '#1F2937',
      },
    };

    const fileName = `Reporte_Ventas_${fechaGeneracion.replace(/\//g, '-')}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);
  } catch (error) {
    console.error('Error generando PDF de ventas:', error);
  }
}

 generarPdfVentaIndividual(venta: any): void {
  try {
    if (!venta) {
      return;
    }
    
    const fechaHora = new Date().toLocaleString('es-BO');
    const planPago = venta.planPago || venta.plan_pago;
    const totalPagado = planPago
      ? Number(planPago.total_pagado || planPago.monto_pagado || 0)
      : 0;
    const totalVenta = Number(venta.precioFinal || venta.total || 0);
    const saldoPendiente = totalVenta - totalPagado;
    const porcentajePagado = totalVenta > 0 ? (totalPagado / totalVenta) * 100 : 0;
    const fechaVenta = venta.fecha_venta || (planPago ? planPago.fecha_inicio : venta.createdAt);

    const detalleInmuebleTable = this.buildDetalleInmuebleTable(venta);

    const docDefinition: any = {
      pageSize: 'LETTER',
      pageOrientation: 'portrait',
      pageMargins: [40, 120, 40, 50],
      
      header: {
        margin: [40, 30, 40, 0],
        stack: [
          {
            columns: [
              {
                width: '70%',
                stack: [
                  {
                    text: 'GESTIÓN INMOBILIARIA SINAÍ',
                    style: 'companyName',
                  },
                  {
                    text: 'NIT: 123456789',
                    style: 'companyInfo',
                    margin: [0, 2, 0, 0],
                  },
                  {
                    text: 'Dirección: Av. Principal #123, Ciudad',
                    style: 'companyInfo',
                    margin: [0, 1, 0, 0],
                  },
                ],
              },
              {
                width: '30%',
                stack: [
                  {
                    text: `VENTA #${venta.id}`,
                    style: 'ventaNumber',
                    alignment: 'right',
                  },
                  {
                    text: this.formatFecha(fechaVenta),
                    style: 'ventaDate',
                    alignment: 'right',
                    margin: [0, 2, 0, 0],
                  },
                ],
              },
            ],
          },
          {
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 10,
                x2: 535,
                y2: 10,
                lineWidth: 1,
                lineColor: '#E5E7EB',
              },
            ],
            margin: [0, 10, 0, 0],
          },
        ],
      },

      footer: (currentPage: number, pageCount: number) => {
        return {
          margin: [40, 0, 40, 20],
          stack: [
            {
              canvas: [
                {
                  type: 'line',
                  x1: 0,
                  y1: 0,
                  x2: 535,
                  y2: 0,
                  lineWidth: 0.5,
                  lineColor: '#E5E7EB',
                },
              ],
            },
            {
              columns: [
                {
                  text: `Generado el ${fechaHora}`,
                  style: 'footer',
                  alignment: 'left',
                  margin: [0, 5, 0, 0],
                },
                {
                  text: `Página ${currentPage} de ${pageCount}`,
                  style: 'footer',
                  alignment: 'right',
                  margin: [0, 5, 0, 0],
                },
              ],
            },
          ],
        };
      },

      content: [
        {
          text: 'DETALLE DE VENTA',
          style: 'documentTitle',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },

        {
          columns: [
            {
              width: '50%',
              stack: [
                {
                  text: 'DATOS DEL CLIENTE',
                  style: 'sectionTitle',
                  margin: [0, 0, 0, 8],
                },
                {
                  table: {
                    widths: ['35%', '65%'],
                    body: [
                      [
                        { text: 'Nombre:', style: 'labelCell' },
                        { text: venta.cliente?.fullName || 'N/A', style: 'valueCell' },
                      ],
                      [
                        { text: 'CI:', style: 'labelCell' },
                        { text: venta.cliente?.ci || 'N/A', style: 'valueCell' },
                      ],
                      [
                        { text: 'Teléfono:', style: 'labelCell' },
                        { text: venta.cliente?.telefono || 'N/A', style: 'valueCell' },
                      ],
                      [
                        { text: 'Dirección:', style: 'labelCell' },
                        { text: venta.cliente?.direccion || 'N/A', style: 'valueCell' },
                      ],
                    ],
                  },
                  layout: {
                    fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? '#F9FAFB' : null),
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0,
                    hLineColor: () => '#E5E7EB',
                    paddingTop: () => 5,
                    paddingBottom: () => 5,
                  },
                },
              ],
            },
            {
              width: '50%',
              stack: [
                {
                  text: 'DATOS DEL ASESOR',
                  style: 'sectionTitle',
                  margin: [0, 0, 0, 8],
                },
                {
                  table: {
                    widths: ['35%', '65%'],
                    body: [
                      [
                        { text: 'Nombre:', style: 'labelCell' },
                        { text: venta.asesor?.fullName || 'N/A', style: 'valueCell' },
                      ],
                      [
                        { text: 'Email:', style: 'labelCell' },
                        { text: venta.asesor?.email || 'N/A', style: 'valueCell' },
                      ],
                      [
                        { text: 'Teléfono:', style: 'labelCell' },
                        { text: venta.asesor?.telefono || 'N/A', style: 'valueCell' },
                      ],
                    ],
                  },
                  layout: {
                    fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? '#F9FAFB' : null),
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0,
                    hLineColor: () => '#E5E7EB',
                    paddingTop: () => 5,
                    paddingBottom: () => 5,
                  },
                },
              ],
            },
          ],
          margin: [0, 0, 0, 20],
        },

        {
          text: 'INFORMACIÓN DEL INMUEBLE',
          style: 'sectionTitle',
          margin: [0, 0, 0, 8],
        },
        detalleInmuebleTable,

        {
          text: 'ESTADO DE LA VENTA',
          style: 'sectionTitle',
          margin: [0, 20, 0, 8],
        },
        {
          table: {
            widths: ['30%', '70%'],
            body: [
              [
                { text: 'Estado:', style: 'labelCell' },
                {
                  text: venta.estado?.toUpperCase() || 'N/A',
                  style: this.getEstadoVentaStyle(venta.estado),
                },
              ],
              [
                { text: 'Tipo Inmueble:', style: 'labelCell' },
                {
                  text: venta.inmuebleTipo === 'LOTE' ? 'LOTE' : 'PROPIEDAD',
                  style: 'valueCell',
                },
              ],
              [
                { text: 'Observaciones:', style: 'labelCell' },
                {
                  text: venta.observaciones || 'Sin observaciones',
                  style: 'valueCell',
                },
              ],
            ],
          },
          layout: {
            fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? '#F9FAFB' : null),
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#E5E7EB',
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
        },

        {
          text: 'RESUMEN FINANCIERO',
          style: 'sectionTitle',
          margin: [0, 20, 0, 8],
        },
        {
          table: {
            widths: ['60%', '40%'],
            body: [
              [
                { text: 'Precio Total de Venta:', style: 'financialLabel', fillColor: '#F9FAFB' },
                {
                  text: this.formatCurrency(totalVenta),
                  style: 'financialValue',
                  alignment: 'right',
                  fillColor: '#F9FAFB',
                },
              ],
              [
                { text: 'Total Pagado:', style: 'financialLabel' },
                {
                  text: this.formatCurrency(totalPagado),
                  style: 'financialSuccess',
                  alignment: 'right',
                },
              ],
              [
                { text: 'Saldo Pendiente:', style: 'financialLabel', fillColor: '#F9FAFB' },
                {
                  text: this.formatCurrency(saldoPendiente),
                  style: saldoPendiente > 0 ? 'financialWarning' : 'financialSuccess',
                  alignment: 'right',
                  fillColor: '#F9FAFB',
                },
              ],
              [
                { text: 'Porcentaje de Avance:', style: 'financialLabelBold', bold: true },
                {
                  text: `${porcentajePagado.toFixed(1)}%`,
                  style: 'financialValueBold',
                  alignment: 'right',
                  bold: true,
                },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) => {
              if (i === 0 || i === node.table.body.length) return 1.5;
              return 0.5;
            },
            vLineWidth: () => 0,
            hLineColor: (i: number, node: any) => {
              if (i === 0 || i === node.table.body.length) return '#9CA3AF';
              return '#E5E7EB';
            },
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },
        },

        {
          margin: [0, 10, 0, 0],
          canvas: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              w: 535,
              h: 20,
              color: '#F3F4F6',
              r: 4,
            },
            {
              type: 'rect',
              x: 2,
              y: 2,
              w: Math.max(0, (porcentajePagado / 100) * 531),
              h: 16,
              color: porcentajePagado === 100 ? '#059669' : porcentajePagado > 50 ? '#3B82F6' : '#F59E0B',
              r: 3,
            },
          ],
        },

        ...this.buildDetallePagos(planPago),

        {
          text: [
            { text: 'Nota: ', bold: true, fontSize: 8, color: '#6B7280' },
            {
              text: 'Este documento es un resumen detallado de la venta. Para más información contacte a su asesor.',
              fontSize: 8,
              color: '#6B7280',
            },
          ],
          margin: [0, 20, 0, 0],
        },
      ],

      styles: {
        companyName: {
          fontSize: 14,
          bold: true,
          color: '#1F2937',
        },
        companyInfo: {
          fontSize: 8,
          color: '#6B7280',
        },
        ventaNumber: {
          fontSize: 16,
          bold: true,
          color: '#1F2937',
        },
        ventaDate: {
          fontSize: 9,
          color: '#6B7280',
        },
        documentTitle: {
          fontSize: 18,
          bold: true,
          color: '#1F2937',
        },
        sectionTitle: {
          fontSize: 11,
          bold: true,
          color: '#374151',
        },
        labelCell: {
          fontSize: 9,
          color: '#6B7280',
          bold: true,
        },
        valueCell: {
          fontSize: 9,
          color: '#1F2937',
        },
        financialLabel: {
          fontSize: 10,
          color: '#374151',
        },
        financialLabelBold: {
          fontSize: 10,
          color: '#1F2937',
          bold: true,
        },
        financialValue: {
          fontSize: 10,
          color: '#1F2937',
        },
        financialValueBold: {
          fontSize: 11,
          color: '#1F2937',
          bold: true,
        },
        financialSuccess: {
          fontSize: 10,
          color: '#059669',
          bold: true,
        },
        financialWarning: {
          fontSize: 10,
          color: '#DC2626',
          bold: true,
        },
        footer: {
          fontSize: 7,
          color: '#6B7280',
        },
      },

      defaultStyle: {
        font: 'Roboto',
        color: '#1F2937',
      },
    };

    const fileName = `Venta_${venta.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);
  } catch (error) {
    console.error('Error generando PDF individual de venta:', error);
  }
}
  private buildDetalleInmuebleTable(venta: any): any {
    if (venta.inmuebleTipo === 'LOTE' && venta.lote) {
      return {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            [
              { text: 'Lote', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Superficie', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Urbanización', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Precio Base', style: 'labelCell', fillColor: this.lightBg },
            ],
            [
              { text: venta.lote?.numeroLote || 'N/A', style: 'valueCell' },
              { text: `${venta.lote?.superficieM2 || 'N/A'} m²`, style: 'valueCell' },
              { text: venta.lote?.urbanizacion?.nombre || 'N/A', style: 'valueCell' },
              { text: this.formatCurrency(venta.lote?.precioBase || 0), style: 'valueCell' },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => this.borderColor,
          vLineColor: () => this.borderColor,
        },
      };
    } else if (venta.inmuebleTipo === 'PROPIEDAD' && venta.propiedad) {
      return {
        table: {
          widths: ['20%', '20%', '20%', '20%', '20%'],
          body: [
            [
              { text: 'Nombre', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Tipo', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Tamaño', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Ciudad', style: 'labelCell', fillColor: this.lightBg },
              { text: 'Precio', style: 'labelCell', fillColor: this.lightBg },
            ],
            [
              { text: venta.propiedad?.nombre || 'N/A', style: 'valueCell' },
              { text: venta.propiedad?.tipo || 'N/A', style: 'valueCell' },
              { text: `${venta.propiedad?.tamano || 'N/A'} m²`, style: 'valueCell' },
              { text: venta.propiedad?.ciudad || 'N/A', style: 'valueCell' },
              { text: this.formatCurrency(venta.propiedad?.precio || 0), style: 'valueCell' },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => this.borderColor,
          vLineColor: () => this.borderColor,
        },
      };
    } else {
      return {
        table: {
          widths: ['100%'],
          body: [
            [
              {
                text: 'Información del inmueble no disponible',
                style: 'valueCell',
                alignment: 'center',
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => this.borderColor,
          vLineColor: () => this.borderColor,
        },
      };
    }
  }

  private obtenerInfoPlanPagoCliente(cliente: any): any {
    let totalDeuda = 0;
    let totalPagado = 0;
    let tienePlan = false;

    const ventas = cliente.ventas || (cliente.cliente ? cliente.cliente.ventas : []);
    if (ventas && Array.isArray(ventas)) {
      ventas.forEach((venta: any) => {
        const planPago = venta.planPago || venta.plan_pago;
        if (planPago) {
          tienePlan = true;
          const totalVenta = Number(venta.precioFinal || venta.total || 0);
          let pagadoVenta = 0;
          if (planPago.total_pagado !== undefined && planPago.total_pagado !== null) {
            pagadoVenta = Number(planPago.total_pagado);
          } else if (planPago.pagos && Array.isArray(planPago.pagos)) {
            pagadoVenta = planPago.pagos.reduce(
              (sum: number, pago: any) => sum + Number(pago.monto || 0),
              0
            );
          }
          totalDeuda += totalVenta;
          totalPagado += pagadoVenta;
        }
      });
    }

    const porcentajePagado = totalDeuda > 0 ? (totalPagado / totalDeuda) * 100 : 0;
    return {
      tienePlan,
      porcentajePagado: porcentajePagado.toFixed(1),
      totalDeuda,
      totalPagado,
      saldoPendiente: totalDeuda - totalPagado,
    };
  }

  private buildResumenFinancieroCliente(infoPlanPago: any): any {
    return {
      table: {
        widths: ['50%', '50%'],
        body: [
          [
            { text: 'Deuda Total:', style: 'financialLabel', fillColor: this.lightBg },
            {
              text: this.formatCurrency(infoPlanPago.totalDeuda),
              style: 'financialValue',
              fillColor: this.lightBg,
              alignment: 'right',
            },
          ],
          [
            { text: 'Total Pagado:', style: 'financialLabel', fillColor: this.lightBg },
            {
              text: this.formatCurrency(infoPlanPago.totalPagado),
              style: 'financialValue',
              fillColor: this.lightBg,
              alignment: 'right',
            },
          ],
          [
            { text: 'Saldo Pendiente:', style: 'financialLabel', fillColor: this.lightBg },
            {
              text: this.formatCurrency(infoPlanPago.saldoPendiente),
              style: infoPlanPago.saldoPendiente > 0 ? 'financialWarning' : 'financialValue',
              fillColor: this.lightBg,
              alignment: 'right',
            },
          ],
          [
            { text: 'Progreso de Pago:', style: 'financialLabel', fillColor: this.lightBg },
            {
              text: `${infoPlanPago.porcentajePagado}%`,
              style: 'financialValue',
              fillColor: this.lightBg,
              alignment: 'right',
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => this.borderColor,
        vLineColor: () => this.borderColor,
      },
    };
  }

  private buildDetalleVentasCliente(cliente: any): any[] {
    const ventas = cliente.ventas || (cliente.cliente ? cliente.cliente.ventas : []);
    if (!ventas || !Array.isArray(ventas) || ventas.length === 0) {
      return [
        {
          text: 'DETALLE DE VENTAS',
          style: 'sectionTitle',
          background: this.lightBg,
          margin: [0, 20, 0, 10],
        },
        {
          text: 'El cliente no tiene ventas registradas',
          style: 'valueCell',
          margin: [0, 0, 0, 20],
        },
      ];
    }

    const tableBody: any[] = [
      [
        { text: 'VENTA', style: 'labelCell', fillColor: this.lightBg },
        { text: 'INMUEBLE', style: 'labelCell', fillColor: this.lightBg },
        { text: 'TIPO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'FECHA VENTA', style: 'labelCell', fillColor: this.lightBg },
        { text: 'TOTAL', style: 'labelCell', fillColor: this.lightBg },
        { text: 'PAGADO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'SALDO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'AVANCE', style: 'labelCell', fillColor: this.lightBg },
      ],
    ];

    ventas.forEach((venta: any) => {
      const planPago = venta.planPago || venta.plan_pago;
      const total = Number(venta.precioFinal || venta.total || 0);
      let pagado = 0;

      let inmuebleInfo = 'N/A';
      let tipoInmueble = 'N/A';

      if (venta.inmuebleTipo === 'LOTE' && venta.lote) {
        inmuebleInfo = venta.lote.numeroLote;
        tipoInmueble = 'LOTE';
      } else if (venta.inmuebleTipo === 'PROPIEDAD' && venta.propiedad) {
        inmuebleInfo = venta.propiedad.nombre;
        tipoInmueble = 'PROPIEDAD';
      }

      if (planPago) {
        if (planPago.pagos && Array.isArray(planPago.pagos)) {
          pagado = planPago.pagos.reduce(
            (sum: number, pago: any) => sum + Number(pago.monto || 0),
            0
          );
        }
        if (planPago.total_pagado !== undefined && planPago.total_pagado !== null) {
          pagado = Number(planPago.total_pagado);
        }
      }
      const saldo = total - pagado;
      const porcentaje = total > 0 ? (pagado / total) * 100 : 0;
      const fechaVenta = venta.fecha_venta || (planPago ? planPago.fecha_inicio : venta.createdAt);

      tableBody.push([
        { text: `#${venta.id}`, style: 'valueCell' },
        { text: inmuebleInfo, style: 'valueCell' },
        { text: tipoInmueble, style: 'valueCell' },
        { text: this.formatFecha(fechaVenta), style: 'valueCell' },
        { text: this.formatCurrency(total), style: 'valueCell' },
        { text: this.formatCurrency(pagado), style: 'valueCell' },
        {
          text: this.formatCurrency(saldo),
          style: saldo > 0 ? 'financialWarning' : 'valueCell',
        },
        { text: `${porcentaje.toFixed(1)}%`, style: 'valueCell' },
      ]);
    });

    return [
      {
        text: 'DETALLE DE VENTAS',
        style: 'sectionTitle',
        background: this.lightBg,
        margin: [0, 20, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ['8%', '15%', '10%', '12%', '15%', '15%', '15%', '10%'],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? this.lightBg : null),
          hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: (i: number) => (i === 0 ? this.primaryDark : this.borderColor),
          vLineColor: () => this.borderColor,
        },
      },
    ];
  }

  private buildDetallePagos(planPago: any): any[] {
    if (
      !planPago ||
      !planPago.pagos ||
      !Array.isArray(planPago.pagos) ||
      planPago.pagos.length === 0
    ) {
      return [];
    }

    const tableBody: any[] = [
      [
        { text: 'FECHA PAGO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'MONTO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'MÉTODO', style: 'labelCell', fillColor: this.lightBg },
        { text: 'OBSERVACIÓN', style: 'labelCell', fillColor: this.lightBg },
      ],
    ];

    planPago.pagos.forEach((pago: any) => {
      tableBody.push([
        { text: this.formatFecha(pago.fecha_pago), style: 'valueCell' },
        { text: this.formatCurrency(pago.monto), style: 'valueCell' },
        { text: pago.metodoPago || 'EFECTIVO', style: 'valueCell' },
        { text: pago.observacion || '-', style: 'valueCell' },
      ]);
    });

    return [
      {
        text: 'HISTORIAL DE PAGOS',
        style: 'sectionTitle',
        background: this.lightBg,
        margin: [0, 20, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ['20%', '20%', '20%', '40%'],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? this.lightBg : null),
          hLineWidth: (i: number) => (i === 0 ? 2 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: (i: number) => (i === 0 ? this.primaryDark : this.borderColor),
          vLineColor: () => this.borderColor,
        },
      },
    ];
  }

  private getEstadoReservaStyle(estado: string): any {
    const styles: { [key: string]: any } = {
      ACTIVA: { fontSize: 10, bold: true, color: this.successColor },
      VENCIDA: { fontSize: 10, bold: true, color: this.errorColor },
      CANCELADA: { fontSize: 10, bold: true, color: this.warningColor },
      CONVERTIDA_EN_VENTA: { fontSize: 10, bold: true, color: this.primaryColor },
    };
    return styles[estado?.toUpperCase()] || { fontSize: 10, bold: true, color: this.textColor };
  }

  private getEstadoVentaStyle(estado: string): any {
    const styles: { [key: string]: any } = {
      PAGADO: { fontSize: 10, bold: true, color: this.successColor },
      PENDIENTE: { fontSize: 10, bold: true, color: this.warningColor },
      CANCELADO: { fontSize: 10, bold: true, color: this.errorColor },
    };
    return styles[estado?.toUpperCase()] || { fontSize: 10, bold: true, color: this.textColor };
  }

  private formatFecha(dateString: string | Date): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  private formatCurrency(value: any): string {
    if (value === null || value === undefined) return '$ 0.00';
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return `$ ${
      isNaN(num)
        ? '0.00'
        : num.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }`;
  }
}