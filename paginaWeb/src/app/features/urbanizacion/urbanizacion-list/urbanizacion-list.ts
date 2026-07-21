// urbanizacion-list.component.ts
import { Component, computed, signal, OnInit } from '@angular/core';
import { UrbanizacionService } from '../services/urbanizacion.service';
import { Urbanizacion } from '../../../core/interfaces/datos.interface';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-urbanizacion-list',
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './urbanizacion-list.html',
  styleUrl: './urbanizacion-list.css',
})
export class UrbanizacionList implements OnInit {
  urbanizaciones = signal<Urbanizacion[]>([]);
  urlServer = environment.fileServer;
  filtroCity = signal<string>('');
  totalLotes!: number;

  constructor(private urbanizacionService: UrbanizacionService) {}

  urbanizacionesFiltradas = computed(() => {
    const filtro = this.filtroCity().toLowerCase().trim();
    if (!filtro) {
      return this.urbanizaciones();
    }

    return this.urbanizaciones().filter((u) => u.ciudad?.toLowerCase().includes(filtro));
  });

  ngOnInit(): void {
    this.urbanizacionService.getAll().subscribe({
      next: (data) => {
        console.log('Datos recibidos:', data);
        this.urbanizaciones.set(data);

        if (Array.isArray(data)) {
          this.totalLotes = data.reduce((total, urbanizacion) => {
            return total + (urbanizacion._count?.lotes || 0);
          }, 0);
        }
      },
      error: (err) => console.error(err),
    });
  }

  limpiarFiltro(): void {
    this.filtroCity.set('');
  }
}