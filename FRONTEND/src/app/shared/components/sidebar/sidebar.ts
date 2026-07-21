import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faHome,
  faUsers,
  faCity,
  faMapMarkedAlt,
  faFileInvoiceDollar,
  faReceipt,
  faCalendarCheck,
  faEye,
  faHeadset,
  faChartLine,
  faMoneyBillWave,
  faFileAlt,
  faHistory,
  faCog,
  faBars,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faSun,
  faMoon,
  faTimes,
  faTachometerAlt,
  faDollarSign,
  faChartBar,
  faHandHoldingUsd,
  faClipboardList,
  faBuilding,
  faHomeUser,
  faTag,
  faCashRegister,
  faHouse,
  faShieldAlt,
  faUsersCog,
  faChevronDown,
  faChevronUp,
  faLock,
  faStore,
  faPiggyBank,
  faChartColumn,
  faScrewdriverWrench,
  faTree,
  faWallet,
  faKey,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../components/services/auth.service';
import { PermisosStateService } from '../../../core/services/permisosState.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
})
export class Sidebar implements OnInit {
  // ─── Iconos generales ────────────────────────────────────────────────────────
  faTimes = faTimes;
  faBars = faBars;
  faChevronLeft = faChevronLeft;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faUsers = faUsers;
  faTachometerAlt = faTachometerAlt;
  faCity = faCity;
  faMapMarkedAlt = faMapMarkedAlt;
  faFileInvoiceDollar = faFileInvoiceDollar;
  faReceipt = faReceipt;
  faCalendarCheck = faCalendarCheck;
  faEye = faEye;
  faDollarSign = faDollarSign;
  faHandHoldingUsd = faHandHoldingUsd;
  faBuilding = faBuilding;
  faHomeUser = faHomeUser;
  faCog = faCog;
  faTag = faTag;
  faHouse = faHouse;
  faChartBar = faChartBar;
  faShieldAlt = faShieldAlt;
  faMoneyBillWave = faMoneyBillWave;
  faUsersCog = faUsersCog;
  faTree = faTree;

  // ─── Iconos de grupo ─────────────────────────────────────────────────────────
  private readonly groupIcons: Record<string, IconDefinition> = {
    Seguridad: faLock,
    Comercial: faStore,
    Tesorería: faPiggyBank,
    Reportes: faChartColumn,
    Ajustes: faScrewdriverWrench,
  };

  /** Devuelve el icono asociado al grupo, o un fallback genérico */
  getGroupIcon(label: string): IconDefinition {
    return this.groupIcons[label] ?? faCog;
  }

  // ─── Estado ──────────────────────────────────────────────────────────────────
  @Output() sidebarToggled = new EventEmitter<boolean>();
  private permisosState = inject(PermisosStateService);
  imagen: string = 'assets/logoSinai.jpg';
  currentUser: any;
  isCollapsed = false;
  isMobileOpen = false;

  // ─── Menú ─────────────────────────────────────────────────────────────────────
  menuGroups = [
    {
      label: '',
      items: [
        {
          label: 'Dashboard',
          icon: faTachometerAlt,
          route: '/dashboard',
          clave: 'dashboard',
        },
      ],
    },

    // SEGURIDAD
    {
      label: 'Seguridad',
      items: [
        {
          label: 'Grupos',
          icon: faShieldAlt,
          route: '/seguridad',
          clave: 'grupos',
        },
        {
          label: 'Accesos',
          icon: faKey,
          route: '/seguridad/accesos',
          clave: 'accesos',
        },
        {
          label: 'Usuarios',
          icon: faUsersCog,
          route: '/usuarios',
          clave: 'usuarios',
        },
      ],
    },

    // COMERCIAL
    {
      label: 'Comercial',
      items: [
        {
          label: 'Clientes',
          icon: faUsers,
          route: '/clientes',
          clave: 'clientes',
        },
        {
          label: 'Ventas',
          icon: faReceipt,
          route: '/ventas',
          clave: 'ventas',
        },
        {
          label: 'Créditos',
          icon: faHandHoldingUsd,
          route: '/creditos',
          clave: 'creditos',
        },
        {
          label: 'Cobros',
          icon: faMoneyBillWave,
          route: '/cobros',
          clave: 'cobros',
        },
        {
          label: 'Cotizaciones',
          icon: faFileInvoiceDollar,
          route: '/cotizaciones',
          clave: 'cotizaciones',
        },
        {
          label: 'Reservas',
          icon: faCalendarCheck,
          route: '/reservas',
          clave: 'reservas',
        },
        {
          label: 'Visitas',
          icon: faEye,
          route: '/visitas',
          clave: 'visitas',
        },
        {
          label: 'Lotes',
          icon: faMapMarkedAlt,
          route: '/lotes',
          clave: 'lotes',
        },
        {
          label: 'Propiedades',
          icon: faHouse,
          route: '/propiedades',
          clave: 'propiedades',
        },
        {
          label: 'Manzanos',
          icon: faTree,
          route: '/manzanos',
          clave: 'manzanos',
        },
      ],
    },

    // TESORERIA
    {
      label: 'Tesorería',
      items: [
        {
          label: 'Gastos Generales',
          icon: faMoneyBillWave,
          route: '/gastos/generales',
          clave: 'gastos',
        },
        {
          label: 'Gastos Proyecto',
          icon: faWallet,
          route: '/gastos/proyecto',
          clave: 'gastosproyecto',
        },
      ],
    },

    // AJUSTES
    {
      label: 'Ajustes',
      items: [
        {
          label: 'Proyectos',
          icon: faCity,
          route: '/urbanizaciones',
          clave: 'urbanizaciones',
        },
        {
          label: 'Promociones',
          icon: faTag,
          route: '/promociones',
          clave: 'promociones',
        },
        {
          label: 'Sedes',
          icon: faBuilding,
          route: '/sedes',
          clave: 'sedes',
        },
        {
          label: 'Caja',
          icon: faCashRegister,
          route: '/caja',
          clave: 'caja',
        },
      ],
    },

    // REPORTES
    {
      label: 'Reportes',
      items: [
        {
          label: 'Reportes Financiero',
          icon: faDollarSign,
          route: '/reportes/financiero',
          clave: 'reportes_financiero',
        },
        {
          label: 'Reportes Venta',
          icon: faChartBar,
          route: '/reportes/ventas',
          clave: 'reportes_ventas',
        },
        {
          label: 'Reportes Cliente',
          icon: faUsers,
          route: '/reportes/clientes',
          clave: 'reportes_cliente',
        },
        {
          label: 'Reportes Lote',
          icon: faMapMarkedAlt,
          route: '/reportes/lotes',
          clave: 'reportes_lote',
        },
      ],
    },
  ];

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
  }

get filteredGroups() {
  return this.menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => this.permisosState.tieneAcceso(item.clave)),
    }))
    .filter((group) => group.items.length > 0)
    .filter((group) => {
      if (group.label === 'Seguridad') {
  
        return this.currentUser?.role === 'ADMINISTRADOR';
      }
      return true;
    });
}

  // private openGroups = new Set<string>(['Comercial', 'Finanzas', 'Reportes', 'Gestión']);
  private openGroups = new Set<string>();

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarToggled.emit(this.isCollapsed);
  }

  toggleMobile() {
    this.isMobileOpen = !this.isMobileOpen;
  }

  toggleGroup(label: string) {
    if (this.openGroups.has(label)) {
      this.openGroups.delete(label);
    } else {
      this.openGroups.add(label);
    }
  }

  isGroupOpen(label: string): boolean {
    return this.openGroups.has(label);
  }
}
