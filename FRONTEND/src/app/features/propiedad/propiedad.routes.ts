import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { PropiedadList } from './components/propiedad-list/propiedad-list';
import { PropiedadDetail } from './components/propiedad-detail/propiedad-detail';
import { PropiedadCreate } from './components/propiedad-create/propiedad-create';
import { PropiedadEdit } from './components/propiedad-edit/propiedad-edit';

const routes: Routes = [
  { path: '', component: PropiedadList, canActivate: [AuthGuard] },
  { path: 'lista', component: PropiedadList, canActivate: [AuthGuard] },
  { path: 'detalle/:id', component: PropiedadDetail, canActivate: [AuthGuard] },
  { path: 'crear', component: PropiedadCreate, canActivate: [AuthGuard] },
  { path: 'editar/:id', component: PropiedadEdit, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PropiedadRoutingModule {}
