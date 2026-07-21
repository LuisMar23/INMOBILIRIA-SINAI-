import { Component, effect, inject, signal } from '@angular/core';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { LoteService } from '../../service/lote.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../environments/environment';
import { UploadArchivosService } from '../../../../components/services/archivos.service';
import { Galeria } from '../../../../components/galeria/galeria';

@Component({
  selector: 'app-lote-detail',
  imports: [CommonModule, RouterLink, Galeria],
  templateUrl: './lote-detail.html',
  styleUrl: './lote-detail.css',
})
export class LoteDetail {
  loteSeleccionado = signal<LoteDto | null>(null);
  private loteSvc = inject(LoteService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private archivoService = inject(UploadArchivosService);
  urlServer = environment.fileServer;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.cargarLote(+id);
      }
    });
  }

  private cargarLote(id: number): void {
    this.loteSvc.getById(id).subscribe({
      next: (resp) => {
        console.log(resp);
        this.loteSeleccionado.set(resp);
      },
      error: (err) => {
        console.error('Error al cargar lote:', err);
        this.notificationService.showError('Error al cargar el lote');
      },
    });
  }

  getEstadoBadgeClass(estado: string): string {
    const classes = {
      DISPONIBLE: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      RESERVADO: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      VENDIDO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CON_OFERTA: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
    };
    return classes[estado as keyof typeof classes] || classes['DISPONIBLE'];
  }

  eliminarImagen(id: number | undefined) {
    console.log(id);
    if (!id) return;

    this.notificationService
      .confirmDelete(`¿Está seguro de eliminar esta imagen?`)
      .then((result) => {
        if (result.isConfirmed) {
          this.archivoService.eliminarArchivo(id).subscribe({
            next: (resp) => {
              this.notificationService.showSuccess(`Se ha eliminado correctamente el archivo`);
              const loteActual = this.loteSeleccionado();
              if (loteActual?.id) {
                this.cargarLote(loteActual.id);
              }
            },
            error: (err) => {
              this.notificationService.showError(err);
            },
          });
        }
      });
  }
}
