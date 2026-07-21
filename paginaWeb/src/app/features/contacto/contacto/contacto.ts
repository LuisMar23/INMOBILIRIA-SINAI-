import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-contacto',
  imports: [ReactiveFormsModule,CommonModule],
  templateUrl: './contacto.html',
  styleUrl: './contacto.css',
})
export class Contacto {
 contactoForm = new FormGroup({
    nombre: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    telefono: new FormControl('', Validators.required),
    mensaje: new FormControl('', Validators.required),
  });

  enviarMensaje() {
    if (this.contactoForm.valid) {
      const data = this.contactoForm.value;
      // Aquí podrías enviar al backend o abrir WhatsApp
      console.log('Formulario enviado', data);
      alert('¡Mensaje enviado!'); 
      this.contactoForm.reset();
    } else {
      this.contactoForm.markAllAsTouched();
    }
  }
}
