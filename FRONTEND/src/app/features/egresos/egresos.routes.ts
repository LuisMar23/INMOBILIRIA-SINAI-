import { NgModule } from "@angular/core";
import { EgresosComponent } from "./egresoscomponent/egresoscomponent";
import { RouterModule, Routes } from "@angular/router";

export const routes: Routes = [
  { path: '', component: EgresosComponent},
//   { path: '', redirectTo: '/reportes', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EgresosRoutingModule {}
