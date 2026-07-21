import { Component, inject, signal } from '@angular/core';
import { PropiedadDto } from '../../../../core/interfaces/propiedad.interface';
import { PropiedadService } from '../../service/propiedad.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { environment } from '../../../../../environments/environment';
import { UploadArchivosService } from '../../../../components/services/archivos.service';
import { Galeria } from '../../../../components/galeria/galeria';

@Component({
  selector: 'app-propiedad-detail',
  imports: [CommonModule, RouterLink, Galeria],
  templateUrl: './propiedad-detail.html',
  styleUrl: './propiedad-detail.css',
  providers: [DatePipe],
})
export class PropiedadDetail {
  propiedadSeleccionada = signal<PropiedadDto | null>(null);
  private propiedadSvc = inject(PropiedadService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private archivoService = inject(UploadArchivosService);
  private datePipe = inject(DatePipe);
  urlServer = environment.fileServer;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.cargarPropiedad(+id);
      }
    });
  }

  private cargarPropiedad(id: number): void {
    this.propiedadSvc.getById(id).subscribe({
      next: (resp) => {
        console.log(resp);
        this.propiedadSeleccionada.set(resp);
      },
      error: (err) => {
        console.error('Error al cargar propiedad:', err);
        this.notificationService.showError('Error al cargar la propiedad');
      },
    });
  }

  tieneArchivos(): boolean {
    const propiedad = this.propiedadSeleccionada();
    return !!propiedad?.archivos && propiedad.archivos.length > 0;
  }

  getArchivos(): any[] {
    return this.propiedadSeleccionada()?.archivos || [];
  }

  getEstadoBadgeClass(estado: string): string {
    const classes = {
      DISPONIBLE: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      RESERVADO: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      VENDIDO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CON_OFERTA: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
      ALQUILADO: 'px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700',
      ANTICRETICO: 'px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700',
    };
    return classes[estado as keyof typeof classes] || classes['DISPONIBLE'];
  }

  getTipoBadgeClass(tipo: string): string {
    const classes = {
      CASA: 'px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700',
      CUARTO: 'px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700',
      DEPARTAMENTO: 'px-3 py-1 rounded-full text-xs font-bold bg-pink-100 text-pink-700',
      GARZONIER: 'px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700',
    };
    return classes[tipo as keyof typeof classes] || classes['CASA'];
  }

  getTipoInmuebleBadgeClass(tipoInmueble: string): string {
    const classes = {
      LOTE: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
      PROPIEDAD: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
    };
    return classes[tipoInmueble as keyof typeof classes] || classes['PROPIEDAD'];
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
              const propiedadActual = this.propiedadSeleccionada();
              if (propiedadActual?.id) {
                this.cargarPropiedad(propiedadActual.id);
              }
            },
            error: (err) => {
              this.notificationService.showError(err);
            },
          });
        }
      });
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || 'N/A';
    } catch {
      return 'N/A';
    }
  }
}
