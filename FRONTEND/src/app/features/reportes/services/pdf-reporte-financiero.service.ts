import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.vfs;

// ─── Paleta (mismo patrón que tus otros servicios PDF) ───────────────────────
const C = {
  verde:        '#16a34a',
  verdeClaro:   '#22c55e',
  verdePale:    '#f0fdf4',
  azul:         '#2563eb',
  azulPale:     '#eff6ff',
  rojo:         '#dc2626',
  rojoPale:     '#fef2f2',
  amarillo:     '#d97706',
  amarilloPale: '#fffbeb',
  grisOscuro:   '#1f2937',
  grisMedio:    '#6b7280',
  grisPale:     '#f9fafb',
  negro:        '#111827',
  blanco:       '#ffffff',
  cyan:         '#0891b2',
  cyanPale:     '#ecfeff',
  violeta:      '#7c3aed',
  violetaPale:  '#f5f3ff',
};

@Injectable({ providedIn: 'root' })
export class ReporteFinancieroPdfService {

  // ─── Helpers (mismos que tus otros servicios) ─────────────────────────────

  private async getLogoBase64(path: string): Promise<string> {
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
      img.onerror = () => resolve('');
      img.src = path;
    });
  }

  private money(val: any): string {
    const n = parseFloat(val) || 0;
    return 'Bs. ' + n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private fecha(val: any): string {
    if (!val) return 'S/F';
    return new Date(val).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private header(logo: string, titulo: string, landscape = false): any[] {
    const logoContent = logo
      ? { image: logo, width: 45, rowSpan: 2, margin: [0, 2, 0, 0] }
      : { text: '', width: 45, rowSpan: 2 };

    return [
      {
        columns: [
          { ...logoContent },
          {
            stack: [
              { text: 'SINAI BIENES RAÍCES', fontSize: 14, bold: true, color: C.verde },
              { text: titulo, fontSize: 10, color: C.grisOscuro, margin: [0, 2, 0, 0] },
            ],
            margin: [10, 0, 0, 0],
          },
          {
            text: new Date().toLocaleString('es-BO'),
            fontSize: 7,
            color: C.grisMedio,
            alignment: 'right',
            margin: [0, 8, 0, 0],
          },
        ],
        margin: [0, 0, 0, 4],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: landscape ? 761 : 515, y2: 0, lineWidth: 1.5, lineColor: C.verde }], margin: [0, 0, 0, 12] },
    ];
  }

  private subHeader(filtros: any): any {
    const partes: string[] = [];
    if (filtros?.fechaInicio && filtros?.fechaFin) {
      partes.push(`Período: ${filtros.fechaInicio} al ${filtros.fechaFin}`);
    } else {
      partes.push('Período: Todos los registros');
    }
    if (filtros?.metodoPago)  partes.push(`Forma de pago: ${filtros.metodoPago}`);
    if (filtros?.tipoCuota)   partes.push(`Estado cuota: ${filtros.tipoCuota}`);
    if (filtros?.cajaNombre)  partes.push(`Caja/Banco: ${filtros.cajaNombre}`);
    if (filtros?.concepto)    partes.push(`Concepto: ${filtros.concepto}`);

    return {
      text: partes.join('  |  '),
      fontSize: 7.5,
      color: C.grisMedio,
      margin: [0, 0, 0, 14],
    };
  }

  private secTitle(text: string): any {
    return {
      stack: [
        { text, fontSize: 9, bold: true, color: C.grisOscuro, margin: [0, 0, 0, 4] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }] },
      ],
      margin: [0, 10, 0, 8],
    };
  }

  private statCard(label: string, value: string, bg: string, color: string): any {
    return {
      stack: [
        { text: value, fontSize: 14, bold: true, color, alignment: 'center' },
        { text: label, fontSize: 7, color: C.grisMedio, alignment: 'center', margin: [0, 2, 0, 0] },
      ],
      fillColor: bg,
      margin: [4, 6, 4, 6],
      padding: [8, 8, 8, 8],
    };
  }

  private thCell(text: string, align: string = 'left'): any {
    return {
      text,
      fontSize: 7.5,
      bold: true,
      color: C.blanco,
      fillColor: C.grisOscuro,
      alignment: align,
      margin: [4, 5, 4, 5],
    };
  }

  private td(text: string, align: string = 'left', bold = false, color = C.negro): any {
    return { text: text ?? 'S/D', fontSize: 7.5, bold, color, alignment: align, margin: [4, 4, 4, 4] };
  }

  private get stripedLayout() {
    return {
      hLineWidth: () => 0.3,
      vLineWidth: () => 0,
      hLineColor: () => '#e5e7eb',
      fillColor: (row: number) => (row > 0 && row % 2 === 0 ? '#f9fafb' : C.blanco),
    };
  }

  private footer(page: number, pages: number): any {
    return {
      text: `Página ${page} de ${pages}  |  SINAI BIENES RAÍCES`,
      fontSize: 7,
      color: C.grisMedio,
      alignment: 'center',
      margin: [0, 8, 0, 0],
    };
  }

  private fileTag(filtros: any, urbanizacionNombre?: string): string {
    const fecha = filtros?.fechaInicio && filtros?.fechaFin
      ? `${filtros.fechaInicio}_al_${filtros.fechaFin}`
      : 'todos';
    const urb = urbanizacionNombre?.replace(/\s+/g, '_') || 'general';
    return `${urb}_${fecha}`;
  }

  // ─── 1. REPORTE DE INGRESOS ───────────────────────────────────────────────

  async generarReporteIngresos(data: any, filtros: any, infoAdicional?: any) {
    const logo     = await this.getLogoBase64('assets/logoSinai.jpg');
    const ingresos = data?.ingresos || [];
    const total    = data?.totalIngresos || 0;
    const cantidad = data?.cantidad || 0;

    const doc: any = {
      pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'REPORTE DE INGRESOS', true),
        { text: `Urbanización: ${infoAdicional?.urbanizacionNombre || 'General'} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | ${new Date().toLocaleString('es-BO')}`, fontSize: 8, color: C.verde, alignment: 'center', margin: [0, 0, 0, 10] },
        this.subHeader(filtros),
        {
          columns: [
            this.statCard('TOTAL REGISTROS', String(cantidad),    C.azulPale,   C.azul),
            this.statCard('MONTO TOTAL',      this.money(total),  C.verdePale,  C.verde),
          ],
          margin: [0, 0, 0, 16],
        },
        this.secTitle('DETALLE DE INGRESOS'),
        {
          table: {
            headerRows: 1,
            widths: [45, '*', '*', 80, 70, 60],
            body: [
              [
                this.thCell('FECHA',     'center'),
                this.thCell('DESCRIPCIÓN'),
                this.thCell('CLIENTE'),
                this.thCell('CATEGORÍA'),
                this.thCell('MONTO',     'right'),
                this.thCell('REGISTRADO POR'),
              ],
              ...ingresos.map((i: any) => [
                this.td(this.fecha(i.fecha), 'center'),
                this.td(i.descripcion || 'S/D'),
                this.td(i.venta?.cliente?.fullName || 'S/R'),
                this.td(i.categoria?.nombre || 'S/D'),
                this.td(this.money(i.monto), 'right', true, C.verde),
                this.td(i.usuario?.fullName || 'S/D'),
              ]),
              // Fila de total
              [
                { text: 'TOTAL', colSpan: 4, fontSize: 8, bold: true, color: C.grisOscuro, alignment: 'right', margin: [4, 5, 4, 5], fillColor: C.grisPale },
                {}, {}, {},
                { text: this.money(total), fontSize: 8, bold: true, color: C.verde, alignment: 'right', margin: [4, 5, 4, 5], fillColor: C.verdePale },
                { text: '', margin: [4, 5, 4, 5], fillColor: C.grisPale },
              ],
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (p: number, ps: number) => this.footer(p, ps),
    };

    pdfMake.createPdf(doc).download(`Reporte_Ingresos_${this.fileTag(filtros, infoAdicional?.urbanizacionNombre)}.pdf`);
  }

  // ─── 2. RECIBOS EMITIDOS ──────────────────────────────────────────────────

  async generarRecibosEmitidos(data: any, filtros: any, infoAdicional?: any) {
    const logo    = await this.getLogoBase64('assets/logoSinai.jpg');
    const recibos = data?.recibos || [];

    const doc: any = {
      pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'RECIBOS EMITIDOS', true),
        { text: `Urbanización: ${infoAdicional?.urbanizacionNombre || 'General'} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | ${new Date().toLocaleString('es-BO')}`, fontSize: 8, color: C.cyan, alignment: 'center', margin: [0, 0, 0, 10] },
        this.subHeader(filtros),
        this.statCard('TOTAL RECIBOS', String(recibos.length), C.cyanPale, C.cyan),
        this.secTitle('LISTADO DE RECIBOS'),
        {
          table: {
            headerRows: 1,
            widths: [45, '*', '*', 60, 55, 60],
            body: [
              [
                this.thCell('FECHA',       'center'),
                this.thCell('CLIENTE'),
                this.thCell('INMUEBLE'),
                this.thCell('TIPO OP.',    'center'),
                this.thCell('ARCHIVO'),
                this.thCell('REGISTRADO POR'),
              ],
              ...recibos.map((r: any) => {
                const cliente = r.venta?.cliente?.fullName || r.reserva?.cliente?.fullName || 'S/R';
                const inmueble = r.venta?.lote
                  ? `Lote ${r.venta.lote.numeroLote}`
                  : r.venta?.propiedad?.nombre || r.reserva?.lote
                    ? `Lote ${r.reserva?.lote?.numeroLote}` : 'S/D';
                return [
                  this.td(this.fecha(r.creado_en), 'center'),
                  this.td(cliente),
                  this.td(inmueble),
                  this.td(r.tipoOperacion || 'S/D', 'center'),
                  this.td(r.nombreArchivo || 'S/D'),
                  this.td(r.usuarioRegistro?.fullName || 'S/D'),
                ];
              }),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (p: number, ps: number) => this.footer(p, ps),
    };

    pdfMake.createPdf(doc).download(`Recibos_Emitidos_${this.fileTag(filtros, infoAdicional?.urbanizacionNombre)}.pdf`);
  }

  // ─── 3. COBRO DE CUOTAS ───────────────────────────────────────────────────

  async generarReporteCobros(data: any, filtros: any, infoAdicional?: any) {
    const logo   = await this.getLogoBase64('assets/logoSinai.jpg');
    const cuotas = data?.cuotas || [];
    const totalMonto   = data?.totalMonto   || 0;
    const totalPagado  = data?.totalPagado  || 0;
    const pendiente    = data?.pendiente    || 0;

    const doc: any = {
      pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'REPORTE DE COBRO DE CUOTAS', true),
        { text: `Urbanización: ${infoAdicional?.urbanizacionNombre || 'General'} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | ${new Date().toLocaleString('es-BO')}`, fontSize: 8, color: C.verde, alignment: 'center', margin: [0, 0, 0, 10] },
        this.subHeader(filtros),
        {
          columns: [
            this.statCard('TOTAL CUOTAS',  String(cuotas.length),    C.azulPale,     C.azul),
            this.statCard('MONTO TOTAL',   this.money(totalMonto),   C.verdePale,    C.verde),
            this.statCard('PAGADO',        this.money(totalPagado),  C.verdePale,    C.verdeClaro),
            this.statCard('PENDIENTE',     this.money(pendiente),    C.amarilloPale, C.amarillo),
          ],
          margin: [0, 0, 0, 16],
        },
        this.secTitle('DETALLE DE CUOTAS'),
        {
          table: {
            headerRows: 1,
            widths: [30, '*', 55, 55, 65, 60, 50],
            body: [
              [
                this.thCell('Nº',         'center'),
                this.thCell('CLIENTE'),
                this.thCell('CI',         'center'),
                this.thCell('VENCIMIENTO','center'),
                this.thCell('MONTO',      'right'),
                this.thCell('INMUEBLE'),
                this.thCell('ESTADO',     'center'),
              ],
              ...cuotas.map((c: any) => {
                const vencida = c.estado === 'VENCIDA';
                const pagada  = c.estado === 'PAGADA';
                return [
                  this.td(String(c.numero ?? ''), 'center'),
                  this.td(c.planPago?.venta?.cliente?.fullName || 'S/R'),
                  this.td(c.planPago?.venta?.cliente?.ci || 'S/D', 'center'),
                  this.td(this.fecha(c.fecha), 'center'),
                  this.td(this.money(c.monto), 'right', true, pagada ? C.verde : vencida ? C.rojo : C.amarillo),
                  this.td(c.planPago?.venta?.lote
                    ? `Lote ${c.planPago.venta.lote.numeroLote}`
                    : c.planPago?.venta?.propiedad?.nombre || 'S/D'),
                  {
                    text: c.estado,
                    fontSize: 7, bold: true, alignment: 'center',
                    color: pagada ? C.verde : vencida ? C.rojo : C.amarillo,
                    fillColor: pagada ? C.verdePale : vencida ? C.rojoPale : C.amarilloPale,
                    margin: [4, 4, 4, 4],
                  },
                ];
              }),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (p: number, ps: number) => this.footer(p, ps),
    };

    pdfMake.createPdf(doc).download(`Cobro_Cuotas_${this.fileTag(filtros, infoAdicional?.urbanizacionNombre)}.pdf`);
  }

  // ─── 4. INGRESOS POR BANCO ────────────────────────────────────────────────

  async generarIngresosPorBanco(data: any, filtros: any, infoAdicional?: any) {
    const logo         = await this.getLogoBase64('assets/logoSinai.jpg');
    const detalle      = data?.detalle      || [];
    const totalGeneral = data?.totalGeneral || 0;

    const rows: any[] = [];
    detalle.forEach((grupo: any) => {
      // Fila de cabecera de grupo
      rows.push([
        { text: grupo.caja?.nombre || 'Sin caja', colSpan: 4, fontSize: 8, bold: true, color: C.azul, fillColor: C.azulPale, margin: [6, 5, 6, 5] },
        {}, {}, {},
        { text: this.money(grupo.total), fontSize: 8, bold: true, color: C.verde, alignment: 'right', fillColor: C.azulPale, margin: [4, 5, 4, 5] },
      ]);
      grupo.movimientos?.forEach((m: any) => {
        rows.push([
          this.td(this.fecha(m.fecha), 'center'),
          this.td(m.descripcion || 'S/D'),
          this.td(m.venta?.cliente?.fullName || 'S/R'),
          this.td(m.metodoPago || 'S/D', 'center'),
          this.td(this.money(m.monto), 'right', false, C.verde),
        ]);
      });
    });

    const doc: any = {
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'INGRESOS POR BANCO / CAJA'),
        { text: `Urbanización: ${infoAdicional?.urbanizacionNombre || 'General'} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | ${new Date().toLocaleString('es-BO')}`, fontSize: 8, color: C.azul, alignment: 'center', margin: [0, 0, 0, 10] },
        this.subHeader(filtros),
        this.statCard('MONTO TOTAL', this.money(totalGeneral), C.verdePale, C.verde),
        this.secTitle('INGRESOS AGRUPADOS POR CAJA / BANCO'),
        {
          table: {
            headerRows: 1,
            widths: [50, '*', '*', 65, 75],
            body: [
              [
                this.thCell('FECHA',       'center'),
                this.thCell('DESCRIPCIÓN'),
                this.thCell('CLIENTE'),
                this.thCell('MÉTODO PAGO', 'center'),
                this.thCell('MONTO',       'right'),
              ],
              ...(rows.length ? rows : [[
                { text: 'Sin datos para los filtros seleccionados', colSpan: 5, fontSize: 8, color: C.grisMedio, alignment: 'center', margin: [0, 8, 0, 8] },
                {}, {}, {}, {},
              ]]),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (p: number, ps: number) => this.footer(p, ps),
    };

    pdfMake.createPdf(doc).download(`Ingresos_por_Banco_${this.fileTag(filtros, infoAdicional?.urbanizacionNombre)}.pdf`);
  }

  // ─── 5. INGRESOS POR CONCEPTO ─────────────────────────────────────────────

  async generarIngresosPorConcepto(data: any, filtros: any, infoAdicional?: any) {
    const logo         = await this.getLogoBase64('assets/logoSinai.jpg');
    const detalle      = data?.detalle      || [];
    const totalGeneral = data?.totalGeneral || 0;

    const rows: any[] = [];
    detalle.forEach((grupo: any) => {
      rows.push([
        { text: grupo.categoria?.nombre || 'Sin categoría', colSpan: 3, fontSize: 8, bold: true, color: C.violeta, fillColor: C.violetaPale, margin: [6, 5, 6, 5] },
        {}, {},
        { text: this.money(grupo.total), fontSize: 8, bold: true, color: C.verde, alignment: 'right', fillColor: C.violetaPale, margin: [4, 5, 4, 5] },
        { text: String(grupo.ingresos?.length || 0), fontSize: 8, bold: true, color: C.azul, alignment: 'center', fillColor: C.violetaPale, margin: [4, 5, 4, 5] },
      ]);
      grupo.ingresos?.forEach((i: any) => {
        rows.push([
          this.td(this.fecha(i.fecha), 'center'),
          this.td(i.descripcion || 'S/D'),
          this.td(i.venta?.cliente?.fullName || 'S/R'),
          this.td(this.money(i.monto), 'right', false, C.verde),
          this.td(i.usuario?.fullName || 'S/D'),
        ]);
      });
    });

    const doc: any = {
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'INGRESOS POR CONCEPTO'),
        { text: `Urbanización: ${infoAdicional?.urbanizacionNombre || 'General'} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | ${new Date().toLocaleString('es-BO')}`, fontSize: 8, color: C.violeta, alignment: 'center', margin: [0, 0, 0, 10] },
        this.subHeader(filtros),
        this.statCard('MONTO TOTAL', this.money(totalGeneral), C.verdePale, C.verde),
        this.secTitle('INGRESOS AGRUPADOS POR CONCEPTO'),
        {
          table: {
            headerRows: 1,
            widths: [50, '*', '*', 75, '*'],
            body: [
              [
                this.thCell('FECHA',          'center'),
                this.thCell('DESCRIPCIÓN'),
                this.thCell('CLIENTE'),
                this.thCell('MONTO',          'right'),
                this.thCell('REGISTRADO POR'),
              ],
              ...(rows.length ? rows : [[
                { text: 'Sin datos', colSpan: 5, fontSize: 8, color: C.grisMedio, alignment: 'center', margin: [0, 8, 0, 8] },
                {}, {}, {}, {},
              ]]),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (p: number, ps: number) => this.footer(p, ps),
    };

    pdfMake.createPdf(doc).download(`Ingresos_por_Concepto_${this.fileTag(filtros, infoAdicional?.urbanizacionNombre)}.pdf`);
  }

  // ─── 6. REPORTE DE GASTOS ─────────────────────────────────────────────────

  async generarReporteGastos(data: any, filtros: any, infoAdicional?: any) {
    const logo    = await this.getLogoBase64('assets/logoSinai.jpg');
    const egresos = data?.egresos || [];
    const total   = data?.totalGastos || 0;

    const doc: any = {
      pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'REPORTE DE GASTOS / EGRESOS', true),
        { text: `Urbanización: ${infoAdicional?.urbanizacionNombre || 'General'} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | ${new Date().toLocaleString('es-BO')}`, fontSize: 8, color: C.rojo, alignment: 'center', margin: [0, 0, 0, 10] },
        this.subHeader(filtros),
        {
          columns: [
            this.statCard('TOTAL EGRESOS', String(egresos.length), C.rojoPale,  C.rojo),
            this.statCard('MONTO TOTAL',   this.money(total),      C.rojoPale,  C.rojo),
          ],
          margin: [0, 0, 0, 16],
        },
        this.secTitle('DETALLE DE EGRESOS'),
        {
          table: {
            headerRows: 1,
            widths: [45, '*', 80, 65, 75, 65],
            body: [
              [
                this.thCell('FECHA',       'center'),
                this.thCell('DESCRIPCIÓN'),
                this.thCell('CATEGORÍA'),
                this.thCell('CAJA/BANCO'),
                this.thCell('MONTO',       'right'),
                this.thCell('REGISTRADO POR'),
              ],
              ...egresos.map((e: any) => [
                this.td(this.fecha(e.fecha), 'center'),
                this.td(e.descripcion || 'S/D'),
                this.td(e.categoria?.nombre || 'Sin categoría'),
                this.td(e.caja?.nombre || 'S/D'),
                this.td(this.money(e.monto), 'right', true, C.rojo),
                this.td(e.usuario?.fullName || 'S/D'),
              ]),
              [
                { text: 'TOTAL', colSpan: 4, fontSize: 8, bold: true, color: C.grisOscuro, alignment: 'right', margin: [4, 5, 4, 5], fillColor: C.grisPale },
                {}, {}, {},
                { text: this.money(total), fontSize: 8, bold: true, color: C.rojo, alignment: 'right', margin: [4, 5, 4, 5], fillColor: C.rojoPale },
                { text: '', margin: [4, 5, 4, 5], fillColor: C.grisPale },
              ],
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (p: number, ps: number) => this.footer(p, ps),
    };

    pdfMake.createPdf(doc).download(`Reporte_Gastos_${this.fileTag(filtros, infoAdicional?.urbanizacionNombre)}.pdf`);
  }

  // ─── 7. CONSOLIDADO DE GASTOS ─────────────────────────────────────────────

  async generarConsolidadoGastos(data: any, filtros: any, infoAdicional?: any) {
    const logo          = await this.getLogoBase64('assets/logoSinai.jpg');
    const porCategoria  = data?.porCategoria  || [];
    const porCaja       = data?.porCaja       || [];
    const totalGeneral  = data?.totalGeneral  || 0;

    const rowsCat = porCategoria.map((g: any) => [
      this.td(g.categoria?.nombre || 'Sin categoría'),
      this.td(String(g.egresos?.length || 0), 'center'),
      this.td(this.money(g.total), 'right', true, C.rojo),
    ]);

    const rowsCaja = porCaja.map((g: any) => [
      this.td(g.caja?.nombre || 'Sin caja'),
      this.td(String(g.cantidad || 0), 'center'),
      this.td(this.money(g.total), 'right', true, C.rojo),
    ]);

    const doc: any = {
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'CONSOLIDADO DE GASTOS'),
        { text: `Urbanización: ${infoAdicional?.urbanizacionNombre || 'General'} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | ${new Date().toLocaleString('es-BO')}`, fontSize: 8, color: C.cyan, alignment: 'center', margin: [0, 0, 0, 10] },
        this.subHeader(filtros),
        this.statCard('TOTAL GENERAL', this.money(totalGeneral), C.rojoPale, C.rojo),

        this.secTitle('GASTOS POR CATEGORÍA'),
        {
          table: {
            headerRows: 1,
            widths: ['*', 80, 100],
            body: [
              [this.thCell('CATEGORÍA'), this.thCell('CANTIDAD', 'center'), this.thCell('TOTAL', 'right')],
              ...(rowsCat.length ? rowsCat : [[{ text: 'Sin datos', colSpan: 3, fontSize: 8, color: C.grisMedio, alignment: 'center', margin: [0, 6, 0, 6] }, {}, {}]]),
            ],
          },
          layout: this.stripedLayout,
          margin: [0, 0, 0, 16],
        },

        this.secTitle('GASTOS POR BANCO / CAJA'),
        {
          table: {
            headerRows: 1,
            widths: ['*', 80, 100],
            body: [
              [this.thCell('BANCO / CAJA'), this.thCell('CANTIDAD', 'center'), this.thCell('TOTAL', 'right')],
              ...(rowsCaja.length ? rowsCaja : [[{ text: 'Sin datos', colSpan: 3, fontSize: 8, color: C.grisMedio, alignment: 'center', margin: [0, 6, 0, 6] }, {}, {}]]),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (p: number, ps: number) => this.footer(p, ps),
    };

    pdfMake.createPdf(doc).download(`Consolidado_Gastos_${this.fileTag(filtros, infoAdicional?.urbanizacionNombre)}.pdf`);
  }

  // ─── 8. GASTOS POR BANCO ──────────────────────────────────────────────────

  async generarGastosPorBanco(data: any, filtros: any, infoAdicional?: any) {
    const logo         = await this.getLogoBase64('assets/logoSinai.jpg');
    const detalle      = data?.detalle      || [];
    const totalGeneral = data?.totalGeneral || 0;

    const rows: any[] = [];
    detalle.forEach((grupo: any) => {
      rows.push([
        { text: grupo.caja?.nombre || 'Sin caja', colSpan: 4, fontSize: 8, bold: true, color: C.rojo, fillColor: C.rojoPale, margin: [6, 5, 6, 5] },
        {}, {}, {},
        { text: this.money(grupo.total), fontSize: 8, bold: true, color: C.rojo, alignment: 'right', fillColor: C.rojoPale, margin: [4, 5, 4, 5] },
      ]);
      grupo.egresos?.forEach((e: any) => {
        rows.push([
          this.td(this.fecha(e.fecha), 'center'),
          this.td(e.descripcion || 'S/D'),
          this.td(e.categoria?.nombre || 'Sin categoría'),
          this.td(e.metodoPago || 'S/D', 'center'),
          this.td(this.money(e.monto), 'right', false, C.rojo),
        ]);
      });
    });

    const doc: any = {
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'GASTOS POR BANCO / CAJA'),
        { text: `Urbanización: ${infoAdicional?.urbanizacionNombre || 'General'} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | ${new Date().toLocaleString('es-BO')}`, fontSize: 8, color: C.rojo, alignment: 'center', margin: [0, 0, 0, 10] },
        this.subHeader(filtros),
        this.statCard('MONTO TOTAL', this.money(totalGeneral), C.rojoPale, C.rojo),
        this.secTitle('EGRESOS AGRUPADOS POR CAJA / BANCO'),
        {
          table: {
            headerRows: 1,
            widths: [50, '*', 80, 65, 75],
            body: [
              [
                this.thCell('FECHA',       'center'),
                this.thCell('DESCRIPCIÓN'),
                this.thCell('CATEGORÍA'),
                this.thCell('MÉTODO PAGO', 'center'),
                this.thCell('MONTO',       'right'),
              ],
              ...(rows.length ? rows : [[{ text: 'Sin datos', colSpan: 5, fontSize: 8, color: C.grisMedio, alignment: 'center', margin: [0, 8, 0, 8] }, {}, {}, {}, {}]]),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (p: number, ps: number) => this.footer(p, ps),
    };

    pdfMake.createPdf(doc).download(`Gastos_por_Banco_${this.fileTag(filtros, infoAdicional?.urbanizacionNombre)}.pdf`);
  }

  // ─── 9. GASTOS POR CONCEPTO ───────────────────────────────────────────────

  async generarGastosPorConcepto(data: any, filtros: any, infoAdicional?: any) {
    const logo         = await this.getLogoBase64('assets/logoSinai.jpg');
    const detalle      = data?.detalle      || [];
    const totalGeneral = data?.totalGeneral || 0;

    const rows: any[] = [];
    detalle.forEach((grupo: any) => {
      rows.push([
        { text: grupo.categoria?.nombre || 'Sin categoría', colSpan: 3, fontSize: 8, bold: true, color: C.amarillo, fillColor: C.amarilloPale, margin: [6, 5, 6, 5] },
        {}, {},
        { text: this.money(grupo.total), fontSize: 8, bold: true, color: C.rojo, alignment: 'right', fillColor: C.amarilloPale, margin: [4, 5, 4, 5] },
        { text: String(grupo.egresos?.length || 0), fontSize: 8, bold: true, color: C.azul, alignment: 'center', fillColor: C.amarilloPale, margin: [4, 5, 4, 5] },
      ]);
      grupo.egresos?.forEach((e: any) => {
        rows.push([
          this.td(this.fecha(e.fecha), 'center'),
          this.td(e.descripcion || 'S/D'),
          this.td(e.caja?.nombre || 'S/D'),
          this.td(this.money(e.monto), 'right', false, C.rojo),
          this.td(e.usuario?.fullName || 'S/D'),
        ]);
      });
    });

    const doc: any = {
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
      content: [
        ...this.header(logo, 'GASTOS POR CONCEPTO'),
        { text: `Urbanización: ${infoAdicional?.urbanizacionNombre || 'General'} | Generado por: ${infoAdicional?.usuario || 'Sistema'} | ${new Date().toLocaleString('es-BO')}`, fontSize: 8, color: C.amarillo, alignment: 'center', margin: [0, 0, 0, 10] },
        this.subHeader(filtros),
        this.statCard('MONTO TOTAL', this.money(totalGeneral), C.rojoPale, C.rojo),
        this.secTitle('EGRESOS AGRUPADOS POR CONCEPTO'),
        {
          table: {
            headerRows: 1,
            widths: [50, '*', 80, 75, '*'],
            body: [
              [
                this.thCell('FECHA',          'center'),
                this.thCell('DESCRIPCIÓN'),
                this.thCell('CAJA/BANCO'),
                this.thCell('MONTO',          'right'),
                this.thCell('REGISTRADO POR'),
              ],
              ...(rows.length ? rows : [[{ text: 'Sin datos', colSpan: 5, fontSize: 8, color: C.grisMedio, alignment: 'center', margin: [0, 8, 0, 8] }, {}, {}, {}, {}]]),
            ],
          },
          layout: this.stripedLayout,
        },
      ],
      footer: (p: number, ps: number) => this.footer(p, ps),
    };

    pdfMake.createPdf(doc).download(`Gastos_por_Concepto_${this.fileTag(filtros, infoAdicional?.urbanizacionNombre)}.pdf`);
  }
}