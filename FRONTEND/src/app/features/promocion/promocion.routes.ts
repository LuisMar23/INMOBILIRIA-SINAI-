import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { PromocionList } from './components/promocion-list/promocion-list';
import { PromocionCreate } from './components/promocion-create/promocion-create';
import { PromocionEdit } from './components/promocion-edit/promocion-edit';

const routes: Routes = [
  { path: '', component: PromocionList, canActivate: [AuthGuard] },
  { path: 'lista', component: PromocionList, canActivate: [AuthGuard] },
  { path: 'crear', component: PromocionCreate, canActivate: [AuthGuard] },
  { path: 'editar/:id', component: PromocionEdit, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PromocionesRoutingModule {}