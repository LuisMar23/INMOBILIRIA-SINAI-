import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Caja } from '../../../../core/interfaces/caja.interface';
import { AuthService } from '../../../../components/services/auth.service';
import { CajaService } from '../../service/caja.service';
import { NotificationService } from '../../../../core/services/notification.service';

interface ColumnConfig {
  key: keyof Caja;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-caja-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './caja-list.html',
})
export class CajaList implements OnInit {
  private cajaSvc = inject(CajaService);
  private fb = inject(FormBuilder);
  private authSvc = inject(AuthService);
  private notificationSvc = inject(NotificationService);

  cajas = signal<Caja[]>([]);
  allCajas = signal<Caja[]>([]);
  searchTerm = signal('');
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  sortColumn = signal<keyof Caja>('id');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
    { key: 'montoInicial', label: 'Monto Inicial', sortable: true },
    { key: 'saldoActual', label: 'Saldo Actual', sortable: true },
    { key: 'usuarioApertura', label: 'Usuario Apertura', sortable: true },
  ];

  form!: FormGroup;
  formAbrirCaja!: FormGroup;
  mostrarFormNuevaCaja = signal(false);
  mostrarModalAbrirCaja = signal(false);
  cajaSeleccionada = signal<Caja | null>(null);

  filteredCajas = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let cajas = this.allCajas();

    if (term) {
      cajas = cajas.filter(
        (caja: Caja) =>
          caja.nombre.toLowerCase().includes(term) ||
          caja.estado.toLowerCase().includes(term) ||
          caja.usuarioApertura?.fullName?.toLowerCase().includes(term)
      );
    }

    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return cajas;

    return [...cajas].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      if (column === 'usuarioApertura') {
        aValue = a.usuarioApertura?.fullName;
        bValue = b.usuarioApertura?.fullName;
      }

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

  ngOnInit(): void {
    this.obtenerCajas();
    this.inicializarForm();
    this.inicializarFormAbrirCaja();
  }

  inicializarForm() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      montoInicial: [0, [Validators.required, Validators.min(0)]],
      usuarioAperturaId: [1, Validators.required],
    });
  }

  inicializarFormAbrirCaja() {
    this.formAbrirCaja = this.fb.group({
      montoInicial: [0, [Validators.required, Validators.min(0)]],
    });
  }

  obtenerCajas() {
    this.cargando.set(true);
    this.error.set(null);

    this.cajaSvc.cargarCajas();

    // Usar el signal directamente sin subscribe
    setTimeout(() => {
      this.cajas.set(this.cajaSvc.cajas());
      this.allCajas.set(this.cajaSvc.cajas());
      this.cargando.set(false);
    }, 1000);
  }

  crearCaja() {
    if (this.form.invalid) {
      this.notificationSvc.showWarning('Complete todos los campos requeridos');
      return;
    }

    this.cajaSvc.crearCaja(this.form.value).subscribe({
      next: (nuevaCaja) => {
        this.cajas.update((prev) => [...prev, nuevaCaja]);
        this.allCajas.update((prev) => [...prev, nuevaCaja]);
        this.form.reset({
          montoInicial: 0,
          usuarioAperturaId: 1,
        });
        this.mostrarFormNuevaCaja.set(false);
        this.notificationSvc.showSuccess('Caja creada correctamente');
      },
      error: () => {
        this.notificationSvc.showError('Error al crear la caja');
      },
    });
  }

  abrirCajaModal(caja: Caja) {
    this.cajaSeleccionada.set(caja);
    this.formAbrirCaja.reset({ montoInicial: 0 });
    this.mostrarModalAbrirCaja.set(true);
  }

  confirmarAbrirCaja() {
    if (this.formAbrirCaja.invalid || !this.cajaSeleccionada()) {
      this.notificationSvc.showWarning('Ingrese un monto inicial válido');
      return;
    }

    const caja = this.cajaSeleccionada()!;
    const montoInicial = this.formAbrirCaja.value.montoInicial;

    this.cajaSvc.abrirCaja(caja.id, montoInicial).subscribe({
      next: (cajaActualizada) => {
        this.cajas.update((prev) => prev.map((c) => (c.id === caja.id ? cajaActualizada : c)));
        this.allCajas.update((prev) => prev.map((c) => (c.id === caja.id ? cajaActualizada : c)));
        this.mostrarModalAbrirCaja.set(false);
        this.cajaSeleccionada.set(null);
        this.notificationSvc.showSuccess(`Caja ${caja.nombre} abierta correctamente`);
      },
      error: () => {
        this.notificationSvc.showError('Error al abrir la caja');
      },
    });
  }

  async cerrarCaja(caja: Caja) {
    const result = await this.notificationSvc.confirmDelete(
      `¿Está seguro que desea cerrar la caja ${caja.nombre}?`,
      'Cerrar Caja'
    );

    if (result.isConfirmed) {
      this.cajaSvc.cerrarCaja(caja.id).subscribe({
        next: (cajaActualizada) => {
          this.cajas.update((prev) => prev.map((c) => (c.id === caja.id ? cajaActualizada : c)));
          this.allCajas.update((prev) => prev.map((c) => (c.id === caja.id ? cajaActualizada : c)));
          this.notificationSvc.showSuccess(`Caja ${caja.nombre} cerrada correctamente`);
        },
        error: () => {
          this.notificationSvc.showError('Error al cerrar la caja');
        },
      });
    }
  }

  cambiarOrden(columna: keyof Caja) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof Caja): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  getEstadoBadgeClass(estado: string): string {
    const classes = {
      ABIERTA: 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700',
      CERRADA: 'px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700',
    };
    return classes[estado as keyof typeof classes] || classes['CERRADA'];
  }

  getDiferencia(caja: Caja): number {
    return caja.saldoActual - caja.montoInicial;
  }

  getCajasAbiertas(): number {
    return this.cajas().filter((c) => c.estado === 'ABIERTA').length;
  }

  getCajasCerradas(): number {
    return this.cajas().filter((c) => c.estado === 'CERRADA').length;
  }

  getTotalEnCajas(): number {
    // Sumar solo los saldos actuales de todas las cajas
    return this.cajas().reduce((sum, c) => sum + Number(c.saldoActual), 0);
  }

  toggleFormNuevaCaja() {
    this.mostrarFormNuevaCaja.set(!this.mostrarFormNuevaCaja());
  }

  cerrarModalAbrirCaja() {
    this.mostrarModalAbrirCaja.set(false);
    this.cajaSeleccionada.set(null);
  }

  tienePermisoAdmin(): boolean {
    const user = this.authSvc.getCurrentUser();
    return user?.role === 'ADMINISTRADOR' || user?.role === 'SECRETARIA';
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }
}
