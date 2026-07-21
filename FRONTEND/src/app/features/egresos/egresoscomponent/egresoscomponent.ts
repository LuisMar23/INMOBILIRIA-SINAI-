// egresos.component.ts
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowTrendDown, faPlus, faReceipt, faSackDollar,
  faCashRegister, faCalendarDays, faSliders, faCalendarMinus,
  faCalendarPlus, faTag, faMagnifyingGlass, faRotateLeft,
  faFilePdf, faChartPie, faList, faListUl, faFolderOpen,
  faHashtag, faAlignLeft, faCoins, faCircleUser, faGears,
  faPenToSquare, faTrashCan, faSpinner, faFloppyDisk, faXmark,
  faTriangleExclamation, faCircleExclamation, faCircleInfo,
  faMoneyBillWave, faLayerGroup, faLockOpen, faLock,
  faWallet, faChevronDown, faBars,
  faUser,
  faCalendar
} from '@fortawesome/free-solid-svg-icons';

import { Egreso, FiltrosEgresoDto, CreateEgresoDto } from '../../../core/interfaces/egresos.interface';
import { EgresosService } from '../services/egresos.service';
import { PdfEgresosService } from '../services/pdfEgresos.service';

type VistaReporte = 'lista' | 'cajas';

@Component({
  selector: 'app-egresos',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe, FontAwesomeModule],
  template: `
  <div class="eg-wrap">

    <!-- ══ ENCABEZADO ══════════════════════════════════════════ -->
    <div class="eg-page-header">
      <div class="eg-page-header-left">
        <div class="eg-page-icon">
          <fa-icon [icon]="faArrowTrendDown"></fa-icon>
        </div>
        <div>
          <h1 class="eg-page-title">Gestión de Egresos</h1>
          <p class="eg-page-sub">Control de gastos y salidas de caja</p>
        </div>
      </div>
      <button (click)="abrirModalCrear()" class="eg-btn-primary">
        <fa-icon [icon]="faPlus"></fa-icon>
        Nuevo Egreso
      </button>
    </div>

    <!-- ══ TARJETAS RESUMEN ═════════════════════════════════════ -->
    <div class="eg-stats-row">
      <div class="eg-stat-card">
        <div class="eg-stat-icon eg-stat-icon-slate">
          <fa-icon [icon]="faReceipt"></fa-icon>
        </div>
        <div>
          <p class="eg-stat-label">Total Egresos</p>
          <p class="eg-stat-val">{{ egresosService.egresos()?.resumen?.totalEgresos || 0 }}</p>
        </div>
      </div>
      <div class="eg-stat-card eg-stat-card-red">
        <div class="eg-stat-icon eg-stat-icon-red">
          <fa-icon [icon]="faSackDollar"></fa-icon>
        </div>
        <div>
          <p class="eg-stat-label eg-sl-red">Monto Total</p>
          <p class="eg-stat-val eg-sv-red">{{ egresosService.egresos()?.resumen?.montoTotal | currency:'BOB' }}</p>
        </div>
      </div>
      <div class="eg-stat-card">
        <div class="eg-stat-icon eg-stat-icon-green">
          <fa-icon [icon]="faCashRegister"></fa-icon>
        </div>
        <div>
          <p class="eg-stat-label">Cajas Abiertas</p>
          <p class="eg-stat-val eg-sv-green">{{ cajasAbiertas() }}</p>
        </div>
      </div>
      <div class="eg-stat-card">
        <div class="eg-stat-icon eg-stat-icon-amber">
          <fa-icon [icon]="faCalendarDays"></fa-icon>
        </div>
        <div>
          <p class="eg-stat-label">Fecha Actual</p>
          <p class="eg-stat-val eg-sv-amber">{{ fechaHoy }}</p>
        </div>
      </div>
    </div>

    <!-- ══ FILTROS ══════════════════════════════════════════════ -->
    <div class="eg-card">
      <div class="eg-card-header">
        <div class="eg-chdr-left">
          <fa-icon [icon]="faSliders" class="eg-icon-green"></fa-icon>
          <span class="eg-card-title">Filtros</span>
          <span class="eg-card-sub">— Buscar y exportar</span>
        </div>
      </div>
      <div class="eg-filters-body">

        <label class="eg-toggle-wrap">
          <span class="eg-switch">
            <input type="checkbox" [(ngModel)]="filtrarPorFechas">
            <span class="eg-slider"></span>
          </span>
          <span class="eg-tgl-label">
            <fa-icon [icon]="faCalendar"></fa-icon> Por Fechas
          </span>
        </label>

        <div class="eg-field" [class.eg-disabled]="!filtrarPorFechas">
          <span class="eg-label"><fa-icon [icon]="faCalendarMinus"></fa-icon> Desde</span>
          <input type="date" class="eg-input" [(ngModel)]="filtros.fechaInicio" [disabled]="!filtrarPorFechas">
        </div>

        <div class="eg-field" [class.eg-disabled]="!filtrarPorFechas">
          <span class="eg-label"><fa-icon [icon]="faCalendarPlus"></fa-icon> Hasta</span>
          <input type="date" class="eg-input" [(ngModel)]="filtros.fechaFin" [disabled]="!filtrarPorFechas">
        </div>

        <div class="eg-field">
          <span class="eg-label"><fa-icon [icon]="faCashRegister"></fa-icon> Caja</span>
          <select class="eg-select" [(ngModel)]="filtros.cajaId">
            <option [ngValue]="undefined">Todas...</option>
            <option *ngFor="let c of egresosService.cajas()" [ngValue]="c.id">{{ c.nombre }}</option>
          </select>
        </div>

        <div class="eg-sep"></div>

        <button (click)="aplicarFiltros()" class="eg-btn-outline-green">
          <fa-icon [icon]="faMagnifyingGlass"></fa-icon> Buscar
        </button>
        <button (click)="limpiarFiltros()" class="eg-btn-outline-slate">
          <fa-icon [icon]="faRotateLeft"></fa-icon> Limpiar
        </button>

        <div class="eg-sep"></div>

        <button
          (click)="descargarReporteGastos()"
          [disabled]="!egresosService.egresos()?.egresos?.length"
          class="eg-btn-pdf eg-btn-pdf-green"
          title="Reporte detallado de gastos">
          <fa-icon [icon]="faFilePdf"></fa-icon> Gastos
        </button>
        <button
          (click)="descargarConsolidado()"
          [disabled]="!egresosService.egresos()?.egresos?.length"
          class="eg-btn-pdf eg-btn-pdf-slate"
          title="Consolidado por mes">
          <fa-icon [icon]="faChartPie"></fa-icon> Consolidado
        </button>
        <button
          (click)="descargarPorCaja()"
          [disabled]="!egresosService.reporteCajas()"
          class="eg-btn-pdf eg-btn-pdf-teal"
          title="Reporte por caja (abra la pestaña Cajas primero)">
          <fa-icon [icon]="faCashRegister"></fa-icon> Por Caja
        </button>

      </div>
    </div>

    <!-- ══ TABS + CONTENIDO ════════════════════════════════════ -->
    <div class="eg-card">
      <div class="eg-card-header">
        <div class="eg-tabs">
          <button *ngFor="let tab of tabs"
            (click)="cambiarTab(tab.key)"
            class="eg-tab" [class.eg-tab-active]="vistaActual() === tab.key">
            <fa-icon [icon]="tab.icon"></fa-icon> {{ tab.label }}
          </button>
        </div>
        <span *ngIf="vistaActual() === 'lista'" class="eg-count-badge">
          <fa-icon [icon]="faListUl"></fa-icon>
          {{ egresosService.egresos()?.egresos?.length || 0 }} registros
        </span>
      </div>

      <div *ngIf="egresosService.loading()" class="eg-loading">
        <div class="eg-spinner"></div>
        <p>Cargando datos...</p>
      </div>

      <div *ngIf="egresosService.error() && !egresosService.loading()" class="eg-error">
        <fa-icon [icon]="faTriangleExclamation"></fa-icon>
        {{ egresosService.error() }}
      </div>

      <div *ngIf="!egresosService.loading()" [ngSwitch]="vistaActual()">

        <!-- ── LISTA ──────────────────────────────────────────── -->
        <div *ngSwitchCase="'lista'">
          <div *ngIf="!egresosService.egresos()?.egresos?.length" class="eg-empty">
            <div class="eg-empty-icon"><fa-icon [icon]="faFolderOpen"></fa-icon></div>
            <p class="eg-empty-title">No hay egresos registrados</p>
            <p class="eg-empty-sub">Haz clic en "Nuevo Egreso" para comenzar</p>
          </div>

          <div *ngIf="egresosService.egresos()?.egresos?.length" class="eg-table-wrap">
            <table class="eg-table">
              <thead>
                <tr>
                  <th><fa-icon [icon]="faHashtag"></fa-icon></th>
                  <th><fa-icon [icon]="faCalendar"></fa-icon> Fecha</th>
                  <th><fa-icon [icon]="faAlignLeft"></fa-icon> Descripción</th>
                  <th><fa-icon [icon]="faTag"></fa-icon> Categoría</th>
                  <th><fa-icon [icon]="faCashRegister"></fa-icon> Caja</th>
                  <th><fa-icon [icon]="faUser"></fa-icon> Registrado por</th>
                  <th class="eg-th-right"><fa-icon [icon]="faCoins"></fa-icon> Monto</th>
                  <th class="eg-th-center"><fa-icon [icon]="faGears"></fa-icon></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let e of egresosService.egresos()?.egresos">
                  <td class="eg-td-id">#{{ e.id }}</td>
                  <td class="eg-td-date">{{ e.fecha | date:'dd/MM/yyyy' }}</td>
                  <td class="eg-td-desc">{{ e.descripcion }}</td>
                  <td class="eg-td-muted">
                    <fa-icon [icon]="faCashRegister" class="eg-icon-xs"></fa-icon> {{ e.caja?.nombre || '—' }}
                  </td>
                  <td class="eg-td-muted">
                    <fa-icon [icon]="faCircleUser" class="eg-icon-xs"></fa-icon> {{ e.usuario?.fullName || '—' }}
                  </td>
                  <td class="eg-td-monto">{{ e.monto | currency:'BOB' }}</td>
                  <td class="eg-th-center">
                    <div class="eg-actions">
                      <button (click)="abrirModalEditar(e)" class="eg-action-btn eg-btn-edit" title="Editar">
                        <fa-icon [icon]="faPenToSquare"></fa-icon>
                      </button>
                      <button (click)="confirmarEliminar(e)" class="eg-action-btn eg-btn-del" title="Eliminar">
                        <fa-icon [icon]="faTrashCan"></fa-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── CAJAS ──────────────────────────────────────────── -->
        <div *ngSwitchCase="'cajas'" class="eg-rpt-body">
          <div *ngIf="!egresosService.reporteCajas()" class="eg-empty">
            <div class="eg-empty-icon"><fa-icon [icon]="faCashRegister"></fa-icon></div>
            <p class="eg-empty-title">Sin datos de cajas</p>
            <p class="eg-empty-sub">Aplica filtros y presiona Buscar</p>
          </div>

          <div *ngIf="egresosService.reporteCajas()">
            <div class="eg-rpt-stats">
              <div class="eg-rstat eg-rstat-green">
                <fa-icon [icon]="faMoneyBillWave" class="eg-icon-green-lg"></fa-icon>
                <div>
                  <p class="eg-rstat-label">Monto Total</p>
                  <p class="eg-rstat-val">{{ egresosService.reporteCajas()?.resumen?.montoTotal | currency:'BOB' }}</p>
                </div>
              </div>
              <div class="eg-rstat">
                <fa-icon [icon]="faLayerGroup" class="eg-icon-slate-lg"></fa-icon>
                <div>
                  <p class="eg-rstat-label">Total Cajas</p>
                  <p class="eg-rstat-val eg-sv-slate">{{ egresosService.reporteCajas()?.resumen?.totalCajas }}</p>
                </div>
              </div>
            </div>

            <div class="eg-cajas-list">
              <div *ngFor="let g of egresosService.reporteCajas()?.cajas; let i = index" class="eg-caja-row">
                <span class="eg-caja-rank">{{ i + 1 }}</span>
                <div class="eg-caja-ico">
                  <fa-icon [icon]="faCashRegister"></fa-icon>
                </div>
                <div class="eg-caja-info">
                  <p class="eg-caja-nombre">{{ g.caja.nombre }}</p>
                  <p class="eg-caja-sub">
                    <fa-icon [icon]="faReceipt"></fa-icon> {{ g.totalEgresos }} egresos
                    &nbsp;·&nbsp;
                    <fa-icon [icon]="faWallet"></fa-icon> Saldo: {{ g.caja.saldoActual | currency:'BOB' }}
                  </p>
                </div>
                <div class="eg-caja-right">
                  <p class="eg-caja-monto">{{ g.montoTotal | currency:'BOB' }}</p>
                  <span class="eg-badge"
                    [class.eg-badge-green]="g.caja.estado === 'ABIERTA'"
                    [class.eg-badge-slate]="g.caja.estado === 'CERRADA'">
                    <fa-icon [icon]="g.caja.estado === 'ABIERTA' ? faLockOpen : faLock"></fa-icon>
                    {{ g.caja.estado }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>

  <!-- ══ MODAL CREAR / EDITAR ════════════════════════════════════ -->
  <div *ngIf="modalAbierto()" class="eg-overlay" (click)="cerrarModal()">
    <div class="eg-modal" (click)="$event.stopPropagation()">
      <div class="eg-modal-header">
        <div class="eg-mhdr-left">
          <div class="eg-modal-icon"><fa-icon [icon]="faArrowTrendDown"></fa-icon></div>
          <span class="eg-modal-title">{{ modoEdicion() ? 'Editar Egreso' : 'Nuevo Egreso' }}</span>
        </div>
        <button (click)="cerrarModal()" class="eg-modal-close">
          <fa-icon [icon]="faXmark"></fa-icon>
        </button>
      </div>

      <div class="eg-modal-body">
        <div class="eg-mfield">
          <label class="eg-mlabel"><fa-icon [icon]="faAlignLeft"></fa-icon> Descripción <span class="eg-req">*</span></label>
          <input type="text" placeholder="Ej: Compra de materiales de oficina" class="eg-minput" [(ngModel)]="form.descripcion">
        </div>

        <div class="eg-mrow2">
          <div class="eg-mfield">
            <label class="eg-mlabel"><fa-icon [icon]="faCoins"></fa-icon> Monto (BOB) <span class="eg-req">*</span></label>
            <input type="number" placeholder="0.00" min="0" class="eg-minput" [(ngModel)]="form.monto">
          </div>
          <div class="eg-mfield">
            <label class="eg-mlabel"><fa-icon [icon]="faCalendar"></fa-icon> Fecha</label>
            <input type="date" class="eg-minput" [(ngModel)]="form.fecha">
          </div>
        </div>

        <div class="eg-mfield">
          <label class="eg-mlabel"><fa-icon [icon]="faWallet"></fa-icon> Método de Pago</label>
          <select class="eg-mselect" [(ngModel)]="form.metodoPago">
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="TARJETA">Tarjeta</option>
          </select>
        </div>

        <div class="eg-mfield">
          <label class="eg-mlabel"><fa-icon [icon]="faCashRegister"></fa-icon> Caja <span class="eg-req">*</span></label>
          <select class="eg-mselect" [(ngModel)]="form.cajaId">
            <option [ngValue]="undefined">Seleccione una caja...</option>
            <option *ngFor="let c of cajasAbiertas2()" [ngValue]="c.id">
              {{ c.nombre }} — Saldo: {{ c.saldoActual | currency:'BOB' }}
            </option>
          </select>
          <span *ngIf="egresosService.cajas().length && !cajasAbiertas2().length" class="eg-hint-red">
            <fa-icon [icon]="faTriangleExclamation"></fa-icon> No hay cajas abiertas disponibles
          </span>
        </div>

        <div *ngIf="errorModal()" class="eg-modal-error">
          <fa-icon [icon]="faCircleExclamation"></fa-icon> {{ errorModal() }}
        </div>
      </div>

      <div class="eg-modal-footer">
        <button (click)="cerrarModal()" class="eg-btn-outline-slate">
          <fa-icon [icon]="faXmark"></fa-icon> Cancelar
        </button>
        <button (click)="guardar()" [disabled]="egresosService.loading()" class="eg-btn-primary">
          <fa-icon *ngIf="egresosService.loading()" [icon]="faSpinner" ></fa-icon>
          <fa-icon *ngIf="!egresosService.loading()" [icon]="faFloppyDisk"></fa-icon>
          {{ modoEdicion() ? 'Guardar Cambios' : 'Registrar Egreso' }}
        </button>
      </div>
    </div>
  </div>

  <!-- ══ MODAL ELIMINAR ═══════════════════════════════════════════ -->
  <div *ngIf="modalEliminar()" class="eg-overlay" (click)="modalEliminar.set(false)">
    <div class="eg-modal eg-modal-sm" (click)="$event.stopPropagation()">
      <div class="eg-del-body">
        <div class="eg-del-icon"><fa-icon [icon]="faTrashCan"></fa-icon></div>
        <p class="eg-del-title">¿Eliminar este egreso?</p>
        <p class="eg-del-desc">
          <strong>{{ egresoAEliminar()?.descripcion }}</strong><br>
          {{ egresoAEliminar()?.monto | currency:'BOB' }}
        </p>
        <div class="eg-del-warn">
          <fa-icon [icon]="faCircleInfo"></fa-icon>
          El saldo de la caja será revertido automáticamente.
        </div>
      </div>
      <div class="eg-modal-footer">
        <button (click)="modalEliminar.set(false)" class="eg-btn-outline-slate">
          <fa-icon [icon]="faXmark"></fa-icon> Cancelar
        </button>
        <button (click)="eliminar()" [disabled]="egresosService.loading()" class="eg-btn-danger">
          <fa-icon *ngIf="egresosService.loading()" [icon]="faSpinner" ></fa-icon>
          <fa-icon *ngIf="!egresosService.loading()" [icon]="faTrashCan"></fa-icon>
          Sí, eliminar
        </button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .eg-wrap{padding:1rem;max-width:1100px;margin:auto;display:flex;flex-direction:column;gap:.85rem}

    /* page header */
    .eg-page-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem}
    .eg-page-header-left{display:flex;align-items:center;gap:.75rem}
    .eg-page-icon{width:38px;height:38px;background:#dcfce7;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#16a34a;font-size:16px;flex-shrink:0}
    .eg-page-title{font-size:15px;font-weight:700;color:#1e293b;margin:0}
    .eg-page-sub{font-size:11px;color:#94a3b8;margin:0}

    /* stat cards */
    .eg-stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:.65rem}
    .eg-stat-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:.85rem 1rem;display:flex;align-items:center;gap:.75rem}
    .eg-stat-card-red{background:#f0fdf4;border-color:#bbf7d0}
    .eg-stat-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
    .eg-stat-icon-slate{background:#f1f5f9;color:#475569}
    .eg-stat-icon-red{background:#dcfce7;color:#16a34a}
    .eg-stat-icon-green{background:#dcfce7;color:#16a34a}
    .eg-stat-icon-amber{background:#fef3c7;color:#d97706}
    .eg-stat-label{font-size:10px;font-weight:500;color:#94a3b8;margin:0 0 2px}
    .eg-sl-red{color:#16a34a}
    .eg-stat-val{font-size:1.3rem;font-weight:700;margin:0;color:#1e293b}
    .eg-sv-red{color:#16a34a}
    .eg-sv-green{color:#16a34a}
    .eg-sv-amber{color:#d97706;font-size:.9rem}
    .eg-sv-slate{color:#334155}

    /* card */
    .eg-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
    .eg-card-header{display:flex;align-items:center;justify-content:space-between;padding:.6rem 1rem;border-bottom:1px solid #e2e8f0;gap:.5rem;flex-wrap:wrap}
    .eg-chdr-left{display:flex;align-items:center;gap:.4rem}
    .eg-icon-green{color:#16a34a;font-size:13px}
    .eg-card-title{font-size:13px;font-weight:600;color:#1e293b}
    .eg-card-sub{font-size:11px;color:#94a3b8;font-style:italic}

    /* filters */
    .eg-filters-body{padding:.65rem 1rem;display:flex;flex-wrap:wrap;align-items:flex-end;gap:.45rem}
    .eg-sep{width:1px;height:26px;background:#e2e8f0;margin:0 .1rem;align-self:center}
    .eg-field{display:flex;flex-direction:column;gap:.2rem}
    .eg-label{font-size:11px;font-weight:500;color:#64748b;display:flex;align-items:center;gap:.3rem}
    .eg-label fa-icon{font-size:10px;color:#94a3b8}
    .eg-input{border:1px solid #d1d5db;border-radius:7px;padding:.28rem .5rem;font-size:12px;height:30px;outline:none;color:#1e293b;background:#fff}
    .eg-input:focus{border-color:#16a34a;box-shadow:0 0 0 2px rgba(22,163,74,.1)}
    .eg-select{border:1px solid #d1d5db;border-radius:7px;padding:.28rem .5rem;font-size:12px;height:30px;outline:none;color:#1e293b;background:#fff;cursor:pointer;min-width:140px}
    .eg-select:focus{border-color:#16a34a}
    .eg-disabled{opacity:.38;pointer-events:none}

    /* toggle */
    .eg-toggle-wrap{display:flex;align-items:center;gap:.4rem;background:#f8fafc;border:1px solid #d1d5db;border-radius:8px;padding:.28rem .65rem;cursor:pointer}
    .eg-tgl-label{font-size:12px;font-weight:500;color:#374151;display:flex;align-items:center;gap:.3rem}
    .eg-tgl-label fa-icon{font-size:10px;color:#64748b}
    .eg-switch{position:relative;width:32px;height:18px;flex-shrink:0}
    .eg-switch input{opacity:0;width:0;height:0}
    .eg-slider{position:absolute;inset:0;background:#cbd5e0;border-radius:9px;transition:.2s;cursor:pointer}
    .eg-slider:before{content:'';position:absolute;width:14px;height:14px;left:2px;bottom:2px;background:#fff;border-radius:50%;transition:.2s}
    input:checked ~ .eg-slider{background:#16a34a}
    input:checked ~ .eg-slider:before{transform:translateX(14px)}

    /* buttons */
    .eg-btn-primary{display:inline-flex;align-items:center;gap:.4rem;background:#16a34a;color:#fff;border:none;border-radius:8px;padding:.4rem .85rem;font-size:12px;font-weight:600;cursor:pointer;height:32px;transition:background .15s}
    .eg-btn-primary:hover{background:#15803d}
    .eg-btn-primary:disabled{opacity:.5;cursor:not-allowed}
    .eg-btn-danger{display:inline-flex;align-items:center;gap:.4rem;background:#dc2626;color:#fff;border:none;border-radius:8px;padding:.4rem .85rem;font-size:12px;font-weight:600;cursor:pointer;transition:background .15s}
    .eg-btn-danger:hover{background:#b91c1c}
    .eg-btn-danger:disabled{opacity:.5}
    .eg-btn-outline-green{display:inline-flex;align-items:center;gap:.4rem;border:1.5px solid #16a34a;color:#16a34a;background:transparent;border-radius:7px;padding:.28rem .65rem;font-size:12px;font-weight:500;cursor:pointer;height:30px;transition:all .15s;white-space:nowrap}
    .eg-btn-outline-green:hover{background:#16a34a;color:#fff}
    .eg-btn-outline-slate{display:inline-flex;align-items:center;gap:.4rem;border:1.5px solid #cbd5e0;color:#64748b;background:transparent;border-radius:7px;padding:.28rem .65rem;font-size:12px;font-weight:500;cursor:pointer;height:30px;transition:all .15s;white-space:nowrap}
    .eg-btn-outline-slate:hover{background:#f1f5f9}

    /* pdf buttons */
    .eg-btn-pdf{display:inline-flex;align-items:center;gap:.35rem;border:1.5px solid;border-radius:7px;padding:.28rem .65rem;font-size:11px;font-weight:600;cursor:pointer;background:transparent;height:30px;transition:all .15s;white-space:nowrap}
    .eg-btn-pdf:disabled{opacity:.38;cursor:not-allowed}
    .eg-btn-pdf-green{border-color:#16a34a;color:#16a34a}
    .eg-btn-pdf-green:not(:disabled):hover{background:#16a34a;color:#fff}
    .eg-btn-pdf-slate{border-color:#64748b;color:#64748b}
    .eg-btn-pdf-slate:not(:disabled):hover{background:#64748b;color:#fff}
    .eg-btn-pdf-teal{border-color:#0d9488;color:#0d9488}
    .eg-btn-pdf-teal:not(:disabled):hover{background:#0d9488;color:#fff}

    /* tabs */
    .eg-tabs{display:flex;gap:.35rem}
    .eg-tab{display:inline-flex;align-items:center;gap:.4rem;border:none;border-radius:8px;padding:.35rem .75rem;font-size:12px;font-weight:500;cursor:pointer;background:#f1f5f9;color:#64748b;transition:all .15s}
    .eg-tab-active{background:#16a34a!important;color:#fff!important}
    .eg-tab:not(.eg-tab-active):hover{background:#f0fdf4;color:#16a34a}
    .eg-count-badge{display:inline-flex;align-items:center;gap:.3rem;font-size:11px;color:#94a3b8;background:#f8fafc;border:1px solid #e2e8f0;border-radius:99px;padding:.2rem .65rem}

    /* table */
    .eg-table-wrap{overflow-x:auto}
    .eg-table{width:100%;border-collapse:collapse;font-size:12px}
    .eg-table thead{background:#f8fafc;border-bottom:1px solid #e2e8f0}
    .eg-table th{padding:.5rem .85rem;text-align:left;font-size:11px;font-weight:600;color:#64748b;white-space:nowrap}
    .eg-table th fa-icon{margin-right:.3rem;font-size:10px}
    .eg-th-right{text-align:right}
    .eg-th-center{text-align:center}
    .eg-table td{padding:.5rem .85rem;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:middle}
    .eg-table tr:last-child td{border-bottom:none}
    .eg-table tbody tr:hover td{background:#f0fdf4}
    .eg-td-id{color:#94a3b8;font-size:11px}
    .eg-td-date{color:#64748b;white-space:nowrap}
    .eg-td-desc{font-weight:500;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .eg-td-muted{color:#64748b;white-space:nowrap}
    .eg-td-monto{text-align:right;font-weight:700;color:#16a34a;white-space:nowrap}
    .eg-icon-xs{color:#cbd5e0;margin-right:.3rem;font-size:10px}

    /* badges */
    .eg-badge{display:inline-flex;align-items:center;gap:.25rem;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:500}
    .eg-badge-green{background:#dcfce7;color:#15803d}
    .eg-badge-slate{background:#f1f5f9;color:#475569}

    /* actions */
    .eg-actions{display:flex;justify-content:center;gap:.35rem}
    .eg-action-btn{width:28px;height:28px;border:1px solid;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:transparent;transition:all .15s;font-size:12px}
    .eg-btn-edit{border-color:#bfdbfe;color:#2563eb}
    .eg-btn-edit:hover{background:#2563eb;color:#fff;border-color:#2563eb}
    .eg-btn-del{border-color:#fecaca;color:#ef4444}
    .eg-btn-del:hover{background:#dc2626;color:#fff;border-color:#dc2626}

    /* empty */
    .eg-empty{display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:3rem 1rem}
    .eg-empty-icon{width:56px;height:56px;background:#f8fafc;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;color:#cbd5e0}
    .eg-empty-title{font-size:14px;font-weight:600;color:#475569;margin:.25rem 0 0}
    .eg-empty-sub{font-size:12px;color:#94a3b8;margin:0}

    /* loading/error */
    .eg-loading{display:flex;flex-direction:column;align-items:center;gap:.65rem;padding:2.5rem;color:#94a3b8;font-size:13px}
    .eg-spinner{width:34px;height:34px;border:3px solid #f1f5f9;border-top-color:#16a34a;border-radius:50%;animation:eg-spin .7s linear infinite}
    @keyframes eg-spin{to{transform:rotate(360deg)}}
    .eg-error{display:flex;align-items:center;gap:.5rem;margin:.75rem 1rem;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:.6rem .85rem;font-size:12px;color:#dc2626}

    /* report (cajas) */
    .eg-rpt-body{padding:1rem}
    .eg-rpt-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:.65rem;margin-bottom:1rem}
    .eg-rstat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:.75rem 1rem;display:flex;align-items:center;gap:.65rem}
    .eg-rstat-green{background:#f0fdf4;border-color:#bbf7d0}
    .eg-icon-green-lg{font-size:18px;color:#16a34a;flex-shrink:0}
    .eg-icon-slate-lg{font-size:18px;color:#64748b;flex-shrink:0}
    .eg-rstat-label{font-size:10px;color:#94a3b8;margin:0 0 2px}
    .eg-rstat-val{font-size:1.15rem;font-weight:700;color:#16a34a;margin:0}
    .eg-cajas-list{display:flex;flex-direction:column;gap:.5rem}
    .eg-caja-row{display:flex;align-items:center;gap:.75rem;border:1px solid #e2e8f0;border-radius:10px;padding:.65rem .85rem;transition:box-shadow .15s}
    .eg-caja-row:hover{box-shadow:0 2px 8px rgba(0,0,0,.06)}
    .eg-caja-rank{width:20px;font-size:11px;font-weight:700;color:#cbd5e0;text-align:center;flex-shrink:0}
    .eg-caja-ico{width:34px;height:34px;background:#dcfce7;border-radius:9px;display:flex;align-items:center;justify-content:center;color:#16a34a;font-size:14px;flex-shrink:0}
    .eg-caja-info{flex:1;min-width:0}
    .eg-caja-nombre{font-size:13px;font-weight:600;color:#1e293b;margin:0 0 2px}
    .eg-caja-sub{font-size:11px;color:#94a3b8;margin:0;display:flex;align-items:center;gap:.3rem;flex-wrap:wrap}
    .eg-caja-right{text-align:right;flex-shrink:0}
    .eg-caja-monto{font-size:14px;font-weight:700;color:#16a34a;margin:0 0 3px}

    /* modal */
    .eg-overlay{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);backdrop-filter:blur(3px);padding:1rem}
    .eg-modal{background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.2);width:100%;max-width:480px;overflow:hidden}
    .eg-modal-sm{max-width:380px}
    .eg-modal-header{display:flex;align-items:center;justify-content:space-between;padding:.85rem 1.1rem;border-bottom:1px solid #f1f5f9}
    .eg-mhdr-left{display:flex;align-items:center;gap:.6rem}
    .eg-modal-icon{width:30px;height:30px;background:#dcfce7;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#16a34a;font-size:13px}
    .eg-modal-title{font-size:13px;font-weight:700;color:#1e293b}
    .eg-modal-close{width:28px;height:28px;border:none;background:transparent;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#94a3b8;cursor:pointer;transition:all .15s}
    .eg-modal-close:hover{background:#f1f5f9;color:#475569}
    .eg-modal-body{padding:1rem 1.1rem;display:flex;flex-direction:column;gap:.75rem}
    .eg-mfield{display:flex;flex-direction:column;gap:.25rem}
    .eg-mrow2{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}
    .eg-mlabel{font-size:11px;font-weight:600;color:#64748b;display:flex;align-items:center;gap:.3rem}
    .eg-mlabel fa-icon{font-size:10px;color:#94a3b8}
    .eg-minput{border:1px solid #d1d5db;border-radius:8px;padding:.4rem .65rem;font-size:12px;outline:none;color:#1e293b;width:100%}
    .eg-minput:focus{border-color:#16a34a;box-shadow:0 0 0 2px rgba(22,163,74,.1)}
    .eg-mselect{border:1px solid #d1d5db;border-radius:8px;padding:.4rem .65rem;font-size:12px;outline:none;color:#1e293b;background:#fff;cursor:pointer;width:100%}
    .eg-mselect:focus{border-color:#16a34a}
    .eg-hint-red{font-size:10px;color:#ef4444;display:flex;align-items:center;gap:.25rem}
    .eg-req{color:#ef4444}
    .eg-modal-error{display:flex;align-items:center;gap:.45rem;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:.55rem .75rem;font-size:12px;color:#dc2626}
    .eg-modal-footer{display:flex;justify-content:flex-end;gap:.5rem;padding:.85rem 1.1rem;border-top:1px solid #f1f5f9;background:#fafafa}

    /* delete modal */
    .eg-del-body{display:flex;flex-direction:column;align-items:center;gap:.6rem;padding:1.5rem 1.1rem 1rem;text-align:center}
    .eg-del-icon{width:52px;height:52px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;color:#dc2626}
    .eg-del-title{font-size:14px;font-weight:700;color:#1e293b;margin:0}
    .eg-del-desc{font-size:12px;color:#64748b;margin:0;line-height:1.5}
    .eg-del-warn{display:flex;align-items:center;gap:.4rem;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:.5rem .75rem;font-size:11px;color:#92400e}

    :host{display:block}
  `]
})
export class EgresosComponent implements OnInit {
  // ── FA icons ──────────────────────────────────────────────────
  faArrowTrendDown = faArrowTrendDown;
  faPlus           = faPlus;
  faReceipt        = faReceipt;
  faSackDollar     = faSackDollar;
  faCashRegister   = faCashRegister;
  faCalendarDays   = faCalendarDays;
  faSliders        = faSliders;
  faCalendar       = faCalendar;
  faCalendarMinus  = faCalendarMinus;
  faCalendarPlus   = faCalendarPlus;
  faTag            = faTag;
  faMagnifyingGlass = faMagnifyingGlass;
  faRotateLeft     = faRotateLeft;
  faFilePdf        = faFilePdf;
  faChartPie       = faChartPie;
  faList           = faList;
  faListUl         = faListUl;
  faFolderOpen     = faFolderOpen;
  faHashtag        = faHashtag;
  faAlignLeft      = faAlignLeft;
  faCoins          = faCoins;
  faUser           = faUser;
  faCircleUser     = faCircleUser;
  faGears          = faGears;
  faPenToSquare    = faPenToSquare;
  faTrashCan       = faTrashCan;
  faSpinner        = faSpinner;
  faFloppyDisk     = faFloppyDisk;
  faXmark          = faXmark;
  faTriangleExclamation = faTriangleExclamation;
  faCircleExclamation   = faCircleExclamation;
  faCircleInfo     = faCircleInfo;
  faMoneyBillWave  = faMoneyBillWave;
  faLayerGroup     = faLayerGroup;
  faLockOpen       = faLockOpen;
  faLock           = faLock;
  faWallet         = faWallet;

