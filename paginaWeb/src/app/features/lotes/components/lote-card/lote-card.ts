import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { Lote } from '../../../../core/interfaces/datos.interface';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { LoteService } from '../../services/lote.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-lote-card',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './lote-card.html',
  styleUrl: './lote-card.css',
})
export class LoteCard implements OnInit {
  urlServer = environment.fileServer;
  private loteSvc = inject(LoteService);

  lotes = signal<Lote[]>([]);
  
  filtroCiudad = signal('');
  filtroPrecioMin = signal<number>(0);
  filtroPrecioMax = signal<number>(9999999);
  filtroEstado = signal('');

  lotesFiltrados = computed(() => {
    const origen = this.lotes();

    if (!Array.isArray(origen)) return [];

    const ciudad = this.filtroCiudad().trim().toLowerCase();
    const precioMin = this.filtroPrecioMin();
    const precioMax = this.filtroPrecioMax();
    const estado = this.filtroEstado();

    const aplicarCiudad = ciudad !== '';
    const aplicarPrecioMin = precioMin !== null && precioMin !== 0;
    const aplicarPrecioMax = precioMax !== 9999999;
    const aplicarEstado = estado !== '';

    if (!aplicarCiudad && !aplicarPrecioMin && !aplicarPrecioMax && !aplicarEstado) {
      return origen;
    }

    return origen.filter((lote) => {
      if (!lote) return false;

      const loteCiudad = (lote.ciudad || '').toLowerCase();
      const lotePrecio = lote.precioBase ?? 0;
      const loteEstado = lote.estado ?? '';

      const okCiudad = !aplicarCiudad || loteCiudad.includes(ciudad);
      const okPrecioMin = !aplicarPrecioMin || lotePrecio >= precioMin;
      const okPrecioMax = !aplicarPrecioMax || lotePrecio <= precioMax;
      const okEstado = !aplicarEstado || loteEstado === estado;

      return okCiudad && (okPrecioMin && okPrecioMax) && okEstado;
    });
  });

  ngOnInit() {
    this.cargarLotes();
  }

  cargarLotes() {
    this.loteSvc.getAll().subscribe({
      next: (data) => {
        this.lotes.set(data || []);
      },
      error: (err) => {
        console.error('Error cargando lotes:', err);
        this.lotes.set([]);
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

  actualizarEstado(valor: string) {
    this.filtroEstado.set(valor);
  }

  limpiarFiltros() {
    this.filtroCiudad.set('');
    this.filtroPrecioMin.set(0);
    this.filtroPrecioMax.set(9999999);
    this.filtroEstado.set('');
  }
}