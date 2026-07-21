import { Component, computed, inject, signal, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { UrbanizacionService } from '../../services/urbanizacion.service';
import { SedeService } from '../../../sede/service/sede.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ArchivosComponent } from '../../../../components/archivos/archivos/archivos';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';
import { AuthService } from '../../../../components/services/auth.service';
import { SedeDto } from '../../../../core/interfaces/sede.interface';

@Component({
  selector: 'app-urbanizacion-list',
  standalone: true,
  imports: [
    FontAwesomeModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ArchivosComponent,
    RouterModule,
  ],
  templateUrl: './urbanizacion-list.html',
})
export class UrbanizacionList implements OnInit {
  urbanizaciones = signal<UrbanizacionDto[]>([]);
  allUrbanizaciones = signal<UrbanizacionDto[]>([]);
  searchTerm = signal('');
  showModal = signal(false);
  showDetailModal = signal(false);
  cargando = signal(true);
  urbanizacionSeleccionada = signal<UrbanizacionDto | null>(null);
  sedesList = signal<SedeDto[]>([]);

  columns = [
    { key: 'id', label: 'N°', sortable: true },
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'ubicacion', label: 'Ubicación', sortable: true },
    { key: 'ciudad', label: 'Ciudad', sortable: true },
    { key: 'descripcion', label: 'Descripción', sortable: true },
  ];

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);
  sortColumn = signal<string>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  form: FormGroup;

  private notificationService = inject(NotificationService);
  private urbanizacionService = inject(UrbanizacionService);
  private sedeService = inject(SedeService);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  currentUser = this.authService.getCurrentUser();

  constructor() {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      ubicacion: ['', Validators.required],
      ciudad: ['', Validators.required],
      descripcion: [''],
      maps: [''],
      sedeId: [null],
      superficieTotal: [null],
      // estado: ['VENTA'],
      colindanciaNorte: [''],
      colindanciaEste: [''],
      colindanciaSur: [''],
      colindanciaOeste: [''],
    });
  }

  ngOnInit(): void {
    this.loadUrbanizaciones();
    this.loadSedes();
  }

  loadSedes() {
    this.sedeService.getAll().subscribe({
      next: (sedes) => this.sedesList.set(sedes),
      error: () => this.notificationService.showError('Error al cargar sedes'),
    });
  }

  loadUrbanizaciones() {
    this.cargando.set(true);
    this.urbanizacionService.getAll(this.currentPage(), this.pageSize()).subscribe({
      next: (res) => {
        this.urbanizaciones.set(res.data);
        this.allUrbanizaciones.set(res.data);
        this.total.set(res.pagination?.total || res.data.length);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar urbanizaciones:', err);
        this.notificationService.showError('Error al cargar urbanizaciones');
        this.cargando.set(false);
      },
    });
  }

  filteredUrbanizaciones = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let urbanizaciones = this.allUrbanizaciones();

    if (term) {
      urbanizaciones = urbanizaciones.filter(
        (u) =>
          u.nombre.toLowerCase().includes(term) ||
          u.ubicacion.toLowerCase().includes(term) ||
          u.ciudad.toLowerCase().includes(term) ||
          (u.descripcion ?? '').toLowerCase().includes(term),
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return urbanizaciones;

    return [...urbanizaciones].sort((a, b) => {
      let aValue: any = a[column as keyof UrbanizacionDto];
      let bValue: any = b[column as keyof UrbanizacionDto];

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aString = aValue.toString().toLowerCase();
      const bString = bValue.toString().toLowerCase();

      if (direction === 'asc') {
        return aString.localeCompare(bString);
      } else {
        return bString.localeCompare(aString);
      }
    });
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos');
      return;
    }

    const data = this.form.value;
    this.urbanizacionService.create(data).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.notificationService.showSuccess('Urbanización creada correctamente');
          this.loadUrbanizaciones();
          this.cancelEdit();
        } else {
          this.notificationService.showError('Error al crear urbanización');
        }
      },
      error: (err) => {
        console.error('Error al crear urbanización:', err);
        this.notificationService.showError('Error al crear urbanización');
      },
    });
  }

  openModal() {
    this.showModal.set(true);
    this.form.reset({
      estado: 'VENTA',
      sedeId: null,
      superficieTotal: null,
      colindanciaNorte: '',
      colindanciaEste: '',
      colindanciaSur: '',
      colindanciaOeste: '',
    });
  }

  cancelEdit() {
    this.showModal.set(false);
    this.form.reset();
  }

  verDetalles(urbanizacion: UrbanizacionDto) {
    this.urbanizacionSeleccionada.set(urbanizacion);
    this.showDetailModal.set(true);
  }

  cerrarModalDetalles() {
    this.showDetailModal.set(false);
    this.urbanizacionSeleccionada.set(null);
  }

  delete(data: UrbanizacionDto) {
    this.notificationService
      .confirmDelete(`¿Eliminar la urbanización ${data.nombre}?`)
      .then((result) => {
        if (result.isConfirmed) {
          this.urbanizacionService.delete(data.id!).subscribe({
            next: (response: any) => {
              if (response.success) {
                this.notificationService.showSuccess('Urbanización eliminada correctamente');
                this.loadUrbanizaciones();
              } else {
                this.notificationService.showError('Error al eliminar urbanización');
              }
            },
            error: (err) => {
              console.error('Error al eliminar urbanización:', err);
              this.notificationService.showError('Error al eliminar urbanización');
            },
          });
        }
      });
  }

  sort(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  getClaseFlecha(columna: string): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((v) => v + 1);
      this.loadUrbanizaciones();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((v) => v - 1);
      this.loadUrbanizaciones();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadUrbanizaciones();
    }
  }

  totalPages() {
    return Math.ceil(this.total() / this.pageSize());
  }

  pageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  rangeStart(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    const end = this.currentPage() * this.pageSize();
    return end > this.total() ? this.total() : end;
  }

  mostrarUploader = signal(false);
  abrirModalSubirArchivos(urbanizacion: UrbanizacionDto) {
    this.urbanizacionSeleccionada.set(urbanizacion);
    this.mostrarUploader.set(true);
  }

  cerrarModalUploader() {
    this.mostrarUploader.set(false);
    this.urbanizacionSeleccionada.set(null);
  }

  onSubidaCompleta() {
    this.cerrarModalUploader();
    this.notificationService.showSuccess('Archivos subidos correctamente');
  }

  tieneMaps(urbanizacion: UrbanizacionDto): boolean {
    return !!urbanizacion.maps && urbanizacion.maps.trim().length > 0;
  }

  abrirMaps(urbanizacion: UrbanizacionDto) {
    if (urbanizacion.maps) {
      window.open(urbanizacion.maps, '_blank', 'noopener,noreferrer');
    } else {
      this.notificationService.showWarning('Esta urbanización no tiene ubicación en Google Maps');
    }
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'ADMINISTRADOR';
  }

  getEstadoLabel(estado: string): string {
    const estados: Record<string, string> = {
      VENTA: 'Venta',
      PRE_VENTA: 'Pre-Venta',
      POST_VENTA: 'Post-Venta',
    };
    return estados[estado] || estado;
  }
}
