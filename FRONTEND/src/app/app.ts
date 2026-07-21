import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PermisosStateService } from './core/services/permisosState.service';
import { UrbanizacionContextService } from './core/services/urbanizacion-context.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('Inmobiliaria-Frontend');

  private permisosState = inject(PermisosStateService);
private urbContext=inject(UrbanizacionContextService)
  ngOnInit() {
    this.permisosState.recuperar();
      this.urbContext.recuperar();
  }
}
