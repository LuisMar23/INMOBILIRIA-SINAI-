import { Component, Input, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Lote } from '../../../../core/interfaces/datos.interface';

declare let L: any;

@Component({
  selector: 'app-vista-mapa',
  standalone: false, // Ajusta según tu configuración (si es standalone o no)
  templateUrl: './vista-mapa.html',
  styleUrls: ['./vista-mapa.css'],
})
export class VistaMapa implements AfterViewInit {
  @Input() lotes: Lote[] = [];
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  private map: any;
  private markers: any[] = [];

  get lotesConUbicacion(): Lote[] {
    return this.lotes.filter((lote) => lote.ubicacion && lote.ubicacion.trim() !== '');
  }

  ngAfterViewInit(): void {
    if (this.lotesConUbicacion.length > 0) {
      this.initMap();
    }
  }

  private initMap(): void {
    if (!this.mapContainer) return;

    let center: [number, number] = [-16.5, -68.15];
    const firstLote = this.lotesConUbicacion[0];
    if (firstLote && firstLote.ubicacion) {
      const coords = this.extraerCoordenadas(firstLote.ubicacion);
      if (coords) center = coords;
    }

    this.map = L.map(this.mapContainer.nativeElement).setView(center, 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    this.agregarMarcadores();
  }

  private extraerCoordenadas(ubicacion: string): [number, number] | null {
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = ubicacion.match(regex);
    if (match) {
      return [parseFloat(match[1]), parseFloat(match[2])];
    }

    try {
      const url = new URL(ubicacion);
      const params = new URLSearchParams(url.search);
      const q = params.get('q');
      if (q) {
        const parts = q.split(',');
        if (parts.length >= 2) {
          return [parseFloat(parts[0]), parseFloat(parts[1])];
        }
      }
    } catch (e) {}

    return null;
  }

  private agregarMarcadores(): void {
    this.lotesConUbicacion.forEach((lote) => {
      const coords = this.extraerCoordenadas(lote.ubicacion!);
      if (!coords) return;

      const marker = L.marker(coords).addTo(this.map);
      marker.bindPopup(`
        <b>Lote ${lote.numeroLote}</b><br>
        Ciudad: ${lote.ciudad}<br>
        Superficie: ${lote.superficieM2} m²<br>
        <a href="/lotes/${lote.uuid}" target="_blank">Ver detalle</a>
      `);
      this.markers.push(marker);
    });

    if (this.markers.length > 0) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }
}
