import path from "path";
import { UrbanizacionList } from "./urbanizacion-list/urbanizacion-list";
import { UrbanizacionDetalle } from "./urbanizacion-detalle/urbanizacion-detalle";
import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";




const routes: Routes=[
    {path:'',component:UrbanizacionList},
    {path:':uuid',component:UrbanizacionDetalle}
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UrbanizacionRoutingModule {}