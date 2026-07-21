// src/app/modules/cotizacion/cotizacion-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { CotizacionList } from './components/cotizacion-list/cotizacion-list';
import { CotizacionEdit } from './components/cotizacion-edit/cotizacion-edit';
import { CotizacionCreate } from './components/cotizacion-create/cotizacion-create';

const routes: Routes = [
  { path: '', component: CotizacionList, canActivate: [AuthGuard] },
  { path: 'lista', component: CotizacionList, canActivate: [AuthGuard] },
  { path: 'crear', component: CotizacionCreate, canActivate: [AuthGuard] },
  { path: 'editar/:id', component: CotizacionEdit, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CotizacionesRoutingModule {}
