import { Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ModalColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export interface ModalConfig {
  title: string;
  searchPlaceholder: string;
  columns: ModalColumn[];
  searchKeys: string[];
}

@Component({
  selector: 'app-selection-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
         (click)="onBackdropClick($event)">
      
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        
        <div class="bg-emerald-500 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <h2 class="text-white font-bold text-lg flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {{ config.title }}
          </h2>
          <button (click)="close()"
            class="text-white hover:bg-emerald-600 rounded-lg p-1.5 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="px-6 py-4 border-b border-gray-200">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              [placeholder]="config.searchPlaceholder"
              class="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              autofocus />
          </div>
          <p class="text-xs text-gray-500 mt-2">
            {{ filteredItems().length }} resultado(s) encontrado(s)
          </p>
        </div>

        <div class="overflow-auto flex-1">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                @for (col of config.columns; track col.key) {
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {{ col.label }}
                  </th>
                }
                <th class="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (item of filteredItems(); track item.id) {
                <tr class="hover:bg-emerald-50 transition-colors cursor-pointer"
                    (click)="selectItem(item)">
                  @for (col of config.columns; track col.key) {
                    <td class="px-6 py-4 text-gray-700">
                      {{ col.format ? col.format(item[col.key]) : item[col.key] }}
                    </td>
                  }
                  <td class="px-6 py-4 text-right">
                    <button class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">
                      Seleccionar
                    </button>
                  </td>
                </tr>
              }
              @if (filteredItems().length === 0) {
                <tr>
                  <td [colSpan]="config.columns.length + 1" class="px-6 py-12 text-center text-gray-400">
                    <svg class="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    No se encontraron resultados
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button (click)="close()"
            class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-medium transition-colors text-sm">
            Cancelar
          </button>
        </div>
      </div>
    </div>
    }
  `
})
export class SeleccionModalComponent implements OnChanges {
  @Input() config!: ModalConfig;

  // Ya no usamos el @Input() items directo dentro del computed.
  // Lo espejamos en un signal real para que sea reactivo.
  private _items = signal<any[]>([]);
  @Input()
  set items(value: any[]) {
    this._items.set(value ?? []);
  }
  get items(): any[] {
    return this._items();
  }

  @Output() selected = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  isOpen = signal<boolean>(false);
  searchTerm = signal<string>('');

  filteredItems = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const items = this._items();
    if (!term) return items;
    return items.filter(item =>
      this.config.searchKeys.some(key =>
        item[key]?.toString().toLowerCase().includes(term)
      )
    );
  });

  ngOnChanges(changes: SimpleChanges): void {
    // No hace falta lógica extra: el setter de `items` ya actualiza el signal.
  }

  open() { this.isOpen.set(true); this.searchTerm.set(''); }
  close() { this.isOpen.set(false); this.closed.emit(); }

  selectItem(item: any) {
    this.selected.emit(item);
    this.close();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) this.close();
  }
}