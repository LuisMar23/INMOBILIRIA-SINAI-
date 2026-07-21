import { Component, inject, signal, OnInit } from '@angular/core';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';
import { UrbanizacionService } from '../../services/urbanizacion.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Galeria } from '../../../../components/galeria/galeria';
import { environment } from '../../../../../environments/environment';
import { UploadArchivosService } from '../../../../components/services/archivos.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-urbanizacion-detalle',
  imports: [RouterModule, Galeria, CommonModule],
  templateUrl: './urbanizacion-detalle.html',
  styleUrl: './urbanizacion-detalle.css',
})
export class UrbanizacionDetalle implements OnInit {
  urbanizacionSeleccionada = signal<UrbanizacionDto | null>(null);
  urlServer = environment.fileServer;
  private urbanizacionSvc = inject(UrbanizacionService);
  private notificationService = inject(NotificationService);
  private archivoService = inject(UploadArchivosService);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.cargarUrbanizacion(+id);
      }
    });
  }

  private cargarUrbanizacion(id: number): void {
    this.urbanizacionSvc.getById(id).subscribe({
      next: (resp) => {
        this.urbanizacionSeleccionada.set(resp);
      },
      error: (err) => {
        console.error('Error al cargar urbanización:', err);
        this.notificationService.showError('Error al cargar la urbanización');
      },
    });
  }

  eliminarImagen(id: number | undefined) {
    if (!id) return;
    this.notificationService
      .confirmDelete(`¿Está seguro de eliminar esta imagen?`)
      .then((result) => {
        if (result.isConfirmed) {
          this.archivoService.eliminarArchivo(id).subscribe({
            next: (resp) => {
              this.notificationService.showSuccess(`Se ha eliminado correctamente el archivo`);
              const urbanizacionActual = this.urbanizacionSeleccionada();
              if (urbanizacionActual?.id) {
                this.cargarUrbanizacion(urbanizacionActual.id);
              }
            },
            error: (err) => {
              this.notificationService.showError(err);
            },
          });
        }
      });
  }

  tieneMaps(): boolean {
    return (
      !!this.urbanizacionSeleccionada()?.maps &&
      this.urbanizacionSeleccionada()!.maps!.trim().length > 0
    );
  }

  abrirMaps() {
    const maps = this.urbanizacionSeleccionada()?.maps;
    if (maps) {
      window.open(maps, '_blank', 'noopener,noreferrer');
    } else {
      this.notificationService.showWarning('Esta urbanización no tiene ubicación en Google Maps');
    }
  }

  getEstadoLabel(estado: string): string {
    const estados: Record<string, string> = {
      VENTA: 'Venta',
      PRE_VENTA: 'Pre-Venta',
      POST_VENTA: 'Post-Venta',
    };
    return estados[estado] || estado;
  }
}
