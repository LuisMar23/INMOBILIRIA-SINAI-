import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faUsers,
  faHomeUser,
  faReceipt,
  faDollarSign,
  faCity,
  faMapMarkedAlt,
  faFileInvoiceDollar,
  faCalendarCheck,
} from '@fortawesome/free-solid-svg-icons';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { DashboardService } from './services/dashboard.service';
import { UserService } from '../features/users/services/users.service';
import { ClientesService } from '../features/clientes/service/cliente.service';
import { VentaService } from '../features/venta/service/venta.service';
import { CajaService } from '../features/caja/service/caja.service';
import { LoteService } from '../features/lote/service/lote.service';
import { BaseChartDirective } from 'ng2-charts';
import { AuthService } from '../components/services/auth.service';
import { CotizacionService } from '../features/cotizacion/service/cotizacion.service';
import { ReservaService } from '../features/reserva/service/reserva.service';
import { UrbanizacionContextService } from '../core/services/urbanizacion-context.service';

@Component({
  selector: 'app-dashboard',
  imports: [FontAwesomeModule, CommonModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  faUsers = faUsers;
  faHomeUser = faHomeUser;
  faReceipt = faReceipt;
  faDollarSign = faDollarSign;
  faCity = faCity;
  faMapMarkedAlt = faMapMarkedAlt;
  faFileInvoiceDollar = faFileInvoiceDollar;
  faCalendarCheck = faCalendarCheck;
  private urbContext = inject(UrbanizacionContextService);
  private filtrarPorUrbanizacion<T>(
    items: T[],
    getUrbanizacionId: (item: T) => number | undefined,
  ): T[] {
    const urbId = this.urbContext.urbanizacionId;
    if (!urbId) return items; // si no hay activa, muestra todo
    return items.filter((item) => getUrbanizacionId(item) === urbId);
  }
  get urbanizacionActiva() {
    return this.urbContext.urbanizacion();
  }
  usuariosTotales = 0;
  totalClientes = 0;
  totalVentas = 0;
  totalPagos = 0;
  totalCaja = 0;
  cajasAbiertas = 0;
  cajasCerradas = 0;
  currentUser: any;
  showUsersOption = false;

  // Variables para datos reales
  lotesData = {
    disponibles: 0,
    vendidos: 0,
    reservados: 0,
    conOferta: 0, // Nueva para lotes CON_OFERTA
  };

  topAsesores: Array<{ nombre: string; ventas: number }> = [];
  urbanizacionMasDemandada = '';
  ventasUrbanizacion = 0;
  cotizacionesUrbanizacion = 0;

  resumen: any = null;
  isLoading = true;

  public lineChartData!: ChartData<'bar' | 'line'>;
  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Actividad mensual' },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
  };
  public lineChartType: ChartType = 'bar';

  constructor(
    private dashboardSvc: DashboardService,
    private userService: UserService,
    private clientesService: ClientesService,
    private ventaService: VentaService,
    private cajaService: CajaService,
    private loteService: LoteService,
    private cotizacionService: CotizacionService,
    private reservaService: ReservaService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.showUsersOption =
      this.currentUser && ['ADMINISTRADOR', 'SECRETARIA'].includes(this.currentUser.role);
    this.loadData();
  }

  // Métodos de navegación (igual)
  navigateToUsers() {
    if (this.showUsersOption) {
      this.router.navigate(['/usuarios']);
    }
  }

  navigateToClientes() {
    this.router.navigate(['/clientes']);
  }

  navigateToVentas() {
    this.router.navigate(['/ventas']);
  }

  navigateToCaja() {
    this.router.navigate(['/caja']);
  }

  navigateToUrbanizaciones() {
    this.router.navigate(['/urbanizaciones']);
  }

  navigateToLotes() {
    this.router.navigate(['/lotes']);
  }

  navigateToCotizaciones() {
    this.router.navigate(['/cotizaciones']);
  }

  navigateToReservas() {
    this.router.navigate(['/reservas']);
  }

  loadData() {
    this.isLoading = true;

    forkJoin({
      usuarios: this.userService.getAll().pipe(
        catchError((error) => {
          console.error('Error cargando usuarios:', error);
          return of({ success: false, data: { users: [] } });
        }),
      ),
      clientes: this.clientesService.getClientes().pipe(
        catchError((error) => {
          console.error('Error cargando clientes:', error);
          return of({ success: false, data: { clientes: [] } });
        }),
      ),
      ventas: this.ventaService.getAll().pipe(
        catchError((error) => {
          console.error('Error cargando ventas:', error);
          return of({ ventas: [] });
        }),
      ),
      lotes: this.loteService.getAll().pipe(
        catchError((error) => {
          console.error('Error cargando lotes:', error);
          return of([]);
        }),
      ),
      cotizaciones: this.cotizacionService.getAll().pipe(
        catchError((error) => {
          console.error('Error cargando cotizaciones:', error);
          return of([]);
        }),
      ),
      reservas: this.reservaService.getAll().pipe(
        catchError((error) => {
          console.error('Error cargando reservas:', error);
          return of([]);
        }),
      ),
    }).subscribe({
      next: (results) => {
        console.log('DASHBOARD - Todos los resultados:', results);

        // ── Usuarios ──────────────────────────────────────────
        if (results.usuarios.success && results.usuarios.data?.users) {
          this.usuariosTotales = results.usuarios.data.users.length;
        }

        // ── Clientes ──────────────────────────────────────────
        if (results.clientes.success && results.clientes.data?.clientes) {
          this.totalClientes = results.clientes.data.clientes.length;
        }

        // ── Ventas ────────────────────────────────────────────
        let ventasArray: any[] = [];
        if (results.ventas.ventas && Array.isArray(results.ventas.ventas)) {
          ventasArray = results.ventas.ventas;
        } else if (Array.isArray(results.ventas)) {
          ventasArray = results.ventas;
        }

        // ── Lotes ─────────────────────────────────────────────
        let lotesArray: any[] = Array.isArray(results.lotes) ? results.lotes : [];

        // ── Reservas ──────────────────────────────────────────
        let reservasArray: any[] = Array.isArray(results.reservas) ? results.reservas : [];

        // ── Cotizaciones ──────────────────────────────────────
        let cotizacionesArray: any[] = Array.isArray(results.cotizaciones)
          ? results.cotizaciones
          : [];

        // ── Filtrar por urbanización activa ───────────────────
        ventasArray = this.filtrarPorUrbanizacion(ventasArray, (v) => v.lote?.urbanizacion?.id);
        lotesArray = this.filtrarPorUrbanizacion(lotesArray, (l) => l.urbanizacion?.id);
        reservasArray = this.filtrarPorUrbanizacion(reservasArray, (r) => r.lote?.urbanizacion?.id);
        cotizacionesArray = this.filtrarPorUrbanizacion(
          cotizacionesArray,
          (c) => c.lote?.urbanizacion?.id,
        );

        // ── Totales ───────────────────────────────────────────
        this.totalVentas = ventasArray.length;

        this.totalPagos = 0;
        ventasArray.forEach((venta: any) => {
          if (venta.planPago?.pagos && Array.isArray(venta.planPago.pagos)) {
            this.totalPagos += venta.planPago.pagos.length;
          }
        });

        // ── Procesar y graficar ───────────────────────────────
        this.procesarDatosLotes(lotesArray, ventasArray);
        this.configurarGrafico(ventasArray, reservasArray, cotizacionesArray);
        this.cargarDatosCaja();
      },
      error: (error) => {
        console.error('DASHBOARD - Error general:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private procesarDatosLotes(lotesArray: any[], ventasArray: any[]) {
    // Contar lotes por estado
    this.lotesData.disponibles = lotesArray.filter((lote) => lote.estado === 'DISPONIBLE').length;
    this.lotesData.vendidos = lotesArray.filter((lote) => lote.estado === 'VENDIDO').length;
    this.lotesData.reservados = lotesArray.filter((lote) => lote.estado === 'RESERVADO').length;
    this.lotesData.conOferta = lotesArray.filter((lote) => lote.estado === 'CON_OFERTA').length;

    // Calcular top asesores (solo 3 mejores)
    this.calcularTopAsesores(ventasArray);

    // Calcular urbanización más demandada (solo una)
    this.calcularUrbanizacionMasDemandada(lotesArray, ventasArray);
  }

  private calcularTopAsesores(ventasArray: any[]) {
    const ventasPorAsesor: { [key: string]: { nombre: string; ventas: number } } = {};

    ventasArray.forEach((venta) => {
      const asesorId = venta.asesor?.id || venta.asesorId;
      const asesorNombre = venta.asesor?.fullName || `Asesor ${asesorId}`;

      if (asesorId) {
        if (!ventasPorAsesor[asesorId]) {
          ventasPorAsesor[asesorId] = {
            nombre: asesorNombre,
            ventas: 0,
          };
        }
        ventasPorAsesor[asesorId].ventas += 1;
      }
    });

    // Solo los 3 mejores
    this.topAsesores = Object.values(ventasPorAsesor)
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, 3);
  }

  private calcularUrbanizacionMasDemandada(lotesArray: any[], ventasArray: any[]) {
    const actividadPorUrbanizacion: {
      [key: string]: {
        nombre: string;
        ventas: number;
        cotizaciones: number;
        actividadTotal: number;
      };
    } = {};

    // Contar ventas por urbanización
    ventasArray.forEach((venta) => {
      if (venta.inmuebleTipo === 'LOTE' && venta.lote?.urbanizacion) {
        const urbanizacionId = venta.lote.urbanizacion.id;
        const urbanizacionNombre =
          venta.lote.urbanizacion.nombre || `Urbanización ${urbanizacionId}`;

        if (!actividadPorUrbanizacion[urbanizacionId]) {
          actividadPorUrbanizacion[urbanizacionId] = {
            nombre: urbanizacionNombre,
            ventas: 0,
            cotizaciones: 0,
            actividadTotal: 0,
          };
        }
        actividadPorUrbanizacion[urbanizacionId].ventas += 1;
      }
    });

    // Contar lotes CON_OFERTA por urbanización (cotizaciones)
    lotesArray.forEach((lote) => {
      if (lote.estado === 'CON_OFERTA' && lote.urbanizacion?.id) {
        const urbanizacionId = lote.urbanizacion.id;
        const urbanizacionNombre = lote.urbanizacion.nombre || `Urbanización ${urbanizacionId}`;

        if (!actividadPorUrbanizacion[urbanizacionId]) {
          actividadPorUrbanizacion[urbanizacionId] = {
            nombre: urbanizacionNombre,
            ventas: 0,
            cotizaciones: 0,
            actividadTotal: 0,
          };
        }
        actividadPorUrbanizacion[urbanizacionId].cotizaciones += 1;
      }
    });

    // Calcular actividad total
    Object.keys(actividadPorUrbanizacion).forEach((id) => {
      const urbanizacion = actividadPorUrbanizacion[id];
      urbanizacion.actividadTotal = urbanizacion.ventas + urbanizacion.cotizaciones;
    });

    // Encontrar la UNA urbanización con más actividad
    let maxActividad = 0;
    let urbanizacionTop = '';
    let urbanizacionTopData: any = null;

    Object.values(actividadPorUrbanizacion).forEach((urbanizacion) => {
      if (urbanizacion.actividadTotal > maxActividad) {
        maxActividad = urbanizacion.actividadTotal;
        urbanizacionTop = urbanizacion.nombre;
        urbanizacionTopData = urbanizacion;
      }
    });

    // Asignar valores - SOLO UNA URBANIZACIÓN
    this.urbanizacionMasDemandada = urbanizacionTop || 'No disponible';
    this.ventasUrbanizacion = urbanizacionTopData?.ventas || 0;
    this.cotizacionesUrbanizacion = urbanizacionTopData?.cotizaciones || 0;
  }

  private cargarDatosCaja() {
    this.cajaService.cargarCajas();

    setTimeout(() => {
      try {
        const cajas = this.cajaService.cajas();

        this.totalCaja = cajas.reduce((sum, caja) => {
          return sum + (Number(caja.saldoActual) || 0);
        }, 0);

        this.cajasAbiertas = cajas.filter((caja) => caja.estado === 'ABIERTA').length;
        this.cajasCerradas = cajas.filter((caja) => caja.estado === 'CERRADA').length;

        this.isLoading = false;
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error cargando datos de caja:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }, 800);
  }

  private configurarGrafico(ventasArray: any[], reservasArray: any[], cotizacionesArray: any[]) {
    console.log('Datos para gráfico:', {
      ventas: ventasArray?.length || 0,
      reservas: reservasArray?.length || 0,
      cotizaciones: cotizacionesArray?.length || 0,
    });

    const mesesCompletos = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    // Obtener datos REALES para el gráfico

    // 1. Ventas: contar por mes (usar fecha de creación)
    const ventasPorMes = Array(12).fill(0);
    if (ventasArray && Array.isArray(ventasArray)) {
      ventasArray.forEach((venta) => {
        if (venta.createdAt) {
          const fecha = new Date(venta.createdAt);
          const mes = fecha.getMonth(); // 0-11
          if (mes >= 0 && mes < 12) {
            ventasPorMes[mes] += 1;
          }
        }
      });
    }

    // 2. Reservas: contar por mes
    const reservasPorMes = Array(12).fill(0);
    if (reservasArray && Array.isArray(reservasArray)) {
      reservasArray.forEach((reserva) => {
        if (reserva.fechaInicio || reserva.createdAt) {
          const fecha = new Date(reserva.fechaInicio || reserva.createdAt);
          const mes = fecha.getMonth();
          if (mes >= 0 && mes < 12) {
            reservasPorMes[mes] += 1;
          }
        }
      });
    }

    // 3. Cotizaciones: contar por mes
    const cotizacionesPorMes = Array(12).fill(0);
    if (cotizacionesArray && Array.isArray(cotizacionesArray)) {
      cotizacionesArray.forEach((cotizacion) => {
        if (cotizacion.createdAt) {
          const fecha = new Date(cotizacion.createdAt);
          const mes = fecha.getMonth();
          if (mes >= 0 && mes < 12) {
            cotizacionesPorMes[mes] += 1;
          }
        }
      });
    }

    // CORRECCIÓN: Identificar meses con actividad (ventas, reservas o cotizaciones)
    const mesesConActividad: number[] = [];
    for (let i = 0; i < 12; i++) {
      if (ventasPorMes[i] > 0 || reservasPorMes[i] > 0 || cotizacionesPorMes[i] > 0) {
        mesesConActividad.push(i);
      }
    }

    // Si no hay meses con actividad, mostrar el mes actual
    if (mesesConActividad.length === 0) {
      mesesConActividad.push(new Date().getMonth());
    }

    // Ordenar los meses
    mesesConActividad.sort((a, b) => a - b);

    // Crear arrays filtrados solo con meses que tienen actividad
    const labelsFiltrados = mesesConActividad.map((mes) => mesesCompletos[mes]);
    const ventasFiltradas = mesesConActividad.map((mes) => ventasPorMes[mes]);
    const reservasFiltradas = mesesConActividad.map((mes) => reservasPorMes[mes]);
    const cotizacionesFiltradas = mesesConActividad.map((mes) => cotizacionesPorMes[mes]);

    // CORRECCIÓN: Simple - hacer que cotizaciones sea una barra también
    this.lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#000000',
            font: {
              size: 14,
            },
          },
        },
        title: {
          display: true,
          text: 'Actividad mensual',
          color: '#000000',
          font: {
            size: 18,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#000000',
            font: {
              size: 13,
            },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            color: '#000000',
            font: {
              size: 13,
            },
          },
        },
      },
    };

    // CORRECCIÓN: Ahora todas son barras (incluyendo cotizaciones)
    this.lineChartData = {
      labels: labelsFiltrados, // SOLO meses con actividad
      datasets: [
        {
          type: 'bar',
          label: 'Ventas',
          data: ventasFiltradas, // SOLO datos de meses con actividad
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          barThickness: 20,
        },
        {
          type: 'bar',
          label: 'Reservas',
          data: reservasFiltradas, // SOLO datos de meses con actividad
          backgroundColor: 'rgba(250, 204, 21, 0.7)',
          borderColor: 'rgb(250, 204, 21)',
          borderWidth: 1,
          barThickness: 20,
        },
        {
          type: 'bar', // Ahora es barra
          label: 'Cotizaciones',
          data: cotizacionesFiltradas, // SOLO datos de meses con actividad
          backgroundColor: 'rgba(56, 189, 248, 0.7)',
          borderColor: 'rgb(56, 189, 248)',
          borderWidth: 1,
          barThickness: 20,
        },
      ],
    };
  }
}
