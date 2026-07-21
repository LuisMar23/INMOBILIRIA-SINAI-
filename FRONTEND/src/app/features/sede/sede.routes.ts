import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { SedeList } from './components/sede-list/sede-list';
import { SedeCreate } from './components/sede-create/sede-create';
import { SedeEdit } from './components/sede-edit/sede-edit';

const routes: Routes = [
  { path: '', component: SedeList, canActivate: [AuthGuard] },
  { path: 'lista', component: SedeList, canActivate: [AuthGuard] },
  { path: 'crear', component: SedeCreate, canActivate: [AuthGuard] },
  { path: 'editar/:id', component: SedeEdit, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SedeRoutingModule {}
