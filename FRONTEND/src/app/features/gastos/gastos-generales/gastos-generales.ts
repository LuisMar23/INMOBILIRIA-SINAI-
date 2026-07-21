// gastos-generales.component.ts
import { Component, OnInit, inject, signal, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Archivo, Caja, Egreso, EgresosService } from '../service/gastos.service';
import { CajaService } from '../../caja/service/caja.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-gastos-generales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
<div class="min-h-screen bg-gray-50 p-4 sm:p-6">

  <!-- Header -->
  <div class="bg-emerald-700 rounded-t-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="flex items-center gap-3">
      <svg class="w-8 h-8 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white">Gastos Generales</h1>
        <p class="text-emerald-200 text-xs mt-0.5">Egresos sin proyecto asignado</p>
      </div>
    </div>
    <button (click)="abrirModal()"
      class="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-105 w-full sm:w-auto">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      Nuevo Gasto
    </button>
  </div>

  <div class="bg-white rounded-b-2xl shadow-lg p-4 sm:p-6">

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div class="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl p-4 sm:p-5 shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-emerald-200 uppercase tracking-wide">Total Egresos</p>
            <p class="text-3xl font-bold mt-1">{{ resumen().totalEgresos }}</p>
          </div>
          <svg class="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
      </div>
      <div class="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-4 sm:p-5 shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-green-100 uppercase tracking-wide">Monto Total</p>
            <p class="text-3xl font-bold mt-1">Bs {{ formatMonto(resumen().montoTotal) }}</p>
          </div>
          <svg class="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Filtros + Búsqueda -->
    <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5 flex flex-wrap items-end gap-3">
      <div class="flex items-center gap-2 border border-emerald-300 rounded-lg px-3 py-2 bg-white flex-1 min-w-[180px]">
        <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
        </svg>
        <input type="text" [(ngModel)]="busqueda" placeholder="Buscar..."
          class="text-sm bg-transparent outline-none w-full text-gray-700" />
      </div>
      <div class="flex flex-wrap gap-3 flex-1">
        <div class="flex-1 min-w-[140px]">
          <label class="block text-xs font-medium text-emerald-700 mb-1">Fecha inicio</label>
          <input type="date" [(ngModel)]="filtroFechaInicio" (ngModelChange)="cargar()"
            class="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
        </div>
        <div class="flex-1 min-w-[140px]">
          <label class="block text-xs font-medium text-emerald-700 mb-1">Fecha fin</label>
          <input type="date" [(ngModel)]="filtroFechaFin" (ngModelChange)="cargar()"
            class="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
        </div>
        <div class="flex items-end">
          <button (click)="limpiarFiltros()"
            class="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition-colors">
            Limpiar
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla Desktop -->
    <div class="hidden lg:block">
      @if (cargando()) {
        <div class="text-center py-16">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div>
          <p class="text-gray-500 mt-3 text-sm">Cargando gastos...</p>
        </div>
      } @else if (egresosFiltrados().length === 0) {
        <div class="bg-emerald-50 rounded-xl p-16 text-center border border-emerald-200">
          <svg class="w-16 h-16 text-emerald-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p class="text-gray-600 font-semibold">No hay gastos registrados</p>
          <p class="text-gray-400 text-sm mt-1">Haz clic en "Nuevo Gasto" para comenzar</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-emerald-200">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gradient-to-r from-emerald-600 to-emerald-700">
                <th class="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide w-10">N°</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">Descripción</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">Caja</th>
                <th class="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">Fecha</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wide">Monto</th>
                <th class="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wide">Voucher</th>
                <th class="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-emerald-50 bg-white">
              @for (e of egresosFiltrados(); track e.id; let i = $index) {
                <tr class="hover:bg-emerald-50 transition-colors">
                  <td class="px-4 py-3 text-gray-400 text-xs font-medium">{{ i + 1 }}</td>
                  <td class="px-4 py-3 text-gray-800 font-medium">{{ e.descripcion }}</td>
                  <td class="px-4 py-3 text-gray-600">{{ e.caja?.nombre ?? '—' }}</td>
                  <td class="px-4 py-3 text-gray-600">{{ e.fecha | date:'dd/MM/yyyy' }}</td>
                  <td class="px-4 py-3 text-right font-bold text-red-600">Bs {{ formatMonto(e.monto) }}</td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-1">
                      @for (a of (e.archivos ?? []); track a.id) {
                        <button (click)="descargarVoucher(a)" [title]="a.nombreArchivo"
                          class="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                          </svg>
                        </button>
                      }
                      @if (!(e.archivos?.length)) { <span class="text-gray-300 text-xs">—</span> }
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button (click)="abrirEditar(e)" title="Editar"
                        class="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button (click)="confirmarEliminar(e)" title="Eliminar"
                        class="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="px-4 py-3 bg-emerald-50 border-t border-emerald-200 text-xs text-emerald-700">
            {{ egresosFiltrados().length }} registro(s)
          </div>
        </div>
      }
    </div>

    <!-- Cards Mobile -->
    <div class="lg:hidden space-y-3">
      @if (cargando()) {
        <div class="text-center py-12">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div>
        </div>
      } @else if (egresosFiltrados().length === 0) {
        <div class="bg-emerald-50 rounded-xl p-10 text-center border border-emerald-200">
          <p class="text-gray-500 font-medium">No hay gastos registrados</p>
        </div>
      } @else {
        @for (e of egresosFiltrados(); track e.id; let i = $index) {
          <div class="bg-white border border-emerald-200 rounded-xl shadow-sm overflow-hidden">
            <div class="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 flex justify-between items-center">
              <div>
                <span class="text-emerald-300 text-xs">#{{ i + 1 }} · {{ e.fecha | date:'dd/MM/yyyy' }}</span>
                <p class="text-white font-semibold text-sm mt-0.5">{{ e.descripcion }}</p>
              </div>
              <span class="bg-white/20 text-white text-sm font-bold px-3 py-1 rounded-lg">Bs {{ formatMonto(e.monto) }}</span>
            </div>
            <div class="p-4 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">Caja</span>
                <span class="text-gray-700 font-medium">{{ e.caja?.nombre ?? '—' }}</span>
              </div>
              @if (e.archivos?.length) {
                <div class="flex justify-between items-center text-sm">
                  <span class="text-gray-500">Vouchers</span>
                  <div class="flex gap-1">
                    @for (a of e.archivos; track a.id) {
                      <button (click)="descargarVoucher(a)" class="p-1.5 rounded bg-blue-50 text-blue-600">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                      </button>
                    }
                  </div>
                </div>
              }
              <div class="flex justify-end gap-2 pt-2 border-t border-emerald-100 mt-2">
                <button (click)="abrirEditar(e)"
                  class="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  Editar
                </button>
                <button (click)="confirmarEliminar(e)"
                  class="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        }
      }
    </div>

  </div>
</div>

<!-- Modal Crear/Editar -->
@if (modalVisible()) {
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">

      <div class="bg-slate-700 text-white px-6 py-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <div>
            <h2 class="text-lg font-bold">{{ egresoEditando() ? 'Editar Gasto' : 'Registrar Gasto General' }}</h2>
            <p class="text-slate-300 text-xs">Egreso sin proyecto asignado</p>
          </div>
        </div>
        <button (click)="cerrarModal()" class="text-white/70 hover:text-white transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="guardar()">
        <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">

          <div class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Descripción *</label>
              <input formControlName="descripcion" type="text" placeholder="Ej: Compra de materiales"
                class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Monto (Bs) *</label>
                <input formControlName="monto" type="number" step="0.01" placeholder="0.00"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Fecha del Gasto</label>
                <input formControlName="fecha" type="date"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Banco / Caja Interna *</label>
              <select formControlName="cajaId"
                class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none">
                <option [value]="null">Seleccione...</option>
                @for (c of cajasAbiertas(); track c.id) {
                  <option [value]="c.id">{{ c.nombre }} — Bs {{ formatMonto(c.saldoActual) }}</option>
                }
              </select>
            </div>
            <!-- <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Método de pago</label>
              <select formControlName="metodoPago"
                class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none">
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA">Tarjeta</option>
              </select>
            </div> -->
            @if (error()) {
              <div class="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p class="text-sm text-red-600">{{ error() }}</p>
              </div>
            }
          </div>

          <div class="p-6 flex flex-col">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Constancia en Imagen</label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center cursor-pointer hover:border-slate-500 transition-colors flex-1 flex flex-col items-center justify-center"
              (click)="fileInput.click()">
              @if (archivosSeleccionados().length === 0) {
                <svg class="w-10 h-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <p class="text-sm text-gray-500">Seleccionar archivo</p>
                <p class="text-xs text-gray-400 mt-1">Imágenes o PDF</p>
              } @else {
                <div class="w-full space-y-2">
                  @for (f of archivosSeleccionados(); track $index) {
                    <div class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-left">
                      <div class="flex items-center gap-2 min-w-0">
                        <svg class="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <span class="text-xs text-gray-600 truncate">{{ f.name }}</span>
                      </div>
                      <button type="button" (click)="$event.stopPropagation(); quitarArchivo($index)"
                        class="text-red-400 hover:text-red-600 ml-2 shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  }
                  <button type="button" (click)="$event.stopPropagation(); fileInput.click()"
                    class="text-xs text-slate-500 hover:text-slate-700 mt-1">+ Agregar más</button>
                </div>
              }
              <input #fileInput type="file" multiple accept="image/*,.pdf" class="hidden" (change)="onFilesSelected($event)" />
            </div>
          </div>
        </div>

        <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" (click)="cerrarModal()"
            class="flex items-center gap-2 px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            Cancelar
          </button>
          <button type="submit" [disabled]="form.invalid || guardando()"
            class="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            @if (guardando()) {
              <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Guardando...
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              {{ egresoEditando() ? 'Actualizar' : 'Guardar' }}
            }
          </button>
        </div>
      </form>
    </div>
  </div>
}

<!-- Confirm Eliminar -->
@if (egresoAEliminar()) {
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
      <div class="bg-red-500 text-white px-6 py-5 flex items-center gap-3">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
        <div>
          <h3 class="text-lg font-bold">Eliminar gasto</h3>
          <p class="text-red-100 text-xs">Esta acción no se puede deshacer</p>
        </div>
      </div>
      <div class="p-6">
        <p class="text-gray-700 mb-6">¿Estás seguro? El saldo de la caja será revertido.</p>
        <div class="flex justify-end gap-3">
          <button (click)="egresoAEliminar.set(null)"
            class="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition-colors">Cancelar</button>
          <button (click)="eliminar()"
            class="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
}
  `,
})
export class GastosGeneralesComponent implements OnInit, OnDestroy {
  private egresosService = inject(EgresosService);
  private fb             = inject(FormBuilder);
  private cajaService    = inject(CajaService);

  egresos               = signal<Egreso[]>([]);
  cajas                 = signal<Caja[]>([]);
  resumen               = signal({ totalEgresos: 0, montoTotal: 0 });
  cargando              = signal(false);
  guardando             = signal(false);
  modalVisible          = signal(false);
  egresoEditando        = signal<Egreso | null>(null);
  egresoAEliminar       = signal<Egreso | null>(null);
  archivosSeleccionados = signal<File[]>([]);
  error                 = signal('');

  busqueda          = '';          // ← para el input de búsqueda
  filtroFechaInicio = '';
  filtroFechaFin    = '';

  // ← computed: filtra localmente por búsqueda (descripción o caja)
  egresosFiltrados = computed(() => {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.egresos();
    return this.egresos().filter(e =>
      e.descripcion.toLowerCase().includes(q) ||
      (e.caja?.nombre ?? '').toLowerCase().includes(q)
    );
  });

  cajasAbiertas = computed(() =>
    this.cajaService.cajas().filter(c => c.estado === 'ABIERTA')
  );

  form = this.fb.group({
    descripcion: ['', Validators.required],
    monto:       [null as number | null, [Validators.required, Validators.min(0.01)]],
    fecha:       [new Date().toISOString().split('T')[0]],
    cajaId:      [null as number | null, Validators.required],
    metodoPago:  ['EFECTIVO', Validators.required],
  });

  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.cargar();
    this.cajaService.cargarCajas();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  cargar() {
    this.cargando.set(true);
    const filtros: any = { sinUrbanizacion: true };
    if (this.filtroFechaInicio) filtros.fechaInicio = this.filtroFechaInicio;
    if (this.filtroFechaFin)    filtros.fechaFin    = this.filtroFechaFin;

    this.subscriptions.push(
      this.egresosService.getAll(filtros).subscribe({
        next: (res) => {
          this.egresos.set(res.egresos);
          this.resumen.set(res.resumen);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      })
    );
  }

  abrirModal() {
    this.egresoEditando.set(null);
    this.form.reset({
      descripcion: '',
      monto:       null,
      fecha:       new Date().toISOString().split('T')[0],
      cajaId:      null,
      metodoPago:  'EFECTIVO',
    });
    this.archivosSeleccionados.set([]);
    this.error.set('');
    this.modalVisible.set(true);
  }

  abrirEditar(e: Egreso) {
    this.egresoEditando.set(e);
    this.form.patchValue({
      descripcion: e.descripcion,
      monto:       e.monto,
      fecha:       e.fecha?.substring(0, 10) ?? '',
      cajaId:      e.cajaId,
      metodoPago:  e.metodoPago ?? 'EFECTIVO',
    });
    this.archivosSeleccionados.set([]);
    this.error.set('');
    this.modalVisible.set(true);
  }

  cerrarModal() {
    this.modalVisible.set(false);
    this.egresoEditando.set(null);
    this.archivosSeleccionados.set([]);
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.archivosSeleccionados.update(prev => [...prev, ...Array.from(input.files!)]);
      input.value = '';
    }
  }

  quitarArchivo(index: number) {
    this.archivosSeleccionados.update(prev => prev.filter((_, i) => i !== index));
  }

// gastos-generales.component.ts
guardar() {
  if (this.form.invalid) return;

  this.guardando.set(true);
  this.error.set('');

  const formValue = this.form.value;
  const body = {
    descripcion: formValue.descripcion,
    monto: Number(formValue.monto),
    fecha: formValue.fecha,
    cajaId: formValue.cajaId,
    metodoPago: formValue.metodoPago,
    urbanizacionId: null  // ← GASTOS GENERALES siempre null
  };

  const archivos = this.archivosSeleccionados();

  const request = this.egresoEditando()
    ? this.egresosService.update(this.egresoEditando()!.id, body, archivos)
    : this.egresosService.create(body, archivos);

  this.subscriptions.push(
    request.subscribe({
      next: () => {
        this.cerrarModal();
        this.cargar();
        this.guardando.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al guardar el gasto');
        this.guardando.set(false);
      }
    })
  );
}
  confirmarEliminar(e: Egreso) { this.egresoAEliminar.set(e); }

  eliminar() {
    const e = this.egresoAEliminar();
    if (!e) return;
    this.subscriptions.push(
      this.egresosService.remove(e.id).subscribe({
        next: () => { this.egresoAEliminar.set(null); this.cargar(); },
        error: () => this.error.set('Error al eliminar el gasto'),
      })
    );
  }
  private serverUrl = environment.fileServer; 
// gastos-proyecto.component.ts
descargarVoucher(a: Archivo) {
  const url = this.serverUrl  + a.urlArchivo;
  const nombre = a.nombreArchivo || 'voucher';

  fetch(url, { method: 'GET' })
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    })
    .catch(err => console.error('Error al descargar archivo:', err));
}

  limpiarFiltros() {
    this.filtroFechaInicio = '';
    this.filtroFechaFin    = '';
    this.cargar();
  }

  formatMonto(v: number): string {
    return v?.toLocaleString('es-BO', { minimumFractionDigits: 2 }) ?? '0.00';
  }
}