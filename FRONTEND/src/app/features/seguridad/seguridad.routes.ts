import { NgModule } from "@angular/core";

import { RouterModule, Routes } from "@angular/router";
import { SeguridadComponent } from "./seguridad-component/seguridad-component";
import { Grupos } from "./components/grupos/grupos";

export const routes: Routes = [
  { path: '', component:Grupos},
    { path: 'accesos', component:SeguridadComponent},
//   { path: '', redirectTo: '/reportes', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SeguridadRoutingModule {}
