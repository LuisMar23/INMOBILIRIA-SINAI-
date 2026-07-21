import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ManzanoList } from './components/manzano-list/manzano-list';
import { ManzanoCreate } from './components/manzano-create/manzano-create';
import { ManzanoEdit } from './components/manzano-edit/manzano-edit';

const routes: Routes = [
  { path: '', component: ManzanoList, canActivate: [AuthGuard] },
  { path: 'lista', component: ManzanoList, canActivate: [AuthGuard] },
  { path: 'crear', component: ManzanoCreate, canActivate: [AuthGuard] },
  { path: 'editar/:id', component: ManzanoEdit, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManzanoRoutingModule {}
