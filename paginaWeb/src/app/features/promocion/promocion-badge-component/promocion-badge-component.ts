// promocion-badge.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-promocion-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (promocion()) {
      <div class="absolute top-4 left-4 z-10">
        <div class="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-2 rounded-lg shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-300">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
            <span class="font-bold text-lg">-{{ promocion()!.descuento }}%</span>
          </div>
          <div class="text-xs font-semibold mt-1">{{ promocion()!.titulo }}</div>
        </div>
      </div>

      <div class="absolute top-0 right-0 z-10">
        <div class="bg-yellow-400 text-red-600 px-6 py-2 rounded-bl-2xl shadow-lg font-black text-sm">
          ¡OFERTA!
        </div>
      </div>
    }
  `
})
export class PromocionBadgeComponent {
  promocion = input<{
    titulo: string;
    descuento: number;
    fechaFin: Date;
  } | null>();
}