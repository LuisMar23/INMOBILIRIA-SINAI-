// gastos-proyecto.component.ts
import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import { UrbanizacionContextService } from '../../../core/services/urbanizacion-context.service';
import { Archivo, Caja, Egreso, EgresosService } from '../service/gastos.service';
import { CajaService } from '../../caja/service/caja.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-gastos-proyecto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
<div class="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 py-4 px-2 sm:px-4 lg:px-8">
  <div class="max-w-full mx-auto">

    @if (!urbCtx.urbanizacion()) {
      <div class="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center">
        <div class="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-slate-700 mb-2">Sin proyecto activo</h2>
        <p class="text-sm text-slate-400">Selecciona una urbanización desde el menú para ver sus gastos de proyecto.</p>
      </div>
    } @else {

      <!-- Header -->
      <div class="bg-emerald-500 rounded-t-2xl shadow-lg p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-3">
            <svg class="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Gastos del Proyecto</h1>
              <p class="text-emerald-100 text-xs sm:text-sm mt-1">
                {{ urbCtx.urbanizacion()!.nombre }} — {{ urbCtx.urbanizacion()!.ciudad }}
              </p>
            </div>
          </div>
          <button (click)="abrirModal()" 
            class="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-3 sm:px-6 sm:py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold text-sm sm:text-base w-full sm:w-auto">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nuevo Gasto
          </button>
        </div>
      </div>

      <div class="bg-white rounded-b-2xl shadow-xl p-4 sm:p-6 lg:p-8">

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div class="bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-xl p-4 sm:p-6 shadow-lg">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold">Total Egresos</p>
                <p class="text-2xl sm:text-3xl font-bold">{{ resumen().totalEgresos }}</p>
              </div>
              <svg class="w-8 h-8 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
          </div>

          <div class="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl p-4 sm:p-6 shadow-lg">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold">Monto Total</p>
                <p class="text-2xl sm:text-3xl font-bold">Bs {{ formatMonto(resumen().montoTotal) }}</p>
              </div>
              <svg class="w-8 h-8 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Filtros -->
        <div class="mb-6">
          <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div class="flex flex-wrap items-end gap-4">
              <div class="flex-1 min-w-[150px]">
                <label class="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
                <input type="date" [(ngModel)]="filtroFechaInicio" (ngModelChange)="cargar()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm" />
              </div>
              <div class="flex-1 min-w-[150px]">
                <label class="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
                <input type="date" [(ngModel)]="filtroFechaFin" (ngModelChange)="cargar()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm" />
              </div>
              <div>
                <button (click)="limpiarFiltros()"
                  class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabla Desktop -->
        <div class="hidden lg:block">
          @if (cargando()) {
            <div class="text-center py-12">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
              <p class="text-gray-600 mt-4 text-sm">Cargando gastos...</p>
            </div>
          } @else if (egresos().length === 0) {
            <div class="bg-gray-50 rounded-xl p-12 text-center border border-gray-200">
              <svg class="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <p class="text-lg font-semibold text-gray-700 mb-2">No hay gastos registrados</p>
              <p class="text-sm text-gray-500">Haz clic en "Nuevo Gasto" para comenzar</p>
            </div>
          } @else {
            <div class="overflow-x-auto rounded-lg border border-gray-200">
              <table class="w-full">
                <thead class="bg-gradient-to-r from-emerald-500 to-emerald-600">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Fecha</th>
                    <th class="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Descripción</th>
                    <th class="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Caja</th>
                    <th class="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">Monto</th>
                    <th class="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Vouchers</th>
                    <th class="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  @for (e of egresos(); track e.id) {
                    <tr class="hover:bg-gray-50 transition-colors">
                      <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{{ e.fecha | date:'dd/MM/yyyy' }}</td>
                      <td class="px-4 py-4 text-sm text-gray-800 font-medium">{{ e.descripcion }}</td>
                      <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{{ e.caja?.nombre ?? '—' }}</td>
                      <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-bold text-green-700">Bs {{ formatMonto(e.monto) }}</td>
                      <td class="px-4 py-4 text-center">
                        <div class="flex items-center justify-center gap-1">
                          @for (a of (e.archivos ?? []); track a.id) {
                            <button (click)="descargarVoucher(a)" [title]="a.nombreArchivo"
                              class="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                              </svg>
                            </button>
                          }
                          @if (!(e.archivos?.length)) { <span class="text-gray-300 text-xs">—</span> }
                        </div>
                      </td>
                      <td class="px-4 py-4 text-center">
                        <div class="flex items-center justify-center gap-2">
                          <button (click)="abrirEditar(e)" 
                            class="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Editar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          <button (click)="confirmarEliminar(e)" 
                            class="p-2 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 transition-colors" title="Eliminar">
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
            </div>
          }
        </div>

        <!-- Vista Mobile - Cards -->
        <div class="lg:hidden space-y-4">
          @if (cargando()) {
            <div class="text-center py-12">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
              <p class="text-gray-600 mt-4">Cargando gastos...</p>
            </div>
          } @else {
            @for (e of egresos(); track e.id) {
              <div class="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                <div class="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4">
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <p class="text-emerald-100 text-xs">{{ e.fecha | date:'dd/MM/yyyy' }}</p>
                      <h3 class="font-bold text-white text-sm mt-1">{{ e.descripcion }}</h3>
                    </div>
                    <span class="bg-white/20 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                      Bs {{ formatMonto(e.monto) }}
                    </span>
                  </div>
                </div>
                <div class="p-4 space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-500">Caja:</span>
                    <span class="text-sm font-medium text-gray-700">{{ e.caja?.nombre ?? '—' }}</span>
                  </div>
                  @if (e.archivos?.length) {
                    <div class="flex justify-between items-center">
                      <span class="text-xs text-gray-500">Vouchers:</span>
                      <div class="flex gap-1">
                        @for (a of e.archivos; track a.id) {
                          <button (click)="descargarVoucher(a)" 
                            class="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                          </button>
                        }
                      </div>
                    </div>
                  }
                  <div class="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button (click)="abrirEditar(e)"
                      class="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-sm transition transform hover:scale-105">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                      Editar
                    </button>
                    <button (click)="confirmarEliminar(e)"
                      class="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-sm transition transform hover:scale-105">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            }

            @if (egresos().length === 0 && !cargando()) {
              <div class="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p class="text-lg font-semibold text-gray-700 mb-2">No hay gastos registrados</p>
                <p class="text-sm text-gray-500">Haz clic en "Nuevo Gasto" para comenzar</p>
              </div>
            }
          }
        </div>

      </div>
    }
  </div>
