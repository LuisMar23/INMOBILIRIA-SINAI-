import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UsersEditComponent } from './components/users-edit/users-edit';
import { UsersComponent } from './components/users-list/users-list';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { Perfil } from './components/perfil/perfil';
import { UsersCreateComponent } from './components/ussers-create/ussers-create';

const routes: Routes = [
  {
    path: '',
    component: UsersComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMINISTRADOR', 'SECRETARIA'] },
  },
  {
    path: 'editar/:id',
    component: UsersEditComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMINISTRADOR', 'SECRETARIA'] },
  },

  { path: 'perfil', component: Perfil, canActivate: [AuthGuard] },
  { path: 'crear', component:UsersCreateComponent ,
        canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ADMINISTRADOR'] },
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}
