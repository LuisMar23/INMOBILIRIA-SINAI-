// src/app/modules/reserva/reserva.routes.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ReservaList } from './components/reserva-list/reserva-list';
import { ReservaCreate } from './components/reserva-create/reserva-create';
import { ReservaEdit } from './components/reserva-edit/reserva-edit';

const routes: Routes = [
  { path: '', component: ReservaList, canActivate: [AuthGuard] },
  { path: 'lista', component: ReservaList, canActivate: [AuthGuard] },
  { path: 'crear', component: ReservaCreate, canActivate: [AuthGuard] },
  { path: 'editar/:id', component: ReservaEdit, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReservaRoutingModule {}
