import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SedeService } from '../../service/sede.service';
import { SedeDto } from '../../../../core/interfaces/sede.interface';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-sede-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sede-list.html',
  styleUrls: ['./sede-list.css'],
})
export class SedeList implements OnInit {
  sedes = signal<SedeDto[]>([]);
  cargando = signal(true);
  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private sedeSvc = inject(SedeService);
  private notify = inject(NotificationService);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.sedeSvc.getAll().subscribe({
      next: (res) => {
        this.sedes.set(res);
        this.total.set(res.length);
        this.cargando.set(false);
      },
      error: () => {
        this.notify.showError('Error al cargar sedes');
        this.cargando.set(false);
      },
    });
  }

  eliminar(id: number, nombre: string) {
    this.notify.confirmDelete(`¿Eliminar la sede "${nombre}"?`).then((result) => {
      if (result.isConfirmed) {
        this.sedeSvc.delete(id).subscribe({
          next: () => {
            this.notify.showSuccess('Sede eliminada');
            this.cargar();
          },
          error: () => this.notify.showError('No se pudo eliminar la sede'),
        });
      }
    });
  }

  getSedesPaginadas(): SedeDto[] {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sedes().slice(start, start + this.pageSize());
  }

  totalPages(): number {
    return Math.ceil(this.sedes().length / this.pageSize());
  }

  pageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  rangeStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    const end = this.currentPage() * this.pageSize();
    const totalFiltered = this.sedes().length;
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
