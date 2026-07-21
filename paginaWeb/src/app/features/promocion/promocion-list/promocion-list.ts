// lotes-promocion.component.ts
import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PromocionBadgeComponent } from '../promocion-badge-component/promocion-badge-component';
import { PrecioPromocionComponent } from '../precio-promocion-component/precio-promocion-component';
import { LoteService } from '../../lotes/services/lote.service';
import { environment } from '../../../../environments/environment';

interface LoteConPromocion {
  id: number;
  uuid: string;
  numeroLote: string;
  superficieM2: number;
  precioBase: number;
  descripcion?: string;
  ciudad: string;
  archivos?: Array<{ urlArchivo: string }>;
  LotePromocion?: Array<{
    promocion: {
      titulo: string;
      descripcion?: string;
      descuento: number;
      fechaInicio: Date;
      fechaFin: Date;
    };
  }>;
  precioConDescuento: number;
}

@Component({
  selector: 'app-lotes-promocion',
  standalone: true,
  imports: [CommonModule, RouterLink, PromocionBadgeComponent, PrecioPromocionComponent],
  templateUrl: './promocion-list.html'
})
export class LotesPromocionComponent implements OnInit {
  private loteService = inject(LoteService);
  urlServer = environment.fileServer;
  
  lotesRaw = signal<any[]>([]);
  
  lotesPromocion = computed<LoteConPromocion[]>(() => {
    return this.lotesRaw().map(lote => {
      const promocionActiva = lote.LotePromocion?.[0]?.promocion;
      let precioConDescuento = lote.precioBase;
      
      if (promocionActiva?.descuento) {
        precioConDescuento = lote.precioBase * (1 - promocionActiva.descuento / 100);
      }
      
      return {
        ...lote,
        precioConDescuento
      };
    });
  });

  ngOnInit() {
    this.cargarLotesPromocion();
  }

  cargarLotesPromocion() {
    this.loteService.getLotesPromocion().subscribe({
      next: (resp) => {
        this.lotesRaw.set(resp);
      },
    });
  }
}