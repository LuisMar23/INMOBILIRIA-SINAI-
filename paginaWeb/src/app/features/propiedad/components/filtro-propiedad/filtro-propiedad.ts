// src/app/modules/propiedades/components/filtro-propiedades/filtro-propiedades.ts
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import {
  FiltrosPropiedad,
  TipoPropiedad,
  EstadoPropiedad,
  EstadoInmueble,
} from '../../../../core/interfaces/datos.interface';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-filtro-propiedades',
  imports: [FormsModule],
  templateUrl: './filtro-propiedad.html',
  styleUrl: './filtro-propiedad.css',
})
export class FiltroPropiedades implements OnInit, OnDestroy {
  @Input() filtros!: FiltrosPropiedad;
  @Output() buscar = new EventEmitter<FiltrosPropiedad>();

  tiposPropiedad = Object.values(TipoPropiedad);
  estadosPropiedad = Object.values(EstadoPropiedad);
  estadosInmueble = Object.values(EstadoInmueble).filter(estado => estado !== 'VENDIDO');

  private cambios$ = new Subject<FiltrosPropiedad>();
  private sub?: Subscription;

  ngOnInit() {
    this.sub = this.cambios$.pipe(debounceTime(300)).subscribe((f) => {
      this.buscar.emit({ ...f });
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  onCambioTexto() {
    const normalizados: FiltrosPropiedad = {
      ciudad: (this.filtros.ciudad ?? '').toString().trim(),
      precioMin: this.filtros.precioMin ?? 0,
      precioMax: this.filtros.precioMax ?? 9999999,
      tamanoMin: this.filtros.tamanoMin ?? 0,
      tamanoMax: this.filtros.tamanoMax ?? 9999999,
      tipoPropiedad: this.filtros.tipoPropiedad ?? '',
      estadoPropiedad: this.filtros.estadoPropiedad ?? '',
      estado: this.filtros.estado ?? '',
      busqueda: (this.filtros.busqueda ?? '').toString().trim(),
    };

    this.cambios$.next(normalizados);
  }

  onCambioInstantaneo() {
    const normalizados = this.normalizar();
    this.buscar.emit({ ...normalizados });
  }

  private normalizar(): FiltrosPropiedad {
    return {
      ciudad: (this.filtros.ciudad ?? '').trim(),
      precioMin: this.filtros.precioMin ?? 0,
      precioMax: this.filtros.precioMax ?? 9999999,
      tamanoMin: this.filtros.tamanoMin ?? 0,
      tamanoMax: this.filtros.tamanoMax ?? 9999999,
      tipoPropiedad: this.filtros.tipoPropiedad ?? '',
      estadoPropiedad: this.filtros.estadoPropiedad ?? '',
      estado: this.filtros.estado ?? '',
      busqueda: (this.filtros.busqueda ?? '').toString().trim(),
    };
  }

  limpiar() {
    const defaults: FiltrosPropiedad = {
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

    this.filtros = { ...defaults };
    this.buscar.emit({ ...this.filtros });
  }
}