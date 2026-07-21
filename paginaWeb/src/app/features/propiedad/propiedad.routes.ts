// src/app/modules/propiedades/propiedades-routing.module.ts
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { PropiedadesLista } from './pages/propiedad-lista/propiedad-lista';
import { PropiedadDetalle } from './pages/propiedad-detalle/propiedad-detalle';

const routes: Routes = [
  { path: '', component: PropiedadesLista },
  { path: ':uuid', component: PropiedadDetalle },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PropiedadesRoutingModule {}
