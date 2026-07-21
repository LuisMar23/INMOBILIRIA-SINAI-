import { Component, inject, PLATFORM_ID, signal, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LoteService } from '../../services/lote.service';
import { Lote } from '../../../../core/interfaces/datos.interface';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-lote-detalle',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './lote-detalle.html',
  styleUrl: './lote-detalle.css',
})
export class LoteDetalle {
  lote = signal<Lote | null>(null);
  cargando = signal(true);
  lightboxOpen = signal(false);
  selectedImage = signal<string | null>(null);
  @ViewChild('swiperEl') swiperEl!: ElementRef;
  urlServer = environment.fileServer;
  contactoForm!: FormGroup;
  currentIndex = 0;
  totalImages = 0;
  zoomOpen = signal(false);

  constructor(
    private route: ActivatedRoute,
    private loteSvc: LoteService,
    private fb: FormBuilder,
    public sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.contactoForm = this.fb.group({
      nombre: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{8,15}$/)]],
      mensaje: ['Estoy interesado en este lote. ¿Podrían brindarme más información?'],
    });

    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.loteSvc.getByUuid(uuid).subscribe({
        next: (data) => {
          this.lote.set(data);
          this.totalImages = data.archivos?.length || 0;
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
    }
  }

  obtenerEstadoClase(estado: string) {
    return (
      {
        DISPONIBLE: 'bg-green-100 text-green-700',
        RESERVADO: 'bg-yellow-100 text-yellow-700',
      }[estado] || ''
    );
  }

  calcularPrecioConDescuento(precioBase: number, descuento: number): number {
    return precioBase * (1 - descuento / 100);
  }

  private platformId = inject(PLATFORM_ID);

  closeLightbox() {
    this.lightboxOpen.set(false);
    this.selectedImage.set(null);
  }

  enviarWhatsApp() {
    if (!isPlatformBrowser(this.platformId)) return;

    const lote = this.lote();

    if (this.contactoForm.invalid || !lote) return;

    const { nombre, telefono, mensaje } = this.contactoForm.value;

    let telefonoDestino = lote.encargado?.telefono || '74537051';

    telefonoDestino = telefonoDestino.replace(/\D/g, '');

    if (!telefonoDestino.startsWith('591')) {
      telefonoDestino = '591' + telefonoDestino;
    }

    const texto = `Hola, soy ${nombre}.\nTeléfono: ${telefono}\n\n${mensaje}\n\nEstoy interesado en el lote ${lote.numeroLote} en ${lote.ciudad}.`;

    const url = `https://wa.me/${telefonoDestino}?text=${encodeURIComponent(texto)}`;

    window.open(url, '_blank');
  }

  get mapaUrl(): string | null {
    const loteData = this.lote();
    if (loteData?.ubicacion) {
      return loteData.ubicacion;
    }
    return null;
  }

  prevImage() {
    if (!this.lote()?.archivos?.length) return;
    this.currentIndex =
      (this.currentIndex - 1 + this.lote()?.archivos.length) % this.lote()?.archivos.length;
  }

  nextImage() {
    if (!this.lote()?.archivos?.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.lote()?.archivos.length;
  }

  openZoom() {
    this.zoomOpen.set(true);
  }

  closeZoom() {
    this.zoomOpen.set(false);
  }
}