  // ── Services ──────────────────────────────────────────────────
  egresosService = inject(EgresosService);
  private pdfService = inject(PdfEgresosService);

  vistaActual   = signal<VistaReporte>('lista');
  modalAbierto  = signal(false);
  modalEliminar = signal(false);
  modoEdicion   = signal(false);
  errorModal    = signal<string | null>(null);

  egresoEditando  = signal<Egreso | null>(null);
  egresoAEliminar = signal<Egreso | null>(null);

  filtrarPorFechas = false;
  filtros: FiltrosEgresoDto = {};
  fechaHoy = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

  form: CreateEgresoDto = {
    descripcion: '',
    monto: 0,
    fecha: '',
    cajaId: undefined as any,
    metodoPago: 'EFECTIVO',
  };

  tabs = [
    { key: 'lista' as VistaReporte, label: 'Lista de Egresos', icon: faList },
    { key: 'cajas' as VistaReporte, label: 'Por Caja',         icon: faCashRegister },
  ];

  cajasAbiertas  = computed(() => this.egresosService.cajas().filter(c => c.estado === 'ABIERTA').length);
  cajasAbiertas2 = computed(() => this.egresosService.cajas().filter(c => c.estado === 'ABIERTA'));

  ngOnInit() {
    this.egresosService.getCategorias();
    this.egresosService.getCajas();
    this.egresosService.getEgresos();
  }

