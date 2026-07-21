import { RouterModule, Routes } from '@angular/router';
import { MainLayout } from './shared/main-layout/main-layout';
import { NgModule } from '@angular/core';
import { Contacto } from './features/contacto/contacto/contacto';
import { LotesPromocionComponent } from './features/promocion/promocion-list/promocion-list';
import { Inicio } from './features/inicio/inicio';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path:'inicio',
        component:Inicio
      },
      {
        path: 'lotes',
        loadChildren: () =>
          import('./features/lotes/lotes.routes').then((m) => m.LotesRoutingModule),
      },
      {
        path: 'propiedades',
        loadChildren: () =>
          import('./features/propiedad/propiedad.routes').then((m) => m.PropiedadesRoutingModule),
      },
      {
        path: 'urbanizaciones',
        loadChildren: () =>
          import('./features/urbanizacion/urbanizacion.routes').then(
            (m) => m.UrbanizacionRoutingModule
          ),
      },
      {
        path: 'contacto',
        component: Contacto,
      },
      {
        path: 'promociones',
        component: LotesPromocionComponent,
      },
    ],
  },
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
