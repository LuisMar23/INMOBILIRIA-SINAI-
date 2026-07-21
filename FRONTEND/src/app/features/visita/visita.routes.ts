import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { VisitaList } from './components/visita-list/visita-list';
import { VisitaEdit } from './components/visita-edit/visita-edit';
import { VisitaCreate } from './components/visita-create/visita-create';

const routes: Routes = [
  { path: '', component: VisitaList, canActivate: [AuthGuard] },
  { path: 'lista', component: VisitaList, canActivate: [AuthGuard] },
  { path: 'crear', component: VisitaCreate, canActivate: [AuthGuard] },
  { path: 'editar/:id', component: VisitaEdit, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VisitasRoutingModule {}