  cambiarTab(key: VistaReporte) {
    this.vistaActual.set(key);
    if (key === 'cajas' && !this.egresosService.reporteCajas()) {
      this.egresosService.getReporteCajas(this.buildFiltros());
    }
  }

  private buildFiltros(): FiltrosEgresoDto {
    const f: FiltrosEgresoDto = {};
    if (this.filtrarPorFechas) {
      if (this.filtros.fechaInicio) f.fechaInicio = this.filtros.fechaInicio;
      if (this.filtros.fechaFin)    f.fechaFin    = this.filtros.fechaFin;
    }
    if (this.filtros.categoriaId) f.categoriaId = this.filtros.categoriaId;
    if (this.filtros.cajaId)      f.cajaId      = this.filtros.cajaId;
    return f;
  }

  aplicarFiltros() {
    const f = this.buildFiltros();
    this.egresosService.getEgresos(f);
    if (this.vistaActual() === 'cajas') this.egresosService.getReporteCajas(f);
  }

  limpiarFiltros() {
    this.filtros = {};
    this.filtrarPorFechas = false;
    this.egresosService.getEgresos();
  }

  abrirModalCrear() {
    this.modoEdicion.set(false);
    this.egresoEditando.set(null);
    this.errorModal.set(null);
    this.form = { descripcion: '', monto: 0, fecha: new Date().toISOString().split('T')[0], cajaId: undefined as any, metodoPago: 'EFECTIVO' };
    this.modalAbierto.set(true);
  }

