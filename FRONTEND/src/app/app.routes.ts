import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './dashboard/dashboard';
import { LayoutComponent } from './shared/components/layout/layout';
import { RegisterComponent } from './components/auth/register/register';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginComponent } from './components/login/login';
import { ChangePasswordComponent } from './components/auth/change-password/change-password';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'login/registrar', component: RegisterComponent },
  { path: 'login/cambiar-contraseña', component: ChangePasswordComponent },
  {
    path: 'lotes/listaUrbanizaciones',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/lote/components/urbanizacion-list/urbanizacion-list').then(
        (c) => c.UrbanizacionList,
      ),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'usuarios',
        loadChildren: () =>
          import('./features/users/users.routes').then((r) => r.UserRoutingModule),
      },
      {
        path: 'clientes',
        loadChildren: () =>
          import('./features/clientes/cliente.routes').then((r) => r.ClientesRoutingModule),
      },
      {
        path: 'creditos',
        loadChildren: () =>
          import('./features/creditos/credito.routes').then((r) => r.CreditosRoutingModule),
      },
      {
        path: 'urbanizaciones',
        loadChildren: () =>
          import('./features/urbanizacion/urbanizacion.routes').then(
            (r) => r.UrbanizacionRoutingModule,
          ),
      },
      {
        path: 'egresos', 
        loadChildren: () =>
          import('./features/egresos/egresos.routes').then((r) => r.EgresosRoutingModule),
      },
      {
        path: 'gastos', 
        loadChildren: () =>
          import('./features/gastos/gastos.routes').then((r) => r.GastosRoutingModule),
      },
      {
        path: 'propiedades', 
        loadChildren: () =>
          import('./features/propiedad/propiedad.routes').then((r) => r.PropiedadRoutingModule),
      },

      {
        path: 'seguridad',
        loadChildren: () =>
          import('./features/seguridad/seguridad.routes').then((r) => r.SeguridadRoutingModule),
      },
      {
        path: 'reportes', 
        loadChildren: () =>
          import('./features/reportes/reportes.routes').then((r) => r.ReportesRoutingModule),
      },

      {
        path: 'promociones',
        loadChildren: () =>
          import('./features/promocion/promocion.routes').then((r) => r.PromocionesRoutingModule),
      },
      {
        path: 'lotes',
        loadChildren: () => import('./features/lote/lote.routes').then((r) => r.LotesRoutingModule),
      },
      {
        path: 'cotizaciones',
        loadChildren: () =>
          import('./features/cotizacion/cotizacion.routes').then(
            (r) => r.CotizacionesRoutingModule,
          ),
      },
      {
        path: 'reservas',
        loadChildren: () =>
          import('./features/reserva/reserva.routes').then((r) => r.ReservaRoutingModule),
      },
      {
        path: 'ventas',
        loadChildren: () =>
          import('./features/venta/venta.routes').then((r) => r.VentasRoutingModule),
      },
      {
        path: 'caja',
        loadChildren: () => import('./features/caja/caja.routes').then((r) => r.CajaRoutingModule),
      },
      {
        path: 'visitas',
        loadChildren: () =>
          import('./features/visita/visita.routes').then((r) => r.VisitasRoutingModule),
      },
      {
        path: 'cobros',
        loadChildren: () =>
          import('./features/cobros/cobros.routes').then((r) => r.CobrosRoutingModule),
      },
      {
        path: 'manzanos',
        loadChildren: () =>
          import('./features/manzano/manzano.route').then((r) => r.ManzanoRoutingModule),
      },
      {
        path: 'cobros',
        loadChildren: () =>
          import('./features/cobros/cobros.routes').then((r) => r.CobrosRoutingModule),
      },
           {
        path: 'sedes',
        loadChildren: () =>
          import('./features/sede/sede.routes').then((r) => r.SedeRoutingModule),
      },
      //       {
      //   path: 'reportesclientes',
      //   loadChildren: () =>
      //     import('./features/cobros/cobros.routes').then((r) => r.CobrosRoutingModule),
      // },
      //       {
      //   path: 'reporteslotes',
      //   loadChildren: () =>
      //     import('./features/cobros/cobros.routes').then((r) => r.CobrosRoutingModule),
      // },
    ],
  },
  { path: '**', redirectTo: '/login' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: false,
      enableTracing: false,
      scrollPositionRestoration: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
