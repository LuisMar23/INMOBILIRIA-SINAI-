// services/pdfMovimientos.service.ts
import { Injectable } from '@angular/core';
import { Movimiento } from '../../../core/interfaces/caja.interface';

// ── Paleta minimalista — solo negro/grises como el cronograma ──
const C = {
  negro:      '#000000',
  grisOscuro: '#333333',
  grisMedio:  '#666666',
  grisClaro:  '#999999',
  grisTabla:  '#cccccc',
  grisFilaAlt:'#f5f5f5',
  amarillo:   '#ffffcc', // fila resaltada (como el cronograma)
  blanco:     '#ffffff',
};

const EMPRESA = {
  nombre:    'SINAÍ BIENES RAÍCES',
  nit:       'NIT: 5813305010',
  direccion: 'AV. BARRIENTOS O. ENTRE C/ V. DE CHAGUAYA Y C/ G. BUCH - BERMEJO',
  telefono:  'Teléfono: 74532320',
};

export interface ResumenMovimientos {
  totalIngresos:    number;
  totalEgresos:     number;
  saldoNeto:        number;
  cantidadIngresos: number;
  cantidadEgresos:  number;
}

export interface PorMetodoPago {
  metodoPago: string;
  total:      number;
  cantidad:   number;
}

export interface SaldoDiario {
  dia:            string;
  netoDelDia:     number;
  saldoAcumulado: number;
}

export interface DatosCaja {
  id:           number;
  nombre:       string;
  saldoActual:  number;
  montoInicial: number;
  estado:       string;
  usuarioApertura?: { fullName: string };
}

export interface FiltrosReporte {
  mes?:        number;
  anio?:       number;
  tipo?:       string;
  metodoPago?: string;
  manzano?:    string;
  numeroLote?: string;
}

@Injectable({ providedIn: 'root' })
export class PdfMovimientosService {

  private async getPdfMake() {
    const pdfMake  = (await import('pdfmake/build/pdfmake')) as any;
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')) as any;
    pdfMake.default.vfs = pdfFonts.default.vfs ?? pdfFonts.vfs;
    return pdfMake.default ?? pdfMake;
  }

  // ── Helpers ───────────────────────────────────────────────────
  private money(v: number | string): string {
    return `BS ${Number(v).toLocaleString('es-BO', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    })}`;
  }

