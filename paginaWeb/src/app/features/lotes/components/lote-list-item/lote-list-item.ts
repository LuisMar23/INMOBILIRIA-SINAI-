import { Component, Input } from '@angular/core';
import { Lote } from '../../../../core/interfaces/datos.interface';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-lote-list-item',
  imports: [RouterModule,CommonModule],
  templateUrl: './lote-list-item.html',
  styleUrl: './lote-list-item.css',
})
export class LoteListItem {
urlServer=environment.fileServer

  @Input() lote!: Lote;
}