import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoteDto, LoteGroup } from '../../../../core/interfaces/lote.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoteService } from '../../service/lote.service';
import { ArchivosComponent } from '../../../../components/archivos/archivos/archivos';
import { AuthService } from '../../../../components/services/auth.service';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service'; // ← AÑADIR

interface ColumnConfig {
  key: keyof LoteDto;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-lote-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ArchivosComponent],
  templateUrl: './lote-list.html',
})
export class LoteList implements OnInit {
  lotes = signal<LoteDto[]>([]);
  allLotes = signal<LoteDto[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);
  loteSeleccionado = signal<LoteDto | null>(null);
  mostrarModal = signal<boolean>(false);
  filtroUuid = signal<string | null>(null);
  sortColumn = signal<keyof LoteDto>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');
  filtroIndependientes = signal<boolean>(false);

  columns: ColumnConfig[] = [
    { key: 'numeroLote', label: 'Lote', sortable: true },
    { key: 'urbanizacion', label: 'Urbanización', sortable: true },
    { key: 'ciudad', label: 'Ciudad', sortable: true },
    { key: 'superficieM2', label: 'Superficie', sortable: true },
    { key: 'precioBase', label: 'Precio Base', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
  ];

  readonly COLORES = [
    { c: '#185FA5', bg: '#E6F1FB', bdr: '#B5D4F4' },
    { c: '#0F6E56', bg: '#E1F5EE', bdr: '#9FE1CB' },
    { c: '#854F0B', bg: '#FAEEDA', bdr: '#FAC775' },
    { c: '#5B21B6', bg: '#EDE9FE', bdr: '#C4B5FD' },
    { c: '#0E7490', bg: '#E0F9FF', bdr: '#A5F3FC' },
  ];

  readonly CHIPS: Record<string, { bg: string; c: string; label: string }> = {
    DISPONIBLE: { bg: '#dcfce7', c: '#166534', label: 'Disponible' },
    RESERVADO: { bg: '#fef9c3', c: '#854d0e', label: 'Reservado' },
    VENDIDO: { bg: '#fee2e2', c: '#991b1b', label: 'Vendido' },
    CON_OFERTA: { bg: '#e0f2fe', c: '#075985', label: 'Con oferta' },
  };

  total = signal(0);
  pageSize = signal(10);
  currentPage = signal(1);

  private loteSvc = inject(LoteService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private urbCtx = inject(UrbanizacionContextService); // ← AÑADIR
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  currentUser = this.authService.getCurrentUser();

  // ─── COMPUTED PRINCIPAL ────────────────────────────────────────────────────
loteGroups = computed(() => {
  const column = this.sortColumn();
  const direction = this.sortDirection();
  const urbActiva = this.urbCtx.urbanizacion();
  const uuidFiltro = urbActiva?.uuid ?? this.filtroUuid();
  const soloIndependientes = this.filtroIndependientes();

  let lotes = this.allLotes().filter((lote: LoteDto) => {
    if (soloIndependientes) return lote.esIndependiente || !lote.urbanizacion;
    if (uuidFiltro) return lote.urbanizacion?.uuid === uuidFiltro;
    return true;
  });

  if (column) {
    lotes = [...lotes].sort((a, b) => {
      let aVal: any = column === 'urbanizacion' ? a.urbanizacion?.nombre : a[column];
      let bVal: any = column === 'urbanizacion' ? b.urbanizacion?.nombre : b[column];
      aVal = aVal ?? '';
      bVal = bVal ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number')
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      return direction === 'asc'
        ? aVal.toString().localeCompare(bVal.toString())
        : bVal.toString().localeCompare(aVal.toString());
    });
  }

  // ✅ new Map va AQUÍ DENTRO, no fuera
  const map = new Map<string, LoteGroup>();
  let colorIdx = 0;

  lotes.forEach((lote) => {
    if (lote.esIndependiente || !lote.urbanizacion) {
      if (!map.has('__ind__'))
        map.set('__ind__', {
          key: '__ind__',
          nombre: 'Lotes Independientes',
          ciudad: '',
          independiente: true,
          colorIndex: -1,
          lotes: [],
        });
      map.get('__ind__')!.lotes.push(lote);
    } else {
      const key = String(lote.urbanizacion.id ?? lote.urbanizacion.nombre);
      if (!map.has(key))
        map.set(key, {
          key,
          nombre: lote.urbanizacion.nombre,
          ciudad: lote.urbanizacion.ciudad ?? lote.ciudad,
          independiente: false,
          colorIndex: colorIdx++,
          lotes: [],
        });
      map.get(key)!.lotes.push(lote);
    }
  });

  const ind = map.get('__ind__');
  map.delete('__ind__');
  const result = Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (ind) result.push(ind);
  return result;
});

  filteredLotes = computed(() => this.loteGroups().flatMap((g) => g.lotes));

  // ─── INIT ──────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Recuperar contexto persistido si el usuario recargó la página
    this.urbCtx.recuperar();

    this.route.queryParams.subscribe((params) => {
      const uuid = params['urbanizacion'] ?? null;
      const independientes = params['independientes'] === 'true';
      this.filtroUuid.set(uuid);
      this.filtroIndependientes.set(independientes);
    });

    this.obtenerLotes();
  }

  // ─── El resto de métodos queda exactamente igual ───────────────────────────

  obtenerLotes() {
    this.cargando.set(true);
    this.error.set(null);
    this.loteSvc.getAll().subscribe({
      next: (lotes) => {
        const lotesConIndicador = lotes.map((lote) => ({
          ...lote,
          esMiLote: lote.encargadoId === this.currentUser?.id,
        }));
        this.lotes.set(lotesConIndicador);
        this.allLotes.set(lotesConIndicador);
        this.total.set(lotes.length);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar lotes:', err);
        this.error.set('No se pudieron cargar los lotes');
        this.cargando.set(false);
      },
    });
  }

  getGroupColor(group: { independiente: boolean; colorIndex: number }) {
    if (group.independiente) return { c: '#4B5563', bg: '#F3F4F6', bdr: '#D1D5DB' };
    return this.COLORES[group.colorIndex % this.COLORES.length];
  }

  getChip(estado: string) {
    return this.CHIPS[estado] ?? this.CHIPS['DISPONIBLE'];
  }

  countDisponibles(lotes: LoteDto[]): number {
    return lotes.filter((l) => l.estado === 'DISPONIBLE').length;
  }

  getEncargadoBadgeClass(lote: LoteDto): string {
    if (lote.encargadoId === this.currentUser?.id)
      return 'px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200';
    if (!lote.encargadoId)
      return 'px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200';
    return 'px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200';
  }

  getEncargadoText(lote: LoteDto): string {
    if (lote.encargadoId === this.currentUser?.id) return '👤 Mi lote';
    if (!lote.encargadoId) return '📦 Sin encargado';
    return '👥 Otro asesor';
  }

  cambiarOrden(columna: keyof LoteDto) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof LoteDto): string {
    if (this.sortColumn() !== columna) return 'opacity-30';
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  verDetalles(lote: LoteDto) {
    this.loteSeleccionado.set(lote);
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.loteSeleccionado.set(null);
  }

  eliminarLote(id: number) {
    this.notificationService
      .confirmDelete('¿Está seguro que desea eliminar este lote?')
      .then((result) => {
        if (result.isConfirmed) {
          this.loteSvc.delete(id).subscribe({
            next: () => {
              this.lotes.update((list) => list.filter((l) => l.id !== id));
              this.allLotes.update((list) => list.filter((l) => l.id !== id));
              this.total.update((total) => total - 1);
              this.notificationService.showSuccess('Lote eliminado correctamente');
              if (this.loteSeleccionado()?.id === id) this.cerrarModal();
            },
            error: (err) => {
              console.error('Error al eliminar lote:', err);
              this.notificationService.showError('No se pudo eliminar el lote');
            },
          });
        }
      });
  }

  abrirMapa(lote: LoteDto) {
    if (lote.ubicacion) {
      window.open(lote.ubicacion, '_blank', 'noopener,noreferrer');
    } else {
      this.notificationService.showWarning('Este lote no tiene ubicación registrada');
    }
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      DISPONIBLE: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      RESERVADO: 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700',
      VENDIDO: 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700',
      CON_OFERTA: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
    };
    return classes[estado] || classes['DISPONIBLE'];
  }

