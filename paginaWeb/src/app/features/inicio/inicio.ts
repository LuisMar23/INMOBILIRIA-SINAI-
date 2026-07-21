import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AppRoutingModule } from "../../app.routes";
import { RouterModule } from '@angular/router';


interface CarouselImage {
  url: string;
  title: string;
  description: string;
}
@Component({
  selector: 'app-inicio',
  imports: [CommonModule,RouterModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {


currentIndex = 0;
  isAutoPlaying = true;
  private intervalId: any;

  images: CarouselImage[] = [
    {
      url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&h=600&fit=crop',
      title: 'Bienvenido a Inmobiliaria Sinai',
      description: 'Tu hogar soñado te está esperando. Encuentra la propiedad perfecta con nosotros'
    },
    {
      url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=600&fit=crop',
      title: 'Propiedades de Alta Calidad',
      description: 'En Inmobiliaria Sinai te ofrecemos las mejores opciones del mercado inmobiliario'
    },
    {
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&h=600&fit=crop',
      title: 'Experiencia y Confianza',
      description: 'Más de 15 años ayudando a familias a encontrar su hogar ideal'
    },
    {
      url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&h=600&fit=crop',
      title: 'Asesoría Profesional',
      description: 'Inmobiliaria Sinai - Tu socio de confianza en bienes raíces'
    }
  ];

  ngOnInit(): void {
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  goToPrevious(): void {
    this.currentIndex = this.currentIndex === 0 
      ? this.images.length - 1 
      : this.currentIndex - 1;
  }

  goToNext(): void {
    this.currentIndex = this.currentIndex === this.images.length - 1 
      ? 0 
      : this.currentIndex + 1;
  }

  goToSlide(index: number): void {
    this.currentIndex = index;
  }

  toggleAutoPlay(): void {
    this.isAutoPlaying = !this.isAutoPlaying;
    if (this.isAutoPlaying) {
      this.startAutoPlay();
    } else {
      this.stopAutoPlay();
    }
  }

  private startAutoPlay(): void {
    this.stopAutoPlay();
    this.intervalId = setInterval(() => {
      if (this.isAutoPlaying) {
        this.goToNext();
      }
    }, 4000);
  }

  private stopAutoPlay(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }


}