</div>

<!-- Modal para crear/editar gasto -->
@if (modalVisible()) {
  <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
    <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl">
      <div class="bg-emerald-500 text-white p-6 rounded-t-2xl flex justify-between items-center">
        <div class="flex items-center gap-3">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <h2 class="text-xl font-bold">{{ egresoEditando() ? 'Editar Gasto' : 'Nuevo Gasto' }}</h2>
            <p class="text-emerald-100 text-sm">{{ urbCtx.urbanizacion()!.nombre }}</p>
          </div>
        </div>
        <button (click)="cerrarModal()" class="text-white hover:text-emerald-200 transition-colors p-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="guardar()" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Descripción *</label>
          <input formControlName="descripcion" type="text" 
            placeholder="Ej: Compra de materiales para la obra"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Monto (Bs) *</label>
            <input formControlName="monto" type="number" step="0.01" placeholder="0.00"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
            <input formControlName="fecha" type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Caja *</label>
          <select formControlName="cajaId"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            <option [value]="null">Seleccionar caja</option>
            @for (c of cajas(); track c.id) { 
              <option [value]="c.id">{{ c.nombre }} (Saldo: Bs {{ formatMonto(c.saldoActual) }})</option>
            }
          </select>
        </div>

        <!-- <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
          <select formControlName="metodoPago"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="TARJETA">Tarjeta</option>
          </select>
        </div> -->

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Vouchers / Comprobantes</label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500 transition-colors" 
            (click)="fileInput.click()">
            <svg class="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <p class="text-sm text-gray-500">Arrastra archivos o <span class="text-emerald-600 font-medium">selecciona</span></p>
            <input #fileInput type="file" multiple accept="image/*,.pdf" class="hidden" (change)="onFilesSelected($event)" />
          </div>
          @if (archivosSeleccionados().length > 0) {
            <div class="mt-2 space-y-1">
              @for (f of archivosSeleccionados(); track $index) {
                <div class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span class="text-xs text-gray-600 truncate">{{ f.name }}</span>
                  <button type="button" (click)="quitarArchivo($index)" class="text-red-500 hover:text-red-700">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        @if (error()) {
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-sm text-red-600">{{ error() }}</p>
          </div>
        }

        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" (click)="cerrarModal()"
            class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-semibold">
            Cancelar
          </button>
          <button type="submit" [disabled]="form.invalid || guardando()"
            class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors font-semibold">
            @if (guardando()) {
              <span class="flex items-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Guardando...
              </span>
            } @else {
              {{ egresoEditando() ? 'Actualizar' : 'Registrar' }}
            }
          </button>
        </div>
      </form>
    </div>
  </div>
}

<!-- Modal de confirmación para eliminar -->
@if (egresoAEliminar()) {
  <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
    <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl">
      <div class="bg-red-500 text-white p-6 rounded-t-2xl flex items-center gap-3">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
        <div>
          <h2 class="text-xl font-bold">Eliminar gasto</h2>
          <p class="text-red-100 text-sm">Esta acción no se puede deshacer</p>
        </div>
      </div>
      <div class="p-6">
        <p class="text-gray-700 mb-6">¿Estás seguro? Esta acción revertirá el saldo en la caja.</p>
        <div class="flex justify-end gap-3">
          <button (click)="egresoAEliminar.set(null)"
            class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-semibold">
            Cancelar
          </button>
          <button (click)="eliminar()"
            class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
}
  `,
})
export class GastosProyectoComponent implements OnInit, OnDestroy {
  private egresosService = inject(EgresosService);
  private cajaService = inject(CajaService);
  private fb = inject(FormBuilder);
  urbCtx = inject(UrbanizacionContextService);

  egresos = signal<Egreso[]>([]);
  cajas = signal<Caja[]>([]);
  resumen = signal({ totalEgresos: 0, montoTotal: 0 });
  cargando = signal(false);
  guardando = signal(false);
  modalVisible = signal(false);
  egresoEditando = signal<Egreso | null>(null);
  egresoAEliminar = signal<Egreso | null>(null);
  archivosSeleccionados = signal<File[]>([]);
  error = signal('');

  filtroFechaInicio = '';
  filtroFechaFin = '';

  form = this.fb.group({
    descripcion: ['', Validators.required],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    fecha: [new Date().toISOString().split('T')[0]],
    cajaId: [null as number | null, Validators.required],
    metodoPago: ['EFECTIVO', Validators.required],
  });

  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.urbCtx.recuperar();
    if (this.urbCtx.urbanizacion()) {
      this.cargar();
      this.cargarCajas();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private cargarCajas() {
    // Usar el servicio de cajas directamente
    this.cajaService.cargarCajas();
    
    // Suscribirse a los cambios de cajas
    this.subscriptions.push(
      new Observable<Caja[]>(subscriber => {
        const update = () => {
          const abiertas = this.cajaService.cajas().filter(c => c.estado === 'ABIERTA');
          subscriber.next(abiertas);
        };
        update();
        const interval = setInterval(update, 500);
        return () => clearInterval(interval);
      }).subscribe({
        next: (cajas) => this.cajas.set(cajas),
        error: () => this.cajas.set([])
      })
    );
  }

  cargar() {
    const urbId = this.urbCtx.urbanizacionId;
    if (!urbId) return;

    this.cargando.set(true);
    const filtros: any = { urbanizacionId: urbId };

    if (this.filtroFechaInicio) filtros.fechaInicio = this.filtroFechaInicio;
    if (this.filtroFechaFin) filtros.fechaFin = this.filtroFechaFin;

    this.subscriptions.push(
      this.egresosService.getAll(filtros).subscribe({
        next: (res) => {
          this.egresos.set(res.egresos);
          this.resumen.set(res.resumen);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error cargando egresos:', err);
          this.cargando.set(false);
        }
      })
    );
  }

  abrirModal() {
    this.egresoEditando.set(null);
    this.form.reset({
      descripcion: '',
      monto: null,
      fecha: new Date().toISOString().split('T')[0],
      cajaId: null,
      metodoPago: 'EFECTIVO'
    });
    this.archivosSeleccionados.set([]);
    this.error.set('');
    this.modalVisible.set(true);
  }

  abrirEditar(e: Egreso) {
    this.egresoEditando.set(e);
    this.form.patchValue({
      descripcion: e.descripcion,
      monto: e.monto,
      fecha: e.fecha?.substring(0, 10) ?? '',
      cajaId: e.cajaId,
      metodoPago: e.metodoPago ?? 'EFECTIVO'
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
    if (input.files && input.files.length) {
      const nuevosArchivos = Array.from(input.files);
      this.archivosSeleccionados.update(prev => [...prev, ...nuevosArchivos]);
      input.value = '';
    }
  }

  quitarArchivo(index: number) {
    this.archivosSeleccionados.update(prev => prev.filter((_, i) => i !== index));
  }

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
      urbanizacionId: this.urbCtx.urbanizacionId
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

  confirmarEliminar(e: Egreso) {
    this.egresoAEliminar.set(e);
  }

  eliminar() {
    const e = this.egresoAEliminar();
    if (!e) return;

    this.subscriptions.push(
      this.egresosService.remove(e.id).subscribe({
        next: () => {
          this.egresoAEliminar.set(null);
          this.cargar();
        },
        error: (err) => {
          this.error.set('Error al eliminar el gasto');
        }
      })
    );
  }

descargarVoucher(a: Archivo) {
  const url = `${environment.apiUrl}${a.urlArchivo}`;
  
  // Crear un enlace temporal y hacer click
  const link = document.createElement('a');
  link.href = url;
  link.download = a.nombreArchivo || 'voucher';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

  limpiarFiltros() {
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.cargar();
  }

  formatMonto(v: number): string {
    return v?.toLocaleString('es-BO', { minimumFractionDigits: 2 }) ?? '0.00';
  }
}