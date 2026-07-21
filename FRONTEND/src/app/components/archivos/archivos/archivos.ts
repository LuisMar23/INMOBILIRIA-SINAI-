import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UploadArchivosService } from '../../services/archivos.service';

interface PreviewArchivo {
  url: string;
  nombre: string;
  tipo: 'imagen' | 'archivo';
}

@Component({
  selector: 'app-archivos',
  imports: [],
  templateUrl: './archivos.html',
  styleUrl: './archivos.css',
})
export class ArchivosComponent {
  @Input() ventaId?: number;
  @Input() reservaId?: number;
  @Input() loteId?: number;
  @Input() urbanizacionId?: number;
  @Input() propiedadId?: number;
  @Input() modo: 'crear' | 'actualizar' = 'crear';
  @Output() subidaCompleta = new EventEmitter<any>();

  archivosSeleccionados: File[] = [];
  previsualizaciones: PreviewArchivo[] = [];
  cargando = false;

  constructor(private uploadService: UploadArchivosService) {}

  onSeleccionarArchivos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    const nuevosArchivos = Array.from(files);
    nuevosArchivos.forEach((file) => {
      const esImagen = file.type.startsWith('image/');

      if (esImagen) {
        const objectUrl = URL.createObjectURL(file);

        this.previsualizaciones.push({
          url: objectUrl,
          nombre: file.name,
          tipo: 'imagen',
        });
      } else {
        this.previsualizaciones.push({
          url: '',
          nombre: file.name,
          tipo: 'archivo',
        });
      }
    });

    this.archivosSeleccionados.push(...nuevosArchivos);

    input.value = '';
  }

  eliminarPrevisualizacion(index: number): void {
    if (
      this.previsualizaciones[index].tipo === 'imagen' &&
      this.previsualizaciones[index].url.startsWith('blob:')
    ) {
      URL.revokeObjectURL(this.previsualizaciones[index].url);
    }
    this.previsualizaciones.splice(index, 1);
    this.archivosSeleccionados.splice(index, 1);
  }

  subirArchivos(): void {
    if (this.archivosSeleccionados.length === 0) return;

    this.cargando = true;

    const opciones = {
      ventaId: this.ventaId,
      reservaId: this.reservaId,
      loteId: this.loteId,
      urbanizacionId: this.urbanizacionId,
      propiedadId: this.propiedadId,
    };

    const request =
      this.modo === 'actualizar'
        ? this.uploadService.actualizarArchivos(this.archivosSeleccionados, opciones)
        : this.uploadService.subirArchivos(this.archivosSeleccionados, opciones);

    request.subscribe({
      next: (res) => {
        this.limpiarSeleccion();
        this.cargando = false;
        this.subidaCompleta.emit(res);
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error al subir archivos:', err);
      },
    });
  }

  limpiarSeleccion(): void {
    this.previsualizaciones.forEach((preview) => {
      if (preview.tipo === 'imagen' && preview.url.startsWith('blob:')) {
        URL.revokeObjectURL(preview.url);
      }
    });

    this.archivosSeleccionados = [];
    this.previsualizaciones = [];
  }

  ngOnDestroy(): void {
    this.limpiarSeleccion();
  }
}
