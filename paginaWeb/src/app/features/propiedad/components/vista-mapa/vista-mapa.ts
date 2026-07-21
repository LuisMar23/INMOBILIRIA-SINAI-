// src/app/modules/propiedades/components/vista-mapa/vista-mapa.ts
import {
  Component,
  Input,
  signal,
  PLATFORM_ID,
  inject,
  afterNextRender,
  ElementRef,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as L from 'leaflet';
import { Propiedad } from '../../../../core/interfaces/datos.interface';

@Component({
  selector: 'app-vista-mapa-propiedades',
  imports: [],
  templateUrl: './vista-mapa.html',
  styleUrl: './vista-mapa.css',
})
export class VistaMapaPropiedades {
  @Input() propiedades: Propiedad[] = [];

  private map?: L.Map;
  private platformId = inject(PLATFORM_ID);
  private L?: typeof L;

  constructor() {
    afterNextRender(() => {
      this.initMap();
    });
  }

  private async initMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.L = (await import('leaflet')).default;

    this.map = this.L.map('map-propiedades', {
      center: [-17.3895, -66.1568],
      zoom: 13,
    });

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    this.agregarMarcadores();
  }

  private agregarMarcadores() {
    if (!this.propiedades.length || !this.map || !this.L) return;

    const bounds = this.L.latLngBounds([]);

    this.propiedades.forEach((p) => {
      if (p.latitud && p.longitud && this.map && this.L) {
        const marker = this.L.marker([p.latitud, p.longitud]).addTo(this.map);
        marker.bindPopup(`
          <strong>${p.nombre}</strong><br>
          ${p.ciudad} - ${p.tipo}
          <br>Bs ${p.precio.toLocaleString()}
          <br>${p.tamano} m²
        `);
        bounds.extend([p.latitud, p.longitud]);
      }
    });

    if (bounds.isValid() && this.map) this.map.fitBounds(bounds);
  }

  ngOnChanges() {
    if (this.map && isPlatformBrowser(this.platformId)) {
      this.agregarMarcadores();
    }
  }
}
