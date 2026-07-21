export interface UserDto {
  id: number;
  uuid: string;
  fullName: string;
  username?: string; // Hacer opcional para clientes
  ci: string;
  email?: string; // Hacer opcional para clientes
  passwordHash?: string; // Hacer opcional
  avatarUrl?: string;
  telefono: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  failedAttempts: number;
  lockUntil?: Date;
  direccion?: string;
  observaciones?: string;
}

export type UserRole = 'ADMINISTRADOR' | 'ASESOR' | 'SECRETARIA' | 'CLIENTE' | 'USUARIO';
