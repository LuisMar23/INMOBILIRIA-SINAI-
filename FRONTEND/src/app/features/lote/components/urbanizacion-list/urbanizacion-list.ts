import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faMapMarkerAlt, faBuilding, faEdit, faTrash, faThLarge,
  faSearch, faSpinner, faPlus, faFolderOpen, faSignOutAlt, faCity,
} from '@fortawesome/free-solid-svg-icons';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { LoteService } from '../../../lote/service/lote.service'; // ajustá el path
import { AuthService } from '../../../../components/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UrbanizacionContextService } from '../../../../core/services/urbanizacion-context.service';
import { CiudadGroup, UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';
import { LoteDto } from '../../../../core/interfaces/lote.interface';
import { forkJoin } from 'rxjs';
import { SedeDto } from '../../../../core/interfaces/sede.interface';
import { SedeService } from '../../../sede/service/sede.service';

@Component({
  selector: 'app-urbanizacion-list',
  imports: [FontAwesomeModule, FormsModule, RouterModule, CommonModule,ReactiveFormsModule],
  templateUrl: './urbanizacion-list.html',
  styleUrls: ['./urbanizacion-list.css'],
})
export class UrbanizacionList implements OnInit {
  faMapMarkerAlt = faMapMarkerAlt;
  faBuilding = faBuilding;
  faEdit = faEdit;
  faTrash = faTrash;
  faThLarge = faThLarge;
  faSearch = faSearch;
  faSpinner = faSpinner;
  faPlus = faPlus;
  faFolderOpen = faFolderOpen;
  faSignOut = faSignOutAlt;
  faCity = faCity;
    private sedeService = inject(SedeService);
    private fb = inject(FormBuilder);
      sedesList = signal<SedeDto[]>([]);
        loadSedes() {
    this.sedeService.getAll().subscribe({
      next: (sedes) => this.sedesList.set(sedes),
      error: () => this.notificationService.showError('Error al cargar sedes'),
    });
  }
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
  cargando = signal(true);
  error = signal<string | null>(null);
  urbanizaciones = signal<UrbanizacionDto[]>([]);
  lotesIndependientes = signal<LoteDto[]>([]);
  busqueda = signal('');

  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private urbContext = inject(UrbanizacionContextService);
  private urbanizacionService = inject(UrbanizacionService);
  private loteService = inject(LoteService);

  ciudadGroups = computed<CiudadGroup[]>(() => {
    const q = this.busqueda().toLowerCase().trim();
    const todas = this.urbanizaciones();

    const filtradas = q
      ? todas.filter(
          (u) =>
            u.nombre.toLowerCase().includes(q) ||
            u.ciudad.toLowerCase().includes(q) ||
            u.ubicacion?.toLowerCase().includes(q),
        )
      : todas;

    const map = new Map<string, UrbanizacionDto[]>();
    filtradas.forEach((u) => {
      const ciudad = u.ciudad?.trim() || 'Sin ciudad';
      if (!map.has(ciudad)) map.set(ciudad, []);
      map.get(ciudad)!.push(u);
    });

    return Array.from(map.entries())
      .map(([ciudad, urbanizaciones]) => ({
        ciudad,
        urbanizaciones: urbanizaciones.sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }))
      .sort((a, b) => a.ciudad.localeCompare(b.ciudad));
  });

  // Lotes independientes filtrados por búsqueda
  lotesIndependientesFiltrados = computed<LoteDto[]>(() => {
    const q = this.busqueda().toLowerCase().trim();
    const lotes = this.lotesIndependientes();
    if (!q) return lotes;
    return lotes.filter(
      (l) =>
        l.numeroLote.toLowerCase().includes(q) ||
        l.ciudad?.toLowerCase().includes(q) 
    );
  });

  hayIndependientes = computed(() => this.lotesIndependientesFiltrados().length > 0);

  totalUrbanizaciones = computed(() => this.urbanizaciones().length);

  contarEstado(lotes: LoteDto[], estado: string): number {
    return lotes.filter((l) => l.estado === estado).length;
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.cargando.set(true);
    this.error.set(null);

    forkJoin({
      urbanizaciones: this.urbanizacionService.getAll(),
      lotes: this.loteService.getAll(),
    }).subscribe({
      next: ({ urbanizaciones, lotes }) => {
        this.urbanizaciones.set(urbanizaciones.data);
        // Solo los lotes sin urbanización
        const independientes = lotes.filter(
          (l: LoteDto) => !l.urbanizacion || l.esIndependiente,
        );
        this.lotesIndependientes.set(independientes);
        this.cargando.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Error al cargar datos');
        this.cargando.set(false);
      },
    });
  }

  // Alias para el botón reintentar
  cargarUrbanizaciones(): void {
    this.cargarTodo();
  }

  irADashboard(urb: UrbanizacionDto): void {
    this.urbContext.set({
      id: urb.id!,
      uuid: urb.uuid!,
      nombre: urb.nombre,
      ciudad: urb.ciudad,
    });
    this.router.navigate(['/dashboard']);
  }

  irALotesIndependientes(): void {
    this.router.navigate(['/lotes/lista'], { queryParams: { independientes: true } });
  }

  crearUrbanizacion(): void {
    this.router.navigate(['/urbanizaciones/crear']);
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get isAdmin(): boolean {
    return this.authService.getCurrentUser()?.role === 'ADMINISTRADOR';
  }
    form: FormGroup;
  showModal = signal(false);
    openModal() {
    this.showModal.set(true);
    this.form.reset();
  }
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
          this.cargarTodo();
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
    cancelEdit() {
    this.showModal.set(false);
    this.form.reset();
  }

}