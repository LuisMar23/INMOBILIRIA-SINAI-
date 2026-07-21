import { Component, inject, signal } from '@angular/core';
import { ReportesClientesService } from '../services/reportesclientes.service';

@Component({
  selector: 'app-reportes-clientes',
  imports: [],
  templateUrl: './reportes-clientes.html',
  styleUrl: './reportes-clientes.css'
})
export class ReportesClientesComponent {
 private readonly service = inject(ReportesClientesService);

  cargandoTodosContactosXls = signal(false);
  cargandoSoloClientesXls   = signal(false);
  cargandoListaPdf          = signal(false);
  cargandoPotencialesPdf    = signal(false);

  async descargarTodosContactosXls() {
    this.cargandoTodosContactosXls.set(true);
    try {
      await this.service.exportarTodosContactosXls();
    } finally {
      this.cargandoTodosContactosXls.set(false);
    }
  }

  async descargarSoloClientesXls() {
    this.cargandoSoloClientesXls.set(true);
    try {
      await this.service.exportarSoloClientesXls();
    } finally {
      this.cargandoSoloClientesXls.set(false);
    }
  }

  async descargarListaPdf() {
    this.cargandoListaPdf.set(true);
    try {
      await this.service.exportarListaClientesPdf();
    } finally {
      this.cargandoListaPdf.set(false);
    }
  }

  async descargarPotencialesPdf() {
    this.cargandoPotencialesPdf.set(true);
    try {
      await this.service.exportarClientesPotencialesPdf();
    } finally {
      this.cargandoPotencialesPdf.set(false);
    }
  }
}