  private fechaCorta(s: string): string {
    return new Date(s).toLocaleDateString('es-BO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  private horaCorta(s: string): string {
    return new Date(s).toLocaleTimeString('es-BO', {
      hour: '2-digit', minute: '2-digit',
    });
  }

  private periodoTexto(f: FiltrosReporte): string {
    const meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    if (f.mes && f.anio) return `${meses[f.mes]} ${f.anio}`;
    if (f.anio)          return `Año ${f.anio}`;
    return 'Todos los períodos';
  }

  // ── Logo ──────────────────────────────────────────────────────
  private async getLogoBase64(): Promise<string | null> {
    try {
      const res  = await fetch('assets/logoSinai.jpg');
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  // ── ENCABEZADO igual al cronograma ────────────────────────────
  // Logo izquierda | Nombre+datos centrados
  private async buildHeader(titulo: string, subtitulo?: string): Promise<any[]> {
    const logo = await this.getLogoBase64();

    const logoCell: any = logo
      ? { image: logo, width: 55, alignment: 'center', margin: [0, 4, 0, 4] }
      : { text: '', border: [false, false, false, false] };

    const items: any[] = [
      // Bloque empresa: logo + datos en tabla sin bordes internos
      {
        table: {
          widths: [70, '*'],
          body: [
            [
              { ...logoCell, rowSpan: 4, border: [false, false, false, false] },
              {
                text: EMPRESA.nombre,
                fontSize: 14, bold: true, alignment: 'center',
                color: C.negro,
                border: [false, false, false, false],
                margin: [0, 6, 0, 2],
              },
            ],
            [
              {},
              {
                text: EMPRESA.nit,
                fontSize: 8, alignment: 'center', color: C.grisOscuro,
                border: [false, false, false, false],
              },
            ],
            [
              {},
              {
                text: EMPRESA.direccion,
                fontSize: 7.5, alignment: 'center', color: C.grisOscuro,
                border: [false, false, false, false],
                margin: [0, 1, 0, 1],
              },
            ],
            [
              {},
              {
                text: EMPRESA.telefono,
                fontSize: 8, alignment: 'center', color: C.grisOscuro,
                border: [false, false, false, false],
                margin: [0, 0, 0, 4],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) =>
            i === 0 || i === node.table.body.length ? 1 : 0,
          vLineWidth: (i: number, node: any) =>
            i === 0 || i === node.table.widths.length ? 1 : 0,
          hLineColor: () => C.grisTabla,
          vLineColor: () => C.grisTabla,
          paddingLeft: () => 4, paddingRight: () => 4,
          paddingTop: () => 0, paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 8],
      },
      // Título del reporte centrado y en negrita
      {
        text: titulo,
        fontSize: 11, bold: true,
        alignment: 'center',
        color: C.negro,
        margin: [0, 4, 0, 2],
      },
    ];

    if (subtitulo) {
      items.push({
        text: subtitulo,
        fontSize: 9, bold: false,
        alignment: 'center',
        color: C.grisOscuro,
        margin: [0, 0, 0, 8],
      });
    }

    return items;
  }

  // ── Ficha filtros aplicados (2 columnas, sin color) ───────────
  private fichaFiltros(caja: DatosCaja, filtros: FiltrosReporte): any {
    const tipoTexto = filtros.tipo
      ? (filtros.tipo === 'INGRESO' ? 'SOLO INGRESOS' : 'SOLO EGRESOS')
      : 'INGRESOS Y EGRESOS';

    const otros: string[] = [];
    if (filtros.metodoPago) otros.push(`Método: ${filtros.metodoPago}`);
    if (filtros.manzano)    otros.push(`Manzano: ${filtros.manzano}`);
    if (filtros.numeroLote) otros.push(`Lote: ${filtros.numeroLote}`);

    const lbl = (t: string): any => ({
      text: t, fontSize: 8, bold: true, color: C.negro,
    });
    const val = (t: string): any => ({
      text: t, fontSize: 8, bold: false, color: C.grisOscuro, margin: [0, 0, 0, 3],
    });

    return {
      table: {
        widths: ['*', '*'],
        body: [[
          {
            stack: [
              lbl('Caja:'),        val(caja.nombre),
              lbl('Responsable:'), val(caja.usuarioApertura?.fullName ?? '—'),
              lbl('Estado:'),      val(caja.estado),
            ],
            border: [true, true, false, true],
            margin: [8, 8, 8, 8],
          },
          {
            stack: [
              lbl('Período:'),           val(this.periodoTexto(filtros)),
              lbl('Tipo de movimiento:'), val(tipoTexto),
              lbl('Otros filtros:'),      val(otros.length ? otros.join(' | ') : 'Sin filtros adicionales'),
              lbl('Generado:'),           val(new Date().toLocaleString('es-BO')),
            ],
            border: [false, true, true, true],
            margin: [8, 8, 8, 8],
          },
        ]],
      },
      layout: {
        hLineWidth: () => 0.8, vLineWidth: () => 0.8,
        hLineColor: () => C.negro, vLineColor: () => C.negro,
        paddingLeft: () => 0, paddingRight: () => 0,
        paddingTop: () => 0, paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 10],
    };
  }

  // ── Resumen contable (3 celdas, sin color) ────────────────────
  private bloqueResumen(r: ResumenMovimientos): any {
    const celda = (label: string, valor: string, sub: string): any => ({
      stack: [
        { text: label, fontSize: 7, bold: true, color: C.negro, margin: [0, 0, 0, 2] },
        { text: valor, fontSize: 12, bold: true, color: C.negro },
        { text: sub,   fontSize: 7,  color: C.grisMedio, margin: [0, 1, 0, 0] },
      ],
      margin: [6, 8, 6, 8],
      border: [true, true, true, true],
    });

    return {
      table: {
        widths: ['*', '*', '*'],
        body: [[
          celda('TOTAL INGRESOS', this.money(r.totalIngresos), `${r.cantidadIngresos} transacciones`),
          celda('TOTAL EGRESOS',  this.money(r.totalEgresos),  `${r.cantidadEgresos} transacciones`),
          celda('SALDO NETO',     this.money(r.saldoNeto),     r.saldoNeto >= 0 ? 'Positivo' : 'Negativo'),
        ]],
      },
      layout: {
        hLineWidth: () => 0.8, vLineWidth: () => 0.8,
        hLineColor: () => C.negro, vLineColor: () => C.negro,
        paddingLeft: () => 0, paddingRight: () => 0,
        paddingTop: () => 0, paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 10],
    };
  }

  // ── Título de sección (fondo gris, borde negro) ───────────────
  private seccion(texto: string): any {
    return {
      table: {
        widths: ['*'],
        body: [[{
          text: texto,
          fontSize: 9, bold: true, alignment: 'center',
          color: C.negro, fillColor: C.grisFilaAlt,
          margin: [0, 5, 0, 5],
          border: [true, true, true, true],
        }]],
      },
      layout: {
        hLineWidth: () => 0.8, vLineWidth: () => 0.8,
        hLineColor: () => C.negro, vLineColor: () => C.negro,
        paddingLeft: () => 0, paddingRight: () => 0,
        paddingTop: () => 0, paddingBottom: () => 0,
      },
      margin: [0, 10, 0, 0],
    };
  }

  // ── Primitivas de celda (estilo cronograma) ───────────────────
  private th(text: string, align: 'left'|'center'|'right' = 'left'): any {
    return {
      text, fontSize: 8, bold: true,
      color: C.blanco, fillColor: C.negro,
      alignment: align,
      margin: [4, 5, 4, 5],
      border: [true, true, true, true],
    };
  }

  private td(
    text: string,
    align: 'left'|'center'|'right' = 'left',
    rowIdx = 0,
    bold = false,
    resaltado = false,
  ): any {
    return {
      text: text ?? '',
      fontSize: 8, bold,
      color: C.negro,
      alignment: align,
      fillColor: resaltado ? C.amarillo : (rowIdx % 2 !== 0 ? C.grisFilaAlt : C.blanco),
      margin: [4, 4, 4, 4],
      border: [true, true, true, true],
    };
  }

  private tdTotal(text: string, align: 'left'|'center'|'right' = 'left'): any {
    return {
      text, fontSize: 8, bold: true,
      color: C.negro,
      alignment: align,
      fillColor: C.grisFilaAlt,
      margin: [4, 5, 4, 5],
      border: [true, true, true, true],
    };
  }

  private get layout() {
    return {
      hLineWidth: () => 0.8, vLineWidth: () => 0.8,
      hLineColor: () => C.negro, vLineColor: () => C.negro,
      paddingLeft: () => 0, paddingRight: () => 0,
      paddingTop: () => 0, paddingBottom: () => 0,
    };
  }

  // ── Tabla movimientos ─────────────────────────────────────────
  private tablaMovimientos(movimientos: Movimiento[]): any {
    const filas = movimientos.map((m, i) => {
      const lote     = m.venta?.lote;
      const cliente  = (m as any).venta?.cliente?.fullName ?? '';
      const loteInfo = lote
        ? [lote.manzano ? `Mzno. ${lote.manzano}` : '', `Lote ${lote.numeroLote}`]
            .filter(Boolean).join(' - ')
        : '';
      const celda = [cliente, loteInfo].filter(Boolean).join('\n') || '—';

      return [
        this.td(this.fechaCorta(m.fecha), 'left',   i),
        this.td(this.horaCorta(m.fecha),  'center', i),
        this.td(m.tipo,                   'center', i, true),
        this.td(m.metodoPago,             'center', i),
        this.td(
          `${m.tipo === 'INGRESO' ? '+' : '-'} ${this.money(m.monto)}`,
          'right', i, true,
        ),
        this.td(m.descripcion ?? '—',     'left',   i),
        { ...this.td(celda, 'left', i), fontSize: 7 },
      ];
    });

    const neto = movimientos.reduce(
      (s, m) => m.tipo === 'INGRESO' ? s + Number(m.monto) : s - Number(m.monto), 0
    );

    filas.push([
      this.tdTotal('TOTAL GENERAL'),
      { ...this.tdTotal(''), colSpan: 3 }, {}, {},
      this.tdTotal(this.money(neto), 'right'),
      { ...this.tdTotal(''), colSpan: 2 }, {},
    ] as any);

    return {
      table: {
        headerRows: 1,
        widths: [52, 36, 46, 55, 72, '*', 70],
        body: [
          [
            this.th('Fecha'),
            this.th('Hora', 'center'),
            this.th('Tipo', 'center'),
            this.th('Método', 'center'),
            this.th('Monto', 'right'),
            this.th('Descripción'),
            this.th('Cliente / Lote'),
          ],
          ...filas,
        ],
      },
      layout: this.layout,
    };
  }

  // ── Tabla método de pago ──────────────────────────────────────
  private tablaMetodoPago(datos: PorMetodoPago[]): any {
    const total    = datos.reduce((s, d) => s + d.total,    0);
    const cantidad = datos.reduce((s, d) => s + d.cantidad, 0);

    return {
      table: {
        widths: ['*', 80, 120],
        headerRows: 1,
        body: [
          [this.th('Método de Pago'), this.th('Cantidad', 'center'), this.th('Total', 'right')],
          ...datos.map((d, i) => [
            this.td(d.metodoPago,        'left',   i),
            this.td(String(d.cantidad),  'center', i),
            this.td(this.money(d.total), 'right',  i, true),
          ]),
          [
            this.tdTotal('TOTAL GENERAL'),
            this.tdTotal(String(cantidad), 'center'),
            this.tdTotal(this.money(total), 'right'),
          ],
        ],
      },
      layout: this.layout,
    };
  }

  // ── Tabla saldo diario ────────────────────────────────────────
  private tablaSaldoDiario(datos: SaldoDiario[]): any {
    return {
      table: {
        widths: [90, '*', 120],
        headerRows: 1,
        body: [
          [this.th('Día'), this.th('Neto del Día', 'right'), this.th('Saldo Acumulado', 'right')],
          ...datos.map((d, i) => [
            this.td(d.dia,                     'left',  i),
            this.td(this.money(d.netoDelDia),  'right', i, true),
            this.td(this.money(d.saldoAcumulado), 'right', i, true),
          ]),
        ],
      },
      layout: this.layout,
    };
  }

  // ── Footer ────────────────────────────────────────────────────
  private footer(label: string) {
    return (page: number, pages: number) => ({
      columns: [
        { text: `${EMPRESA.nombre} — ${label}`, fontSize: 7, color: C.grisMedio },
        {
          text: `Generado: ${new Date().toLocaleString('es-BO')}   |   Página ${page} de ${pages}`,
          fontSize: 7, color: C.grisMedio, alignment: 'right',
        },
      ],
      margin: [30, 8, 30, 0],
    });
  }

  // ════════════════════════════════════════════════════════════
  // REPORTE DETALLADO DE MOVIMIENTOS
  // ════════════════════════════════════════════════════════════
  async generarReporteMovimientos(
    movimientos: Movimiento[],
    resumen:     ResumenMovimientos,
    porMetodo:   PorMetodoPago[],
    caja:        DatosCaja,
    filtros:     FiltrosReporte,
  ) {
    if (!movimientos.length) return;
    const pdfMake = await this.getPdfMake();

    const tipoLabel = filtros.tipo
      ? `TIPO: ${filtros.tipo === 'INGRESO' ? 'SOLO INGRESOS' : 'SOLO EGRESOS'}`
      : 'TIPO: TODOS';

    const header = await this.buildHeader(
      'REPORTE DE MOVIMIENTOS DE CAJA',
      `PERÍODO: ${this.periodoTexto(filtros)}   |   ${tipoLabel}`,
    );

    const docDef: any = {
      pageSize:      'A4',
      pageOrientation: 'portrait', // ← siempre vertical
      pageMargins:   [30, 30, 30, 40],
      content: [
        ...header,
        this.fichaFiltros(caja, filtros),
        this.bloqueResumen(resumen),
        this.seccion('DETALLE DE MOVIMIENTOS'),
        { ...this.tablaMovimientos(movimientos), margin: [0, 0, 0, 0] },
      ],
      footer: this.footer('Movimientos de Caja'),
      defaultStyle: { font: 'Roboto' },
    };

    pdfMake.createPdf(docDef).download(
      `movimientos-${caja.nombre}-${Date.now()}.pdf`
    );
  }

  // ════════════════════════════════════════════════════════════
  // REPORTE RESUMEN
  // ════════════════════════════════════════════════════════════
  async generarResumen(
    resumen:     ResumenMovimientos,
    porMetodo:   PorMetodoPago[],
    saldoDiario: SaldoDiario[],
    caja:        DatosCaja,
    filtros:     FiltrosReporte,
  ) {
    const pdfMake = await this.getPdfMake();

    const tipoLabel = filtros.tipo
      ? `TIPO: ${filtros.tipo === 'INGRESO' ? 'SOLO INGRESOS' : 'SOLO EGRESOS'}`
      : 'TIPO: TODOS';

    const header = await this.buildHeader(
      'RESUMEN DE CAJA',
      `PERÍODO: ${this.periodoTexto(filtros)}   |   ${tipoLabel}`,
    );

    const docDef: any = {
      pageSize:        'A4',
      pageOrientation: 'portrait', // ← siempre vertical
      pageMargins:     [30, 30, 30, 40],
      content: [
        ...header,
        this.fichaFiltros(caja, filtros),
        this.bloqueResumen(resumen),
        this.seccion('DESGLOSE POR MÉTODO DE PAGO'),
        { ...this.tablaMetodoPago(porMetodo), margin: [0, 0, 0, 0] },
        this.seccion('SALDO ACUMULADO POR DÍA'),
        { ...this.tablaSaldoDiario(saldoDiario), margin: [0, 0, 0, 0] },
      ],
      footer: this.footer('Resumen de Caja'),
      defaultStyle: { font: 'Roboto' },
    };

    pdfMake.createPdf(docDef).download(
      `resumen-${caja.nombre}-${Date.now()}.pdf`
    );
  }
}