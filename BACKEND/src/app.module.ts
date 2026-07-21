import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UrbanizacionModule } from './urbanizacion/urbanizacion.module';
import { PromocionModule } from './promocion/promocion.module';
import { LotesModule } from './lote/lote.module';
import { VentasModule } from './venta/venta.module';
import { ReservasModule } from './reserva/reserva.module';
import { CotizacionesModule } from './cotizacion/cotizacion.module';
import { CajaModule } from './caja/caja.module';
import { MovimientoModule } from './movimiento/movimiento.module';
import { CierreModule } from './cierre/cierre.module';
import { VisitasModule } from './visita/visita.module';
import { ArchivosModule } from './archivos/archivos.module';

import { DashboardModule } from './dashboard/dashboard.module';

import { ReciboModule } from './recibo/recibo.module';
import { PropiedadModule } from './propiedad/propiedad.module';
import { CreditosModule } from './creditos/creditos.module';
import { ReportesModule } from './reportes/reportes.module';
import { EgresosModule } from './egresos/egresos.module';
import { SeguridadModule } from './seguridad/seguridad.module';

import { ReportesClientesModule } from './reportes-clientes-service/reportes-clientes-service.module';
import { ReporteslotesModule } from './reporteslotes/reporteslotes.module';
import { ManzanoModule } from './manzano/manzano.module';
import { SedesModule } from './sedes/sedes.module';
import { ReportesFinancierosModule } from './reportes-financiero/reportes-financiero.module';


@Module({
  imports: [
    AuthModule,
    UsersModule,
    UrbanizacionModule,
    PromocionModule,
    LotesModule,
    VentasModule,
    ReservasModule,
    CotizacionesModule,
    CajaModule,
    MovimientoModule,
    CierreModule,
    VisitasModule,
    ArchivosModule,
    ReciboModule,
    DashboardModule,
    PropiedadModule,
    CreditosModule,
    ReportesModule,
    EgresosModule,
    SeguridadModule,
    ReportesClientesModule,
    ReporteslotesModule,
    ManzanoModule,
    SedesModule,
    ReportesFinancierosModule
  ],





  controllers: [],
  providers: [],
})
export class AppModule {}
