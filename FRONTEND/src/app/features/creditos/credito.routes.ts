import { RouterModule, Routes } from "@angular/router";

import { AuthGuard } from "../../core/guards/auth.guard";
import { NgModule } from "@angular/core";
import { CreditosListComponent } from "./components/creditos-list/creditos-list";



const routes:Routes=[
    {
        path:'',
        component:CreditosListComponent,
        canActivate:[AuthGuard]
    }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CreditosRoutingModule{}