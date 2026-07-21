import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { CajaList } from './components/caja-list/caja-list';
import { CierreComponent } from './components/cierre/cierre';
import { MovimientosList } from '../movimientos/movimientos-list/movimientos-list';

const routes: Routes = [
  { path: '', component: CajaList, canActivate: [AuthGuard] },
  { path: 'cierre/:id', component: CierreComponent, canActivate: [AuthGuard] },
  { path: 'movimientos/:id', component: MovimientosList, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CajaRoutingModule {}
