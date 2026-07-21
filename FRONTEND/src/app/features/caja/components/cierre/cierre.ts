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
import { ActivatedRoute } from '@angular/router';
import { CierreCaja } from '../../../../core/interfaces/caja.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { CierreService } from '../../service/cierre.service';
import { CajaService } from '../../service/caja.service';

interface ColumnConfig {
  key: keyof CierreCaja;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-cierre',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cierre.html',
})
export class CierreComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private cierreSvc = inject(CierreService);
  private cajaSvc = inject(CajaService);
  private fb = inject(FormBuilder);
  private notificationSvc = inject(NotificationService);

  cierres = signal<CierreCaja[]>([]);
  allCierres = signal<CierreCaja[]>([]);
  cajaId = signal<number>(0);
  caja = signal<any>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  sortColumn = signal<keyof CierreCaja>('fechaCierre');
  sortDirection = signal<'asc' | 'desc'>('desc');

  columns: ColumnConfig[] = [
    { key: 'fechaCierre', label: 'Fecha', sortable: true },
    { key: 'tipo', label: 'Tipo', sortable: true },
    { key: 'saldoFinal', label: 'Saldo Final', sortable: true },
    { key: 'saldoReal', label: 'Saldo Real', sortable: true },
    { key: 'diferencia', label: 'Diferencia', sortable: true },
  ];

  form!: FormGroup;

  filteredCierres = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return this.allCierres();

    return [...this.allCierres()].sort((a, b) => {
      let aValue: any = a[column];
      let bValue: any = b[column];

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (column === 'fechaCierre') {
        return direction === 'asc'
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      }

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
    this.inicializarForm();
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.cajaId.set(id);
      if (id) {
        this.obtenerCierres();
        this.obtenerCaja();
      }
    });
  }

  inicializarForm() {
    this.form = this.fb.group({
      saldoReal: [0, [Validators.required, Validators.min(0)]],
      tipo: ['TOTAL', Validators.required],
      observaciones: [''],
    });
  }

  obtenerCierres() {
    this.cargando.set(true);
    this.error.set(null);

    this.cierreSvc.listarPorCaja(this.cajaId());

    // Usar el signal directamente
    setTimeout(() => {
      this.cierres.set(this.cierreSvc.cierres());
      this.allCierres.set(this.cierreSvc.cierres());
      this.cargando.set(false);
    }, 1000);
  }

  obtenerCaja() {
    this.cajaSvc.obtenerCaja(this.cajaId()).subscribe({
      next: (caja) => {
        this.caja.set(caja);
        // Establecer el saldo actual como valor por defecto en el formulario
        if (caja) {
          this.form.patchValue({
            saldoReal: caja.saldoActual,
          });
        }
      },
      error: () => {
        this.notificationSvc.showError('Error al obtener información de la caja');
      },
    });
  }

  crearCierre() {
    if (this.form.invalid) {
      this.notificationSvc.showWarning('Complete todos los campos requeridos');
      return;
    }

    const payload = {
      cajaId: this.cajaId(),
      saldoReal: Number(this.form.value.saldoReal),
      tipo: this.form.value.tipo,
      observaciones: this.form.value.observaciones || undefined,
    };

    this.cierreSvc.crearCierre(payload).subscribe({
      next: () => {
        this.notificationSvc.showSuccess('Cierre registrado correctamente');
        this.form.reset({
          tipo: 'TOTAL',
          saldoReal: 0,
          observaciones: '',
        });
        this.obtenerCierres();
        this.obtenerCaja(); // Actualizar información de la caja
      },
      error: (error) => {
        let errorMessage = 'Error al registrar el cierre';

        if (error.status === 400) {
          errorMessage = error.error?.message || 'Datos inválidos para el cierre';
        } else if (error.status === 403) {
          errorMessage = 'No tiene permisos para realizar cierres de caja';
        } else if (error.status === 404) {
          errorMessage = 'Caja no encontrada';
        }

        this.notificationSvc.showError(errorMessage);
      },
    });
  }

  cambiarOrden(columna: keyof CierreCaja) {
    if (this.sortColumn() === columna) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(columna);
      this.sortDirection.set('desc');
    }
  }

  getClaseFlecha(columna: keyof CierreCaja): string {
    if (this.sortColumn() !== columna) {
      return 'opacity-30';
    }
    return this.sortDirection() === 'asc' ? '' : 'rotate-180';
  }

  getTipoBadgeClass(tipo: string): string {
    const classes = {
      TOTAL: 'px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700',
      PARCIAL: 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700',
    };
    return classes[tipo as keyof typeof classes] || classes['TOTAL'];
  }

  getDiferenciaClass(diferencia: number): string {
    return diferencia >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
  }

  getSaldoActual(): number {
    return this.caja()?.saldoActual || 0;
  }
}
