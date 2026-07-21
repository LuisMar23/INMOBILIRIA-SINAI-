import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ManzanoService } from '../../service/manzano.service';
import { ManzanoDto } from '../../../../core/interfaces/manzano.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';

@Component({
  selector: 'app-manzano-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './manzano-list.html',
  styleUrls: ['./manzano-list.css'],
})
export class ManzanoList implements OnInit {
  allManzanos = signal<ManzanoDto[]>([]);
  cargando = signal(true);
  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private manzanoSvc = inject(ManzanoService);
  private notify = inject(NotificationService);
  private urbanizacionContext = inject(UrbanizacionContextService);

  manzanos = computed(() => {
    const urbanizacionActiva = this.urbanizacionContext.urbanizacion();
    let lista = this.allManzanos();

    if (urbanizacionActiva) {
      lista = lista.filter((m) => m.urbanizacionId === urbanizacionActiva.id);
    }

    return lista;
  });

  ngOnInit() {
    this.urbanizacionContext.recuperar();
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.manzanoSvc.getAll().subscribe({
      next: (res) => {
        this.allManzanos.set(res);
        this.total.set(res.length);
        this.cargando.set(false);
      },
      error: () => {
        this.notify.showError('Error al cargar manzanos');
        this.cargando.set(false);
      },
    });
  }

  eliminar(id: number, nombre: string) {
    this.notify.confirmDelete(`¿Eliminar el manzano "${nombre}"?`).then((result) => {
      if (result.isConfirmed) {
        this.manzanoSvc.delete(id).subscribe({
          next: () => {
            this.notify.showSuccess('Manzano eliminado');
            this.cargar();
          },
          error: () => this.notify.showError('No se pudo eliminar el manzano'),
        });
      }
    });
  }

  getLotesPaginados(): ManzanoDto[] {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.manzanos().slice(start, start + this.pageSize());
  }

  totalPages(): number {
    return Math.ceil(this.manzanos().length / this.pageSize());
  }

  pageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  rangeStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    const end = this.currentPage() * this.pageSize();
    const totalFiltered = this.manzanos().length;
    return end > totalFiltered ? totalFiltered : end;
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update((v) => v + 1);
  }

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update((v) => v - 1);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }
}