  abrirModalEditar(egreso: Egreso) {
    this.modoEdicion.set(true);
    this.egresoEditando.set(egreso);
    this.errorModal.set(null);
    this.form = { descripcion: egreso.descripcion, monto: Number(egreso.monto), fecha: egreso.fecha.split('T')[0], cajaId: egreso.cajaId as number, metodoPago: 'EFECTIVO' };
    this.modalAbierto.set(true);
  }

  cerrarModal() { this.modalAbierto.set(false); this.errorModal.set(null); }

  guardar() {
    if (!this.form.descripcion?.trim())           { this.errorModal.set('La descripción es obligatoria'); return; }
    if (!this.form.monto || this.form.monto <= 0) { this.errorModal.set('El monto debe ser mayor a 0'); return; }
    if (!this.form.cajaId)                        { this.errorModal.set('Selecciona una caja'); return; }
    this.errorModal.set(null);

    const obs = this.modoEdicion()
      ? this.egresosService.updateEgreso(this.egresoEditando()!.id, this.form)
      : this.egresosService.createEgreso(this.form);

    obs.subscribe({
      next: () => { this.cerrarModal(); this.egresosService.getEgresos(); },
      error: (err) => this.errorModal.set(err.error?.message ?? 'Error al guardar'),
    });
  }

  confirmarEliminar(egreso: Egreso) { this.egresoAEliminar.set(egreso); this.modalEliminar.set(true); }

  eliminar() {
    const id = this.egresoAEliminar()?.id;
    if (!id) return;
    this.egresosService.deleteEgreso(id).subscribe({
      next: () => { this.modalEliminar.set(false); this.egresoAEliminar.set(null); this.egresosService.getEgresos(); this.egresosService.getCajas(); },
      error: (err) => console.error(err),
    });
  }

  async descargarReporteGastos() {
    const data = this.egresosService.egresos();
    if (data) await this.pdfService.generarReporteGastos(data, this.filtros);
  }

  async descargarConsolidado() {
    const data = this.egresosService.egresos();
    if (data) await this.pdfService.generarConsolidado(data, this.filtros);
  }

  async descargarPorCaja() {
    const data = this.egresosService.reporteCajas();
    if (data) await this.pdfService.generarGastosPorCaja(data, this.filtros);
  }
}