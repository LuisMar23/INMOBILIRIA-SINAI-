// urbanizacion-detalle.component.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { UrbanizacionService } from '../services/urbanizacion.service';
import { Lote, Urbanizacion } from '../../../core/interfaces/datos.interface';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swiper from 'swiper';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-urbanizacion-detalle',
  imports: [CommonModule, RouterModule],
  templateUrl: './urbanizacion-detalle.html',
  styleUrl: './urbanizacion-detalle.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class UrbanizacionDetalle {
  urbanizacion = signal<Urbanizacion|null>(null);
  filtroEstado: 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | '' = '';
  lightboxOpen = false;
  selectedImage: string | null = null;
  urlServer = environment.fileServer;

  constructor(
    private route: ActivatedRoute,
    private urbanizacionService: UrbanizacionService
  ) {}

  ngOnInit(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.urbanizacionService.getByUuid(uuid).subscribe({
        next: (data) => {
          this.urbanizacion.set(data.data);
        },
        error: (err) => console.error(err),
      });
    }
  }

  lotesFiltrados() {
    if (!this.filtroEstado || !this.urbanizacion()) return this.urbanizacion()?.lotes;
    return this.urbanizacion()?.lotes.filter((l: any) => l.estado === this.filtroEstado);
  }

  ngAfterViewInit(): void {
    new Swiper('.swiper-container', {
      slidesPerView: 1,
      spaceBetween: 10,
      navigation: true,
      pagination: { clickable: true },
      loop: true,
      zoom: true,
      breakpoints: {
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
    });
  }

  openLightbox(url: string) {
    this.selectedImage = url;
    this.lightboxOpen = true;
  }

  closeLightbox() {
    this.selectedImage = null;
    this.lightboxOpen = false;
  }

  tieneMaps(): boolean {
    return !!this.urbanizacion()?.maps && this.urbanizacion()!.maps!.trim().length > 0;
  }

  abrirMaps() {
    const maps = this.urbanizacion()?.maps;
    if (maps) {
      window.open(maps, '_blank', 'noopener,noreferrer');
    }
  }
}