export interface CotizacionDto {
  id: number;
  uuid: string;
  nombreCliente: string;
  contactoCliente: string;
  detalle?: string;
  asesorId: number;
  inmuebleTipo: string;
  inmuebleId: number;
  precioOfertado: number;
  estado: string;
  createdAt: string;
  updatedAt: string;
  asesor?: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
  lote?: {
    id: number;
    numeroLote: string;
    superficieM2: number;
    precioBase: number;
    estado: string;
    urbanizacion?: {
      id: number;
      nombre: string;
      ubicacion: string;
    };
  };
}