  getTipoLoteBadgeClass(esIndependiente: boolean): string {
    return esIndependiente
      ? 'px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700'
      : 'px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700';
  }

  getTipoLoteText(esIndependiente: boolean): string {
    return esIndependiente ? 'Independiente' : 'Urbanización';
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

  getLotesPaginados(): LoteDto[] {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    return this.filteredLotes().slice(startIndex, startIndex + this.pageSize());
  }

  onSearchChange(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  tieneUbicacion(lote: LoteDto): boolean {
    return !!lote.ubicacion;
  }

  mostrarUploader = signal(false);

  abrirModalSubirArchivos(lote: LoteDto) {
    this.loteSeleccionado.set(lote);
    this.mostrarUploader.set(true);
  }

  cerrarModalUploader() {
    this.mostrarUploader.set(false);
    this.loteSeleccionado.set(null);
  }

  onSubidaCompleta() {
    this.cerrarModalUploader();
    this.notificationService.showSuccess('Archivos subidos correctamente');
  }

  get isAdmin(): boolean {
    return this.currentUser.role === 'ADMINISTRADOR';
  }

  crearLote(): void {
    const urbActiva = this.urbCtx.urbanizacion();
    const uuid = urbActiva?.uuid ?? this.filtroUuid();
    if (uuid) {
      const grupo = this.loteGroups().find((g) =>
        g.lotes.some((l) => l.urbanizacion?.uuid === uuid),
      );
      this.router.navigate(['/lotes/crear'], {
        queryParams: { urbanizacion: uuid },
        state: {
          urbanizacionNombre: urbActiva?.nombre ?? grupo?.nombre,
          urbanizacionCiudad: urbActiva?.ciudad ?? grupo?.ciudad,
        },
      });
    } else {
      this.router.navigate(['/lotes/crear']);
    }
  }
}