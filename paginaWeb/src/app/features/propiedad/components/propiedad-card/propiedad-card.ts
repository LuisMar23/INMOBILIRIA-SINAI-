// src/app/modules/propiedades/components/propiedad-card/propiedad-card.ts
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Propiedad } from '../../../../core/interfaces/datos.interface';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { PropiedadService } from '../../service/propiedad.service';

@Component({
  selector: 'app-propiedad-card',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './propiedad-card.html',
  styleUrl: './propiedad-card.css',
})
export class PropiedadCard implements OnInit {
  urlServer = environment.fileServer;
  private propiedadSvc = inject(PropiedadService);

  propiedades = signal<Propiedad[]>([]);

  filtroCiudad = signal('');
  filtroPrecioMin = signal<number>(0);
  filtroPrecioMax = signal<number>(9999999);
  filtroTipo = signal('');
  filtroEstadoPropiedad = signal('');
  filtroEstado = signal('');

  propiedadesFiltradas = computed(() => {
    const origen = this.propiedades();

    if (!Array.isArray(origen)) return [];

    const ciudad = this.filtroCiudad().trim().toLowerCase();
    const precioMin = this.filtroPrecioMin();
    const precioMax = this.filtroPrecioMax();
    const tipo = this.filtroTipo();
    const estadoPropiedad = this.filtroEstadoPropiedad();
    const estado = this.filtroEstado();

    const aplicarCiudad = ciudad !== '';
    const aplicarPrecioMin = precioMin !== null && precioMin !== 0;
    const aplicarPrecioMax = precioMax !== 9999999;
    const aplicarTipo = tipo !== '';
    const aplicarEstadoPropiedad = estadoPropiedad !== '';
    const aplicarEstado = estado !== '';

    if (
      !aplicarCiudad &&
      !aplicarPrecioMin &&
      !aplicarPrecioMax &&
      !aplicarTipo &&
      !aplicarEstadoPropiedad &&
      !aplicarEstado
    ) {
      return origen;
    }

    return origen.filter((propiedad) => {
      if (!propiedad) return false;

      const propiedadCiudad = (propiedad.ciudad || '').toLowerCase();
      const propiedadPrecio = propiedad.precio ?? 0;
      const propiedadTipo = propiedad.tipo ?? '';
      const propiedadEstadoPropiedad = propiedad.estadoPropiedad ?? '';
      const propiedadEstado = propiedad.estado ?? '';

      const okCiudad = !aplicarCiudad || propiedadCiudad.includes(ciudad);
      const okPrecioMin = !aplicarPrecioMin || propiedadPrecio >= precioMin;
      const okPrecioMax = !aplicarPrecioMax || propiedadPrecio <= precioMax;
      const okTipo = !aplicarTipo || propiedadTipo === tipo;
      const okEstadoPropiedad =
        !aplicarEstadoPropiedad || propiedadEstadoPropiedad === estadoPropiedad;
      const okEstado = !aplicarEstado || propiedadEstado === estado;

      return okCiudad && okPrecioMin && okPrecioMax && okTipo && okEstadoPropiedad && okEstado;
    });
  });

  ngOnInit() {
    this.cargarPropiedades();
  }

  cargarPropiedades() {
    this.propiedadSvc.getAll().subscribe({
      next: (data) => {
        this.propiedades.set(data || []);
      },
      error: (err) => {
        console.error('Error cargando propiedades:', err);
        this.propiedades.set([]);
      },
    });
  }

  actualizarCiudad(valor: string) {
    this.filtroCiudad.set(valor);
  }

  actualizarPrecioMin(valor: number | null) {
    this.filtroPrecioMin.set(valor ?? 0);
  }

  actualizarPrecioMax(valor: number | null) {
    this.filtroPrecioMax.set(valor ?? 9999999);
  }

  actualizarTipo(valor: string) {
    this.filtroTipo.set(valor);
  }

  actualizarEstadoPropiedad(valor: string) {
    this.filtroEstadoPropiedad.set(valor);
  }

  actualizarEstado(valor: string) {
    this.filtroEstado.set(valor);
  }

  limpiarFiltros() {
    this.filtroCiudad.set('');
    this.filtroPrecioMin.set(0);
    this.filtroPrecioMax.set(9999999);
    this.filtroTipo.set('');
    this.filtroEstadoPropiedad.set('');
    this.filtroEstado.set('');
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

  obtenerPrimeraImagen(propiedad: Propiedad): string | null {
    return propiedad.archivos?.[0]?.url || null;
  }
}