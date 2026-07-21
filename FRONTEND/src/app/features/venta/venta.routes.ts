import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { VentaList } from './components/venta-list/venta-list';
import { VentaEdit } from './components/venta-edit/venta-edit';
import { VentaCreate } from './components/venta-create/venta-create';
import { VentaDetail } from './components/venta-detail/venta-detail';

const routes: Routes = [
  { path: '', component: VentaList, canActivate: [AuthGuard] },
  { path: 'lista', component: VentaList, canActivate: [AuthGuard] },
  { path: 'crear', component: VentaCreate, canActivate: [AuthGuard] },
  { path: 'editar/:id', component: VentaEdit, canActivate: [AuthGuard] },
  { path: 'detalles/:id', component: VentaDetail, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VentasRoutingModule {}
