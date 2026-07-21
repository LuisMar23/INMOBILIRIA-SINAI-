import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ManzanoService } from '../../service/manzano.service';
import { UrbanizacionService } from '../../../urbanizacion/services/urbanizacion.service';
import { UrbanizacionDto } from '../../../../core/interfaces/urbanizacion.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ModalConfig,
  SeleccionModalComponent,
} from '../../../../components/seleccion-modal/seleccion-modal';

@Component({
  selector: 'app-manzano-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SeleccionModalComponent],
  templateUrl: './manzano-create.html',
  styleUrls: ['./manzano-create.css'],
})
export class ManzanoCreate implements OnInit {
  form!: FormGroup;
  urbanizaciones = signal<UrbanizacionDto[]>([]);
  enviando = signal(false);
  searchUrbanizacion = signal('');
  private fb = inject(FormBuilder);
  private manzanoSvc = inject(ManzanoService);
  private urbanizacionSvc = inject(UrbanizacionService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  ngOnInit() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      urbanizacionId: ['', Validators.required],
    });
    this.cargarUrbanizaciones();
  }

  cargarUrbanizaciones() {
    this.urbanizacionSvc.getAll(1, 100).subscribe({
      next: (res) => this.urbanizaciones.set(res.data),
      error: () => this.notify.showError('No se pudieron cargar las urbanizaciones'),
    });
  }

  selectUrbanizacion(urbanizacion: UrbanizacionDto) {
    if (urbanizacion.id) {
      this.form.patchValue({
        urbanizacionId: urbanizacion.id.toString(),
      });
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
    this.manzanoSvc.create(this.form.value).subscribe({
      next: () => {
        this.notify.showSuccess('Manzano creado exitosamente');
        this.router.navigate(['/manzanos']);
      },
      error: (err) => {
        this.enviando.set(false);
        this.notify.showError(err.error?.message || 'Error al crear el manzano');
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
