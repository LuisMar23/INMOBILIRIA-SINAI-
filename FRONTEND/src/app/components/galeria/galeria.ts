import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
export interface ArchivoPreview {
  id?: number;
  urlArchivo: string;
  nombreArchivo: string;
  tipoArchivo: string;
}

@Component({
  selector: 'app-galeria',
  imports: [CommonModule],
  templateUrl: './galeria.html',
  styleUrl: './galeria.css'
})
export class Galeria {
  @Input() archivos: ArchivoPreview[] = [];
  @Input() urlServer: string = '';
  
 ngOnInit() {
  console.log('🖼️ URL Server:', this.urlServer);
  console.log('📦 Total archivos:', this.archivos.length);
  console.log(this.archivos)
  this.archivos.forEach((archivo, index) => {
    console.log(`📄 Archivo ${index + 1}:`, {
      nombreArchivo: archivo.nombreArchivo,
      tipoArchivo: archivo.tipoArchivo,
      urlArchivo: archivo.urlArchivo,
      esImagen: this.esImagen(archivo.tipoArchivo),
      urlCompleta: this.urlServer + archivo.urlArchivo
    });
  });
}

  @Output() eliminar = new EventEmitter<number | undefined>();

  onEliminar(id?: number) {
    this.eliminar.emit(id);
  }

  // Verificar si es imagen
esImagen(tipoArchivo: string): boolean {
  if (!tipoArchivo) return false;
  const tipo = tipoArchivo.toLowerCase();
  return tipo.includes('image') || tipo.includes('jpeg') || tipo.includes('jpg') || tipo.includes('png');
}

descargarArchivo(archivo: ArchivoPreview) {
  const url = this.urlServer + archivo.urlArchivo;
  const nombre = archivo.nombreArchivo || 'archivo';

  fetch(url, { method: 'GET' })
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    })
    .catch(err => console.error('Error al descargar archivo:', err));
}

}