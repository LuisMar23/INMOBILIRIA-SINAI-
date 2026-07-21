import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FiltrosLote } from '../../../../core/interfaces/datos.interface';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-filtro-lotes',
  imports: [FormsModule],
  templateUrl: './filtro-lotes.html',
  styleUrl: './filtro-lotes.css',
})
export class FiltroLotes implements OnInit, OnDestroy {
  @Input() filtros!: FiltrosLote;
  @Output() buscar = new EventEmitter<FiltrosLote>();

  private cambios$ = new Subject<FiltrosLote>();
  private sub?: Subscription;

  ngOnInit() {
    this.sub = this.cambios$.pipe(debounceTime(300)).subscribe(f => {
      this.buscar.emit({ ...f });
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  onCambioTexto() {
    const normalizados: FiltrosLote = {
      ciudad: (this.filtros.ciudad ?? '').toString().trim(),
      precioMin: this.filtros.precioMin ?? 0,
      precioMax: this.filtros.precioMax ?? 9999999,
      superficieMin: this.filtros.superficieMin ?? 0,
      superficieMax: this.filtros.superficieMax ?? 9999999,
      estado: this.filtros.estado ?? '',
      busqueda: (this.filtros.busqueda ?? '').toString().trim()
    };

    this.cambios$.next(normalizados);
  }

  onCambioInstantaneo() {
    const normalizados = this.normalizar();
    this.buscar.emit({ ...normalizados });
  }

  private normalizar(): FiltrosLote {
    return {
      ciudad: (this.filtros.ciudad ?? '').trim(),
      precioMin: this.filtros.precioMin ?? 0,
      precioMax: this.filtros.precioMax ?? 9999999,
      superficieMin: this.filtros.superficieMin ?? 0,
      superficieMax: this.filtros.superficieMax ?? 9999999,
      estado: this.filtros.estado ?? '',
      busqueda: (this.filtros.busqueda ?? '').toString().trim()
    };
  }

  limpiar() {
    const defaults: FiltrosLote = {
      ciudad: '',
      precioMin: 0,
      precioMax: 9999999,
      superficieMin: 0,
      superficieMax: 9999999,
      estado: '',
      busqueda: '',
    };

    this.filtros = { ...defaults };
    this.buscar.emit({ ...this.filtros });
  }
}