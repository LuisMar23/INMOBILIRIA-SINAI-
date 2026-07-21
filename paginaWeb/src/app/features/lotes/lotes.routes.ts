import { RouterModule, Routes } from '@angular/router';
import { LotesLista } from './pages/lotes-lista/lotes-lista';
import { LoteDetalle } from './pages/lote-detalle/lote-detalle';
import { NgModule } from '@angular/core';

const routes: Routes = [
  { path: '', component: LotesLista },
  { path: ':uuid', component: LoteDetalle },
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LotesRoutingModule {}