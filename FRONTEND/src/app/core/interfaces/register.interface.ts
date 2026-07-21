export interface RegisterDto {
  fullName: string;
  username: string;
  ci: string;
  telefono: string;
  email: string;
  password: string;
  role?: UserRole; // Agregar rol opcional
}
export type UserRole = 'ADMINISTRADOR' | 'ASESOR' | 'SECRETARIA' | 'CLIENTE' | 'USUARIO';