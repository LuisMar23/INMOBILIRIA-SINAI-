import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportesLotesService } from '../services/reportes-lotes.service';
import { UrbanizacionContextService } from '../../../core/services/urbanizacion-context.service';

interface ManzanoDto {
  id: number;
  uuid: string;
  nombre: string;
}

@Component({
  selector: 'app-reportes-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes-lotes.html',
})
export class ReportesLotesComponent implements OnInit {
  private readonly reportesService = inject(ReportesLotesService);
  private readonly urbanizacionContext = inject(UrbanizacionContextService);

  manzanoSeleccionadoId = signal<number | null>(null); 
  manzanos = signal<ManzanoDto[]>([]);                

  cargandoTotal       = signal(false);
  cargandoDisponibles = signal(false);
  cargandoVendidos    = signal(false);
  cargandoReservados  = signal(false);
  cargandoDetalle     = signal(false);
  cargandoGeneral     = signal(false);

  private get urbanizacionId(): number | null {
    return this.urbanizacionContext.urbanizacionId;
  }

  ngOnInit() {
    this.cargarManzanos();
  }

  async cargarManzanos() {
    const id = this.urbanizacionId;
    if (!id) {
      this.manzanos.set([]);
      return;
    }
    try {
      const lista = await this.reportesService.getManzanos(id);
      this.manzanos.set(lista);
    } catch (error) {
      console.error('Error cargando manzanos:', error);
      this.manzanos.set([]);
    }
  }

  onManzanoChange(value: string) {
    // El select emite string; convertimos a número o null si es "todas"
    this.manzanoSeleccionadoId.set(value === 'todas' ? null : Number(value));
  }

  async descargarTotalLotes() {
    const id = this.urbanizacionId;
    if (!id) return;
    this.cargandoTotal.set(true);
    try {
      await this.reportesService.exportarTotalLotesPdf(id, this.manzanoSeleccionadoId() ?? undefined);
    } finally {
      this.cargandoTotal.set(false);
    }
  }

  async descargarDisponibles() {
    const id = this.urbanizacionId;
    if (!id) return;
    this.cargandoDisponibles.set(true);
    try {
      await this.reportesService.exportarLotesDisponiblesPdf(id, this.manzanoSeleccionadoId() ?? undefined);
    } finally {
      this.cargandoDisponibles.set(false);
    }
  }

  async descargarVendidos() {
    const id = this.urbanizacionId;
    if (!id) return;
    this.cargandoVendidos.set(true);
    try {
      await this.reportesService.exportarLotesVendidosPdf(id, this.manzanoSeleccionadoId() ?? undefined);
    } finally {
      this.cargandoVendidos.set(false);
    }
  }

  async descargarReservados() {
    const id = this.urbanizacionId;
    if (!id) return;
    this.cargandoReservados.set(true);
    try {
      await this.reportesService.exportarLotesReservadosPdf(id, this.manzanoSeleccionadoId() ?? undefined);
    } finally {
      this.cargandoReservados.set(false);
    }
  }

  async descargarDetalle() {
    const id = this.urbanizacionId;
    if (!id) return;
    this.cargandoDetalle.set(true);
    try {
      await this.reportesService.exportarDetalleLotesPdf(id, this.manzanoSeleccionadoId() ?? undefined);
    } finally {
      this.cargandoDetalle.set(false);
    }
  }

  async descargarGeneralDetallado() {
    const id = this.urbanizacionId;
    if (!id) return;
    this.cargandoGeneral.set(true);
    try {
      await this.reportesService.exportarGeneralDetalladoPdf(id);
    } finally {
      this.cargandoGeneral.set(false);
    }
  }
}