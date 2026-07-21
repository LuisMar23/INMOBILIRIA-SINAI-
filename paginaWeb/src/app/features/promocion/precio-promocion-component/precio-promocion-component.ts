// precio-promocion.component.ts
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-precio-promocion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      @if (precioConDescuento()) {
        <div class="flex items-center gap-2">
          <span class="text-gray-400 line-through text-lg">
            Bs. {{ precioOriginal() | number:'1.2-2' }}
          </span>
          <span class="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-bold">
            -{{ descuento() }}%
          </span>
        </div>
        
        <div class="flex items-center gap-2">
          <span class="text-3xl font-bold text-green-600">
            Bs. {{ precioConDescuento() | number:'1.2-2' }}
          </span>
        </div>

        <div class="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Ahorras: Bs. {{ ahorro() | number:'1.2-2' }}
        </div>
      } @else {
        <div class="text-3xl font-bold text-gray-900">
          Bs. {{ precioOriginal() | number:'1.2-2' }}
        </div>
      }
    </div>
  `
})
export class PrecioPromocionComponent {
  precioOriginal = input.required<number>();
  precioConDescuento = input<number | null>();
  descuento = input<number>(0);
  
  ahorro = computed(() => {
    const original = this.precioOriginal();
    const conDescuento = this.precioConDescuento();
    return conDescuento ? original - conDescuento : 0;
  });
}