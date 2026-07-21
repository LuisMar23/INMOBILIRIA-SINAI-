// src/app/modules/propiedades/pages/propiedades-lista/propiedades-lista.ts
import { Component, signal } from '@angular/core';
import {
  FiltrosPropiedad,
  Propiedad,
  VistaPropiedad,
} from '../../../../core/interfaces/datos.interface';
import { CommonModule } from '@angular/common';
import { PropiedadService } from '../../service/propiedad.service';
import { PropiedadCard } from '../../components/propiedad-card/propiedad-card';
import { PropiedadListItem } from '../../components/propiedad-list-item/propiedad-list-item';

@Component({
  selector: 'app-propiedades-lista',
  imports: [CommonModule, PropiedadCard, PropiedadListItem],
  templateUrl: './propiedad-lista.html',
  styleUrl: './propiedad-lista.css',
})
export class PropiedadesLista {
  propiedades = signal<Propiedad[]>([]);
  propiedadesFiltradas = signal<Propiedad[]>([]);
  vista = signal<VistaPropiedad>('grid');

  filtros: FiltrosPropiedad = {
    ciudad: '',
    precioMin: 0,
    precioMax: 9999999,
    tamanoMin: 0,
    tamanoMax: 9999999,
    tipoPropiedad: '',
    estadoPropiedad: '',
    estado: '',
    busqueda: '',
  };

  cargando = signal(false);

  constructor(private propiedadSvc: PropiedadService) {
    this.cargarPropiedades();
  }

  cargarPropiedades() {
    this.cargando.set(true);
    this.propiedadSvc.getAll().subscribe({
      next: (data) => {
        this.propiedades.set([...data]);
        this.propiedadesFiltradas.set([...data]);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error cargando propiedades:', err);
        this.cargando.set(false);
      },
    });
  }

  onBuscar(filtros: FiltrosPropiedad) {
    this.filtros = { ...filtros };
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    const f = {
      ciudad: (this.filtros.ciudad ?? '').toString().trim().toLowerCase(),
      precioMin: Number(this.filtros.precioMin ?? 0),
      precioMax: Number(this.filtros.precioMax ?? 9999999),
      tamanoMin: Number(this.filtros.tamanoMin ?? 0),
      tamanoMax: Number(this.filtros.tamanoMax ?? 9999999),
      tipoPropiedad: (this.filtros.tipoPropiedad ?? '').toString().trim(),
      estadoPropiedad: (this.filtros.estadoPropiedad ?? '').toString().trim(),
      estado: (this.filtros.estado ?? '').toString().trim(),
      busqueda: (this.filtros.busqueda ?? '').toString().trim().toLowerCase(),
    };

    const origen = this.propiedades();

    const filtrados = origen.filter((propiedad) => {
      const ciudad = (propiedad.ciudad ?? '').toString().trim().toLowerCase();
      const nombre = (propiedad.nombre ?? '').toString().toLowerCase();
      const descripcion = (propiedad.descripcion ?? '').toString().toLowerCase();

      const cumpleCiudad = f.ciudad.length === 0 || ciudad.includes(f.ciudad);
      const cumplePrecio =
        (propiedad.precio ?? 0) >= f.precioMin && (propiedad.precio ?? 0) <= f.precioMax;
      const cumpleTamano =
        (propiedad.tamano ?? 0) >= f.tamanoMin && (propiedad.tamano ?? 0) <= f.tamanoMax;
      const cumpleTipo = f.tipoPropiedad.length === 0 || propiedad.tipo === f.tipoPropiedad;
      const cumpleEstadoPropiedad =
        f.estadoPropiedad.length === 0 || propiedad.estadoPropiedad === f.estadoPropiedad;
      const cumpleEstado = f.estado.length === 0 || propiedad.estado === f.estado;
      const cumpleTexto =
        f.busqueda.length === 0 || nombre.includes(f.busqueda) || descripcion.includes(f.busqueda);

      return (
        cumpleCiudad &&
        cumplePrecio &&
        cumpleTamano &&
        cumpleTipo &&
        cumpleEstadoPropiedad &&
        cumpleEstado &&
        cumpleTexto
      );
    });

    this.propiedadesFiltradas.set(filtrados);
  }

  cambiarVista(v: VistaPropiedad) {
    this.vista.set(v);
  }
}