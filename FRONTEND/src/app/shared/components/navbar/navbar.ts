import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, inject, OnInit, ViewChild } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faBell,
  faChevronDown,
  faCog,
  faLayerGroup,
  faSearch,
  faShieldAlt,
  faSignOutAlt,
  faTimes,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../components/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { UrbanizacionContextService } from '../../../core/services/urbanizacion-context.service';


@Component({
  selector: 'app-navbar',
  imports: [FontAwesomeModule, CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  faChevronDown = faChevronDown;
  faSignOutAlt = faSignOutAlt;
  faUser = faUser;
  faShieldAlt = faShieldAlt;
  faLayerGroup = faLayerGroup;
    @ViewChild('userMenuTrigger') userMenuTrigger!: ElementRef;
  @ViewChild('userMenuDropdown') userMenuDropdown!: ElementRef;
   private _router = inject(Router);
  private _urbanizacionContext = inject(UrbanizacionContextService);
  faSearch = faSearch;
  faCog = faCog;
faBars = faBars;  // De @fortawesome/free-solid-svg-icons
faTimes = faTimes
  isUserMenuOpen: boolean = false;
  showLogoutConfirmation: boolean = false;
  _authService = inject(AuthService);
isMobileMenuOpen = false;

  currentUser:any
ngOnInit(){
 this.currentUser=this._authService.getCurrentUser()
  console.log(this.currentUser)
}
toggleMobileMenu(): void {
  this.isMobileMenuOpen = !this.isMobileMenuOpen;
  // Cerrar el menú de usuario si está abierto
  if (this.isUserMenuOpen) {
    this.isUserMenuOpen = false;
  }
}
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isUserMenuOpen) {
      const clickedInsideTrigger = this.userMenuTrigger?.nativeElement.contains(event.target);
      const clickedInsideDropdown = this.userMenuDropdown?.nativeElement.contains(event.target);
      
      // Si el clic fue fuera del trigger y fuera del dropdown, cerrar el menú
      if (!clickedInsideTrigger && !clickedInsideDropdown) {
        this.isUserMenuOpen = false;
      }
    }
  }


  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }
  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.showLogoutConfirmation = false;
  }

  confirmLogout() {
    this.showLogoutConfirmation = true;
  }

  cancelLogout() {
    this.showLogoutConfirmation = false;
  }

  logout() {
    this._authService.logout();
  }
  volverAProyectos(): void {
    this._urbanizacionContext.limpiar();
    this._router.navigate(['/lotes/listaUrbanizaciones']);
  }
}