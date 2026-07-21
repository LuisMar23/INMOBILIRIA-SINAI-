import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClientesListComponent } from './components/cliente-list/cliente-list';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ClientesCreateComponent } from './components/cliente-create/cliente-create';
import { ClientesEditComponent } from './components/cliente-edit/cliente-edit';

const routes: Routes = [
  {
    path: '',
    component: ClientesListComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'crear',
    component: ClientesCreateComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'editar/:id',
    component: ClientesEditComponent,
    canActivate: [AuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClientesRoutingModule {}
