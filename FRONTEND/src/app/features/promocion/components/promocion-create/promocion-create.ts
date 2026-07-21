import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromocionService } from '../../service/promocion.service';

@Component({
  selector: 'app-promocion-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './promocion-create.html',
})
export class PromocionCreate implements OnInit {
  promocionForm: FormGroup;
  enviando = signal<boolean>(false);

  router = inject(Router);
  private fb = inject(FormBuilder);
  private promocionSvc = inject(PromocionService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.promocionForm = this.crearFormularioPromocion();
  }

  ngOnInit(): void {}

  crearFormularioPromocion(): FormGroup {
    return this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: [''],
      descuento: [0, [Validators.required, Validators.min(0.01), Validators.max(100)]],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.promocionForm.invalid) {
      this.promocionForm.markAllAsTouched();
      this.notificationService.showError('Complete todos los campos requeridos correctamente.');
      return;
    }

    this.enviando.set(true);

    const formValue = this.promocionForm.value;
    const promocionData = {
      titulo: formValue.titulo,
      descripcion: formValue.descripcion,
      descuento: Number(formValue.descuento),
      fechaInicio: new Date(formValue.fechaInicio).toISOString(),
      fechaFin: new Date(formValue.fechaFin).toISOString(),
    };

    this.promocionSvc.create(promocionData).subscribe({
      next: (response: any) => {
        this.enviando.set(false);
        if (response.success === true) {
          this.notificationService.showSuccess(
            'Promoción creada exitosamente! Ahora puede asignarla a lotes desde la lista.'
          );
          setTimeout(() => {
            this.router.navigate(['/promociones/lista']);
          }, 1500);
        } else {
          this.notificationService.showError(response.message || 'Error al crear la promoción');
        }
      },
      error: (err: any) => {
        this.enviando.set(false);
        let errorMessage = 'Error al crear la promoción';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
        } else if (err.status === 500) {
          errorMessage = 'Error interno del servidor. Intente nuevamente.';
        }
        this.notificationService.showError(errorMessage);
      },
    });
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    this.onSubmit();
  }
}
