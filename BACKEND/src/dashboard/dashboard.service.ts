import { Injectable } from '@nestjs/common';
import { TipoInmueble } from 'generated/prisma';
import { PrismaService } from 'src/config/prisma.service';


@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}
async getResumenGeneral() {
  const [
    lotesDisponibles,
    lotesVendidos,
    lotesReservados,
    propiedadesDisponibles,
    propiedadesVendidas,
    propiedadesReservadas,
    ingresosTotales,
    ingresosMes,
    topAsesores,
    lotesVendidosData,
    propiedadesVendidasData,
  ] = await Promise.all([
    // Estadísticas de lotes
    this.prisma.lote.count({ where: { estado: 'DISPONIBLE' } }),
    this.prisma.lote.count({ where: { estado: 'VENDIDO' } }),
    this.prisma.lote.count({ where: { estado: 'RESERVADO' } }),
    
    // Estadísticas de propiedades
    this.prisma.propiedad.count({ 
      where: { 
        estado: 'DISPONIBLE',
        estadoPropiedad: 'VENTA',
        tipo: { in: ['CASA', 'DEPARTAMENTO'] }
      } 
    }),
    this.prisma.propiedad.count({ 
      where: { 
        estado: 'VENDIDO',
        estadoPropiedad: 'VENTA',
        tipo: { in: ['CASA', 'DEPARTAMENTO'] }
      } 
    }),
    this.prisma.propiedad.count({ 
      where: { 
        estado: 'RESERVADO',
        estadoPropiedad: 'VENTA',
        tipo: { in: ['CASA', 'DEPARTAMENTO'] }
      } 
    }),
    
    // Ingresos totales
    this.prisma.venta.aggregate({ _sum: { precioFinal: true } }),
    
    // Ingresos del mes actual
    this.prisma.venta.aggregate({
      _sum: { precioFinal: true },
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    
    // Top 3 asesores
    this.prisma.venta.groupBy({
      by: ['asesorId'],
      _count: { id: true },
      _sum: { precioFinal: true },
      orderBy: { _count: { id: 'desc' } },
      take: 3,
    }),
    
    // Lotes más vendidos (por urbanización)
    this.prisma.venta.groupBy({
      by: ['loteId'],
      where: { 
        inmuebleTipo: TipoInmueble.LOTE,
        loteId: { not: null }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    }),
    
    // Propiedades más vendidas
    this.prisma.venta.groupBy({
      by: ['propiedadId'],
      where: { 
        inmuebleTipo: TipoInmueble.PROPIEDAD,
        propiedadId: { not: null }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    }),
  ]);

  // Obtener datos de la urbanización más demandada (si existe)
  let urbanizacionMasDemandada = 'N/D';
  if (lotesVendidosData.length > 0 && lotesVendidosData[0].loteId) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: lotesVendidosData[0].loteId },
      include: { urbanizacion: { select: { nombre: true } } },
    });
    urbanizacionMasDemandada = lote?.urbanizacion?.nombre || 'N/D';
  }

  // Obtener datos de la propiedad más demandada (si existe)
  let propiedadMasDemandada = 'N/D';
  if (propiedadesVendidasData.length > 0 && propiedadesVendidasData[0].propiedadId) {
    const propiedad = await this.prisma.propiedad.findUnique({
      where: { id: propiedadesVendidasData[0].propiedadId },
      select: { nombre: true, tipo: true, ubicacion: true },
    });
    propiedadMasDemandada = propiedad 
      ? `${propiedad.nombre} (${propiedad.tipo})` 
      : 'N/D';
  }

  // Enriquecer datos de asesores con información del usuario
  const asesoresConDetalles = await Promise.all(
    topAsesores.map(async (asesor) => {
      const usuario = await this.prisma.user.findUnique({
        where: { id: asesor.asesorId },
        select: { fullName: true, email: true },
      });
      return {
        asesorId: asesor.asesorId,
        nombre: usuario?.fullName || 'Desconocido',
        email: usuario?.email || '',
        ventasRealizadas: asesor._count.id,
        totalVentas: asesor._sum.precioFinal || 0,
      };
    })
  );

  return {
    lotes: {
      disponibles: lotesDisponibles,
      vendidos: lotesVendidos,
      reservados: lotesReservados,
      total: lotesDisponibles + lotesVendidos + lotesReservados,
    },
    propiedades: {
      disponibles: propiedadesDisponibles,
      vendidas: propiedadesVendidas,
      reservadas: propiedadesReservadas,
      total: propiedadesDisponibles + propiedadesVendidas + propiedadesReservadas,
    },
    ingresos: {
      total: Number(ingresosTotales._sum.precioFinal) || 0,
      mes: Number(ingresosMes._sum.precioFinal) || 0,
    },
    asesores: asesoresConDetalles,
    masDemandados: {
      urbanizacion: urbanizacionMasDemandada,
      propiedad: propiedadMasDemandada,
    },
  };
}

  async getActividadMensual() {
    const ventas = await this.prisma.$queryRaw<
      { mes: number; total: number }[]
    >`
      SELECT EXTRACT(MONTH FROM "created_at") AS mes, COUNT(*) AS total
      FROM "Venta"
      GROUP BY mes
      ORDER BY mes;
    `;

    const reservas = await this.prisma.$queryRaw<
      { mes: number; total: number }[]
    >`
      SELECT EXTRACT(MONTH FROM "fecha_inicio") AS mes, COUNT(*) AS total
      FROM "Reserva"
      GROUP BY mes
      ORDER BY mes;
    `;

    const cotizaciones = await this.prisma.$queryRaw<
      { mes: number; total: number }[]
    >`
      SELECT EXTRACT(MONTH FROM "created_at") AS mes, COUNT(*) AS total
      FROM "Cotizacion"
      GROUP BY mes
      ORDER BY mes;
    `;

    return { ventas, reservas, cotizaciones };
  }
}
