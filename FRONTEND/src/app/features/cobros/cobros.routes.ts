import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CobrosList } from './components/cobros-list/cobros-list';
import { CobrosComponent } from './components/cobros/cobros';
import { AuthGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  { path: '', component: CobrosList, canActivate: [AuthGuard] },
  { path: ':id', component: CobrosComponent, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CobrosRoutingModule {}
