import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ManzanoService } from '../../service/manzano.service';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ModalConfig,
  SeleccionModalComponent,
} from '../../../../components/seleccion-modal/seleccion-modal';

@Component({
  selector: 'app-manzano-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SeleccionModalComponent],
  templateUrl: './manzano-edit.html',
  styleUrls: ['./manzano-edit.css'],
})
export class ManzanoEdit implements OnInit {
  form!: FormGroup;
  urbanizaciones = signal<UrbanizacionDto[]>([]);
  enviando = signal(false);
  cargando = signal(true);
  searchUrbanizacion = signal('');
  id!: number;

  private fb = inject(FormBuilder);
  private manzanoSvc = inject(ManzanoService);
  private urbanizacionSvc = inject(UrbanizacionService);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);
  private router = inject(Router);

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      urbanizacionId: ['', Validators.required],
    });
    this.cargarDatos();
  }

  cargarDatos() {
    // Cargar urbanizaciones y manzano en paralelo, pero esperar a que ambas terminen
    forkJoin({
      urbanizaciones: this.urbanizacionSvc.getAll(1, 100),
      manzano: this.manzanoSvc.getById(this.id),
    }).subscribe({
      next: ({ urbanizaciones, manzano }) => {
        this.urbanizaciones.set(urbanizaciones.data);
        this.form.patchValue({
          nombre: manzano.nombre,
          urbanizacionId: manzano.urbanizacionId,
        });
        const urb = this.urbanizaciones().find((u) => u.id === manzano.urbanizacionId);
        if (urb) {
          this.searchUrbanizacion.set(urb.nombre);
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notify.showError('Error al cargar los datos necesarios');
        this.router.navigate(['/manzanos']);
      },
    });
  }

  selectUrbanizacion(urbanizacion: UrbanizacionDto) {
    if (urbanizacion.id) {
      this.form.patchValue({ urbanizacionId: urbanizacion.id.toString() });
      this.searchUrbanizacion.set(urbanizacion.nombre || '');
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.showError('Complete todos los campos requeridos');
      return;
    }
    this.enviando.set(true);
    this.manzanoSvc.update(this.id, this.form.value).subscribe({
      next: () => {
        this.notify.showSuccess('Manzano actualizado exitosamente');
        this.router.navigate(['/manzanos']);
      },
      error: (err) => {
        this.enviando.set(false);
        this.notify.showError(err.error?.message || 'Error al actualizar el manzano');
      },
    });
  }

  @ViewChild('urbanizacionModal') urbanizacionModal!: SeleccionModalComponent;
  urbanizacionModalConfig: ModalConfig = {
    title: 'Seleccionar Urbanización',
    searchPlaceholder: 'Buscar por nombre, ciudad, ubicación...',
    searchKeys: ['nombre', 'ciudad', 'ubicacion'],
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'ubicacion', label: 'Ubicación' },
    ],
  };
}
