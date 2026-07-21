// app.routes.ts
import { RouterModule, Routes } from '@angular/router';
import { ReportesVentasComponent } from './reportes-ventas/reportes-ventas';
import { NgModule } from '@angular/core';
import { ReportesLotesComponent } from './reportes-lotes/reportes-lotes';
import { ReportesClientesComponent } from './reportes-clientes/reportes-clientes';
import { ReportesFinancierosPanelComponent } from './reportes-financiero/reportes-financiero';


export const routes: Routes = [
  { path: 'clientes', component: ReportesClientesComponent },
  { path: 'lotes', component: ReportesLotesComponent },
  { path: 'ventas', component: ReportesVentasComponent },
  { path: 'financiero', component: ReportesFinancierosPanelComponent },
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportesRoutingModule {}
