// src/app/modules/propiedades/pages/propiedad-detalle/propiedad-detalle.ts
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Propiedad } from '../../../../core/interfaces/datos.interface';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { DomSanitizer } from '@angular/platform-browser';
import { SafeUrlPipe } from '../../../lotes/pages/lote-detalle/safe-url.pipe';
import { PropiedadService } from '../../service/propiedad.service';

@Component({
  selector: 'app-propiedad-detalle',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SafeUrlPipe],
  templateUrl: './propiedad-detalle.html',
  styleUrl: './propiedad-detalle.css',
})
export class PropiedadDetalle {
  propiedad = signal<Propiedad | null>(null);
  cargando = signal(true);
  urlServer = environment.fileServer;
  contactoForm!: FormGroup;
  currentIndex = 0;
  zoomOpen = signal(false);

  constructor(
    private route: ActivatedRoute,
    private propiedadSvc: PropiedadService,
    private fb: FormBuilder,
    public sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.contactoForm = this.fb.group({
      nombre: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{8,15}$/)]],
      mensaje: ['Estoy interesado en esta propiedad. ¿Podrían brindarme más información?'],
    });

    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.propiedadSvc.getByUuid(uuid).subscribe({
        next: (data) => {
          this.propiedad.set(data);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error cargando propiedad:', err);
          this.cargando.set(false);
        },
      });
    }
  }

  obtenerEstadoClase(estado: string) {
    return (
      {
        DISPONIBLE: 'bg-green-100 text-green-700',
        RESERVADO: 'bg-yellow-100 text-yellow-700',
        VENDIDO: 'bg-red-100 text-red-700',
      }[estado] || ''
    );
  }

  obtenerTipoPropiedadClase(tipo: string) {
    return (
      {
        CASA: 'bg-blue-100 text-blue-700',
        DEPARTAMENTO: 'bg-purple-100 text-purple-700',
        GARZONIER: 'bg-orange-100 text-orange-700',
        CUARTO: 'bg-gray-100 text-gray-700',
      }[tipo] || ''
    );
  }

  obtenerEstadoPropiedadClase(estado: string) {
    return (
      {
        VENTA: 'bg-emerald-100 text-emerald-700',
        ALQUILER: 'bg-cyan-100 text-cyan-700',
        ANTICREDITO: 'bg-amber-100 text-amber-700',
      }[estado] || ''
    );
  }

  private platformId = inject(PLATFORM_ID);

  enviarWhatsApp() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.contactoForm.invalid || !this.propiedad()) return;

    const { nombre, telefono, mensaje } = this.contactoForm.value;
    const propiedad = this.propiedad()!;
    const texto = `Hola, soy ${nombre}.\nTeléfono: ${telefono}\n\n${mensaje}\n\nEstoy interesado en la propiedad ${propiedad.nombre} en ${propiedad.ciudad}.`;
    const url = `https://wa.me/59174537051?text=${encodeURIComponent(texto)}`;

    window.open(url, '_blank');
  }

  get mapaUrl(): string | null {
    const propiedadData = this.propiedad();
    if (propiedadData?.latitud && propiedadData?.longitud) {
      return `https://www.google.com/maps?q=${propiedadData.latitud},${propiedadData.longitud}&output=embed`;
    } else if (propiedadData?.ubicacion) {
      return propiedadData.ubicacion;
    }
    return null;
  }

  get esEmbed(): boolean {
    const propiedadData = this.propiedad();
    return !!(propiedadData?.latitud && propiedadData?.longitud);
  }

  prevImage() {
    if (!this.propiedad()?.archivos?.length) return;
    this.currentIndex =
      (this.currentIndex - 1 + this.propiedad()!.archivos!.length) %
      this.propiedad()!.archivos!.length;
  }

  nextImage() {
    if (!this.propiedad()?.archivos?.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.propiedad()!.archivos!.length;
  }

  openZoom() {
    this.zoomOpen.set(true);
  }

  closeZoom() {
    this.zoomOpen.set(false);
  }

  obtenerPrimeraImagen(): string | null {
    const propiedad = this.propiedad();
    return propiedad?.archivos?.[0]?.url || null;
  }

  obtenerImagenActual(): string | null {
    const propiedad = this.propiedad();
    return propiedad?.archivos?.[this.currentIndex]?.url || null;
  }

  obtenerNombreImagenActual(): string {
    const propiedad = this.propiedad();
    return propiedad?.archivos?.[this.currentIndex]?.nombre || 'Imagen de propiedad';
  }

  obtenerDescripcion(): string {
    return this.propiedad()?.descripcion || '';
  }

  tieneDescripcion(): boolean {
    return !!this.propiedad()?.descripcion;
  }

  tieneArchivos(): boolean {
    return !!this.propiedad()?.archivos?.length;
  }

  obtenerCantidadArchivos(): number {
    return this.propiedad()?.archivos?.length || 0;
  }
}