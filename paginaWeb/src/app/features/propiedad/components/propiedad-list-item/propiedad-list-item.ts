// src/app/modules/propiedades/components/propiedad-list-item/propiedad-list-item.ts
import { Component, Input } from '@angular/core';
import { Propiedad } from '../../../../core/interfaces/datos.interface';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-propiedad-list-item',
  imports: [RouterModule, CommonModule],
  templateUrl: './propiedad-list-item.html',
  styleUrl: './propiedad-list-item.css',
})
export class PropiedadListItem {
  urlServer = environment.fileServer;
  @Input() propiedad!: Propiedad;

  obtenerEstadoClase(estado: string | undefined): string {
    return (
      {
        DISPONIBLE: 'bg-green-100 text-green-700',
        RESERVADO: 'bg-yellow-100 text-yellow-700',
        VENDIDO: 'bg-red-100 text-red-700',
      }[estado || ''] || ''
    );
  }

  obtenerTipoPropiedadClase(tipo: string | undefined): string {
    return (
      {
        CASA: 'bg-blue-100 text-blue-700',
        DEPARTAMENTO: 'bg-purple-100 text-purple-700',
        GARZONIER: 'bg-orange-100 text-orange-700',
        CUARTO: 'bg-gray-100 text-gray-700',
      }[tipo || ''] || ''
    );
  }

  tieneArchivos(): boolean {
    return !!this.propiedad?.archivos?.length;
  }

  obtenerPrimeraImagen(): string | null {
    return this.propiedad?.archivos?.[0]?.url || null;
  }

  obtenerHabitaciones(): string {
    return this.propiedad.habitaciones?.toString() || 'N/A';
  }

  obtenerBanos(): string {
    return this.propiedad.banos?.toString() || 'N/A';
  }
}