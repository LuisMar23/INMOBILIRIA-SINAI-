import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SedeService } from '../../service/sede.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-sede-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './sede-edit.html',
  styleUrls: ['./sede-edit.css'],
})
export class SedeEdit implements OnInit {
  form!: FormGroup;
  enviando = signal(false);
  cargando = signal(true);
  id!: number;

  private fb = inject(FormBuilder);
  private sedeSvc = inject(SedeService);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);
  private router = inject(Router);

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      direccion: [''],
      telefono: [''],
    });
    this.cargarDatos();
  }

  cargarDatos() {
    this.sedeSvc.getById(this.id).subscribe({
      next: (sede) => {
        this.form.patchValue({
          nombre: sede.nombre,
          direccion: sede.direccion || '',
          telefono: sede.telefono || '',
        });
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notify.showError('Error al cargar la sede');
        this.router.navigate(['/sedes']);
      },
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.showError('Complete todos los campos requeridos');
      return;
    }
    this.enviando.set(true);
    this.sedeSvc.update(this.id, this.form.value).subscribe({
      next: () => {
        this.notify.showSuccess('Sede actualizada exitosamente');
        this.router.navigate(['/sedes']);
      },
      error: (err) => {
        this.enviando.set(false);
        this.notify.showError(err.error?.message || 'Error al actualizar la sede');
      },
    });
  }
}
