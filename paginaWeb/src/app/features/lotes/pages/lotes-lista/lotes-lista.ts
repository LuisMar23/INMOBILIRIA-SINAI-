import { Component, ComponentRef, signal, viewChild, ViewContainerRef } from '@angular/core';
import { FiltrosLote, Lote, VistaLote } from '../../../../core/interfaces/datos.interface';
import { LoteService } from '../../services/lote.service';
import { LoteCard } from '../../components/lote-card/lote-card';
import { LoteListItem } from '../../components/lote-list-item/lote-list-item';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lotes-lista',
  imports: [LoteCard, LoteListItem, CommonModule],
  templateUrl: './lotes-lista.html',
  styleUrl: './lotes-lista.css',
})
export class LotesLista {
  lotes = signal<Lote[]>([]);
  lotesFiltrados = signal<Lote[]>([]);
  vista = signal<VistaLote>('grid');

  mapaContainer = viewChild('mapaContainer', { read: ViewContainerRef });
  private mapaComponentRef?: ComponentRef<any>;

  filtros: FiltrosLote = {
    ciudad: '',
    precioMin: 0,
    precioMax: 9999999,
    superficieMin: 0,
    superficieMax: 9999999,
    estado: '',
    busqueda: '',
  };

  cargando = signal(false);

  constructor(private loteSvc: LoteService) {
    this.cargarLotes();
  }

  cargarLotes() {
    this.cargando.set(true);
    this.loteSvc.getAll().subscribe({
      next: (data) => {
        this.lotes.set([...data]);
        this.lotesFiltrados.set([...data]);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.cargando.set(false);
      },
    });
  }

  onBuscar(filtros: FiltrosLote) {
    this.filtros = { ...filtros };
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    const f = {
      ciudad: (this.filtros.ciudad ?? '').toString().trim().toLowerCase(),
      precioMin: Number(this.filtros.precioMin ?? 0),
      precioMax: Number(this.filtros.precioMax ?? 9999999),
      superficieMin: Number(this.filtros.superficieMin ?? 0),
      superficieMax: Number(this.filtros.superficieMax ?? 9999999),
      estado: (this.filtros.estado ?? '').toString().trim(),
      busqueda: (this.filtros.busqueda ?? '').toString().trim().toLowerCase(),
    };

    const origen = this.lotes();

    const filtrados = origen.filter((lote) => {
      const ciudad = (lote.ciudad ?? '').toString().trim().toLowerCase();
      const numeroLote = (lote.numeroLote ?? '').toString().toLowerCase();
      const descripcion = (lote.descripcion ?? '').toString().toLowerCase();
      const manzano = (lote.manzano ?? '').toString().toLowerCase();

      const cumpleCiudad = f.ciudad.length === 0 || ciudad.includes(f.ciudad);
      const cumplePrecio =
        (lote.precioBase ?? 0) >= f.precioMin && (lote.precioBase ?? 0) <= f.precioMax;
      const cumpleSup =
        (lote.superficieM2 ?? 0) >= f.superficieMin && (lote.superficieM2 ?? 0) <= f.superficieMax;
      const cumpleEstado = f.estado.length === 0 || lote.estado === f.estado;
      const cumpleTexto =
        f.busqueda.length === 0 ||
        numeroLote.includes(f.busqueda) ||
        descripcion.includes(f.busqueda) ||
        manzano.includes(f.busqueda);

      return cumpleCiudad && cumplePrecio && cumpleSup && cumpleEstado && cumpleTexto;
    });

    this.lotesFiltrados.set(filtrados);

    if (this.mapaComponentRef) {
      this.mapaComponentRef.setInput('lotes', this.lotesFiltrados());
    }
  }

  cambiarVista(v: VistaLote) {
    this.vista.set(v);

    if (v === 'map' && !this.mapaComponentRef) {
      setTimeout(() => this.cargarVistaMapa(), 0);
    }

    if (v === 'map' && this.mapaComponentRef) {
      this.mapaComponentRef.setInput('lotes', this.lotesFiltrados());
    }
  }

  private async cargarVistaMapa() {
    const container = this.mapaContainer();
    if (!container) {
      console.error('Container del mapa no encontrado');
      return;
    }

    try {
      const { VistaMapa } = await import('../../components/vista-mapa/vista-mapa');
      this.mapaComponentRef = container.createComponent(VistaMapa);
      this.mapaComponentRef.setInput('lotes', this.lotesFiltrados());
    } catch (error) {
      console.error('Error cargando vista mapa:', error);
    }
  }
}