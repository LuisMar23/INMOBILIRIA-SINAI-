import { NgModule } from "@angular/core";

import { RouterModule, Routes } from "@angular/router";
import { GastosProyectoComponent } from "./gastos-proyecto/gastos-proyecto";
import { GastosGeneralesComponent } from "./gastos-generales/gastos-generales";
import { AuthGuard } from "../../core/guards/auth.guard";


export const routes: Routes = [
    { path: 'generales', component:GastosGeneralesComponent,canActivate: [AuthGuard]},
  { path: 'proyecto', component:GastosProyectoComponent,canActivate: [AuthGuard]},
//   { path: '', redirectTo: '/reportes', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GastosRoutingModule {}
