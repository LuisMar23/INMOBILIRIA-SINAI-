import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NotificationService } from '../../../../core/services/notification.service';
import { MovimientoService } from '../../../movimientos/service/movimiento.service';

@Component({
  selector: 'app-movimiento-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './movimiento.html',
})
export class MovimientoModalComponent {
  private fb = inject(FormBuilder);
  private movimientoSvc = inject(MovimientoService);
  private notificationSvc = inject(NotificationService);

  cajaId = input.required<number>();
  movimientoCreado = output<void>();

  visible = signal(false);
  cargando = signal(false);

  form = this.fb.group({
    tipo: ['INGRESO', Validators.required],
    monto: [0, [Validators.required, Validators.min(0.01)]],
    descripcion: ['', Validators.required],
    metodoPago: ['EFECTIVO', Validators.required],
    referencia: [''],
  });

  open() {
    this.visible.set(true);
    this.form.reset({
      tipo: 'INGRESO',
      monto: 0,
      descripcion: '',
      metodoPago: 'EFECTIVO',
      referencia: '',
    });
  }

  close() {
    this.visible.set(false);
  }

  guardar() {
    if (this.form.invalid) {
      this.marcarCamposComoSucios();
      this.notificationSvc.showWarning('Complete todos los campos requeridos');
      return;
    }

    this.cargando.set(true);

    const movimientoData = {
      cajaId: this.cajaId(),
      tipo: this.form.value.tipo! as 'INGRESO' | 'EGRESO',
      monto: Number(this.form.value.monto),
      descripcion: this.form.value.descripcion!,
      metodoPago: this.form.value.metodoPago!,
      referencia: this.form.value.referencia || undefined,
    };

    this.movimientoSvc.crearMovimiento(movimientoData).subscribe({
      next: (movimiento) => {
        this.notificationSvc.showSuccess('Movimiento registrado correctamente');
        this.cargando.set(false);
        this.close();
        this.movimientoCreado.emit();
      },
      error: (error) => {
        console.error('Error al crear movimiento:', error);
        this.notificationSvc.showError('Error al registrar el movimiento');
        this.cargando.set(false);
      },
    });
  }

  private marcarCamposComoSucios() {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control?.invalid) {
        control.markAsDirty();
      }
    });
  }
}
