import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SedeService } from '../../service/sede.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-sede-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './sede-create.html',
  styleUrls: ['./sede-create.css'],
})
export class SedeCreate implements OnInit {
  form!: FormGroup;
  enviando = signal(false);
  private fb = inject(FormBuilder);
  private sedeSvc = inject(SedeService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  ngOnInit() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      direccion: [''],
      telefono: [''],
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.showError('Complete todos los campos requeridos');
      return;
    }
    this.enviando.set(true);
    this.sedeSvc.create(this.form.value).subscribe({
      next: () => {
        this.notify.showSuccess('Sede creada exitosamente');
        this.router.navigate(['/sedes']);
      },
      error: (err) => {
        this.enviando.set(false);
        this.notify.showError(err.error?.message || 'Error al crear la sede');
      },
    });
  }
}
