import { Injectable } from '@angular/core';
import { VentaDto } from '../interfaces/venta.interface';

declare const require: any;
import * as pdfMakeLib from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

const pdfMake: any = pdfMakeLib;
pdfMake.vfs = pdfFonts as any;

@Injectable({
  providedIn: 'root'
})
export class AnticipoPdfService {

  generarAnticipoPdf(venta: VentaDto): void {
    const fechaCreacion = venta.createdAt ? new Date(venta.createdAt) : new Date();
    const horaActual = this.formatearHora(fechaCreacion);
    const diaActual = fechaCreacion.getDate().toString().padStart(2, '0');
    const mesTexto = this.formatearMesTexto(fechaCreacion);

    let urbanizacion = '';
    let loteNro = '';
    let superficie = '';

    if (venta.lote) {
      urbanizacion = venta.lote.urbanizacion?.nombre || '';
      loteNro = venta.lote.numeroLote || '';
      superficie = venta.lote.superficieM2?.toString() || '';
    }

    const montoInicial = venta.planPago?.montoInicial || 0;
    const montoFormateado = montoInicial.toLocaleString('es-BO');

    const nombreCliente = venta.cliente?.fullName || '';
    const ciCliente = venta.cliente?.ci || '';

    const fechaGeneracion = new Date().toLocaleDateString('es-BO').replace(/\//g, '-');
    const nombreArchivo = `Anticipo-${nombreCliente.replace(/\s+/g, '_')}-${fechaGeneracion}.pdf`;

    // 3 espacios a cada lado hacen la línea punteada más larga que el dato y cuentan como caracteres con ancho fijo
    const datoCampo = (valor: string, punteados: string) =>
      valor
        ? { text: `   ${valor.trim()}   `, style: 'dottedText', decoration: 'underline', decorationStyle: 'dotted' }
        : { text: punteados, style: 'dottedText' };

    const docDefinition: any = {
      pageSize: 'LETTER',
      pageOrientation: 'portrait',
      pageMargins: [70.87, 141.75, 70.87, 56.7],

      content: [
        {
          text: 'ANTICIPO   DE   PAGO   POR   LA   COMPRA   DE   LOTE',
          style: 'headerSub',
          alignment: 'center',
          margin: [0, 0, 0, 30]
        },
        {
          // Línea: hora, día
          text: [
            { text: 'En  la   ciudad    de    Bermejo    a    horas ', style: 'normalText' },
            datoCampo(horaActual, '..................'),
            { text: ' de    fecha   ', style: 'normalText' },
            datoCampo(diaActual, '............'),
            { text: '  de  ', style: 'normalText' }
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 0],
          lineHeight: 1.3
        },
        {
          // Línea: mes, monto inicial
          text: [
            datoCampo(mesTexto, '.................'),
            { text: 'del   año   2026,   se   recibe   la   suma   de   ', style: 'normalText' },
            datoCampo(montoFormateado, '............'),
            { text: '(BS.)', style: 'normalText' }
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 0],
          lineHeight: 1.3
        },
        {
          // Línea: $US sin dato dinámico
          text: [
            { text: '$US (', style: 'normalText' },
            { text: '..............................................................................', style: 'dottedText' },
            { text: '),   por   concepto', style: 'normalText' }
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 0],
          lineHeight: 1.3
        },
        {
          // Línea: tipo de lote sin dato dinámico
          text: [
            { text: 'ANTICIPO   DE   PAGO,   por   la   compra   de   ', style: 'normalText' },
            { text: '............................................', style: 'dottedText' },
            { text: '   LOTE,   en   la', style: 'normalText' }
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 0],
          lineHeight: 1.3
        },
        {
          // Línea: urbanización, manzano
          text: [
            { text: 'urbanización   "', style: 'normalText' },
            datoCampo(urbanizacion, '...........................'),
            { text: '",   MANZANO   "', style: 'normalText' },
            { text: '........', style: 'dottedText' },
            { text: '",   LOTE   Nro.', style: 'normalText' }
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 0],
          lineHeight: 1.3
        },
        {
          // Línea: lote nro, superficie
          text: [
            datoCampo(loteNro, '...........'),
            { text: ',   con   una   SUPERFICIE   de   ', style: 'normalText' },
            datoCampo(superficie, '............'),
            { text: '   (', style: 'normalText' },
            { text: '........', style: 'dottedText' },
            { text: '   Ml.   de   frente   por', style: 'normalText' }
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 0],
          lineHeight: 1.3
        },
        {
          text: [
            { text: '........', style: 'dottedText' },
            { text: '   Ml.   de   fondo),   proyecto   a   cargo   de   la   INMOBILIARIA   SINAI   –', style: 'normalText' }
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 0],
          lineHeight: 1.3
        },
        {
          text: [
            { text: 'BIENES   RAICES,   con   Licencia   de   Funcionamiento   N°   005833,   emitida   por   el', style: 'normalText' }
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 0],
          lineHeight: 1.3
        },
        {
          text: [
            { text: 'Gobierno   Municipal   de   Bermejo,   se   recibe   de   conformidad   la   suma', style: 'normalText' }
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 0],
          lineHeight: 1.3
        },
        {
          // Línea: monto repetido, $US
          text: [
            { text: 'de   ', style: 'normalText' },
            datoCampo(montoFormateado, '.................'),
            { text: '..   (BS.)   $US   (', style: 'normalText' },
            { text: '..............................................................................', style: 'dottedText' },
            { text: '),', style: 'normalText' }
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 0],
          lineHeight: 1.3
        },
        {
          // Línea: nombre cliente
          text: [
            { text: 'del   señor ', style: 'normalText' },
            datoCampo(nombreCliente, '...........................................'),
            { text: ',   con   cedula   de', style: 'normalText' }
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 0],
          lineHeight: 1.3
        },
        {
          // Línea: CI cliente
          text: [
            { text: 'identidad   Nro. ', style: 'normalText' },
            datoCampo(ciCliente, '............................')
          ],
          alignment: 'justify',
          margin: [0, 0, 0, 0],
          lineHeight: 1.3
        },
        {
          text: [
            { text: 'PLAZO   DE   LA   RESERVA:   ', style: 'normalText' },
            { text: '..............................................................................', style: 'dottedText' }
          ],
          margin: [0, 6, 0, 20],
          lineHeight: 1.3
        },
        // NOTA CON SUBRAYADO COMPLETO COMO EN EL PDF ORIGINAL
        {
          stack: [
            {
              text: 'NOTA: Se aclara expresamente, que en caso de solicitud de la devolución del Anticipo de Pago,',
              style: 'notaText',
              decoration: 'underline',
              decorationStyle: 'solid'
            },
            {
              text: 'la empresa solo procederá al reembolso del 50% del monto total depositado, esto por la',
              style: 'notaText',
              decoration: 'underline',
              decorationStyle: 'solid'
            },
            {
              text: 'consideración de perjuicios a la empresa.',
              style: 'notaText',
              decoration: 'underline',
              decorationStyle: 'solid'
            }
          ],
          margin: [0, 0, 0, 40],
          lineHeight: 1.3
        },
        {
          columns: [
            {
              width: '50%',
              stack: [
                {
                  text: '.............................',
                  style: 'dottedText',
                  alignment: 'center',
                  margin: [0, 5, 0, 0]
                },
                {
                  text: 'FIRMA: .............................',
                  style: 'dottedText',
                  alignment: 'center',
                  margin: [0, 5, 0, 0]
                },
                {
                  // CI del cliente con subrayado punteado en sección de firmas
                  text: ciCliente
                    ? [
                        { text: 'C.I. Nro. ', style: 'dottedText' },
                        { text: `   ${ciCliente.trim()}   `, style: 'dottedText', decoration: 'underline', decorationStyle: 'dotted' }
                      ]
                    : { text: 'C.I. Nro. ............................', style: 'dottedText' },
                  alignment: 'center',
                  margin: [0, 5, 0, 0]
                },
                { text: 'CLIENTE', style: 'firmaBold', alignment: 'center', margin: [0, 2, 0, 2] },
                { text: 'ENTREGUE CONFORME', style: 'firmaBold', alignment: 'center', margin: [0, 2, 0, 0] }
              ]
            },
            {
              width: '50%',
              stack: [
                {
                  text: '.............................',
                  style: 'dottedText',
                  alignment: 'center',
                  margin: [0, 5, 0, 0]
                },
                {
                  text: 'FIRMA: .............................',
                  style: 'dottedText',
                  alignment: 'center',
                  margin: [0, 5, 0, 0]
                },
                {
                  text: 'C.I. Nro. .............................',
                  style: 'dottedText',
                  alignment: 'center',
                  margin: [0, 5, 0, 0]
                },
                { text: 'INMOBILIARIA "SINAI - BIENES RAICES"', style: 'firmaBold', alignment: 'center', margin: [0, 2, 0, 2] },
                { text: 'RECIBI CONFORME', style: 'firmaBold', alignment: 'center', margin: [0, 2, 0, 0] }
              ]
            }
          ],
          margin: [0, 20, 0, 30]
        },
        {
          text: 'DIRECCION OFICINA: Av. Barrientos Ortuño entre calle German Busch y calle virgen de chagauaya',
          style: 'direccionBold',
          alignment: 'center',
          margin: [0, 20, 0, 2]
        },
        {
          text: 'BERMEJO - BOLIVIA',
          style: 'direccionBold',
          alignment: 'center',
          margin: [0, 2, 0, 0]
        }
      ],

      styles: {
        headerSub: {
          fontSize: 16,
          bold: true,
          color: '#000000'
        },
        normalText: {
          fontSize: 12,
          color: '#000000'
        },
        dottedText: {
          fontSize: 12,
          color: '#000000'
        },
        notaText: {
          fontSize: 11,
          italics: true,
          color: '#000000'
        },
        firmaBold: {
          fontSize: 12,
          bold: true,
          color: '#000000'
        },
        direccionBold: {
          fontSize: 10,
          bold: true,
          color: '#000000'
        }
      },

      defaultStyle: {
        font: 'Roboto',
        color: '#000000'
      }
    };

    pdfMake.createPdf(docDefinition).download(nombreArchivo);
  }

  private formatearHora(fecha: Date): string {
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  private formatearMesTexto(fecha: Date): string {
    const meses = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    return meses[fecha.getMonth()];
  }
}