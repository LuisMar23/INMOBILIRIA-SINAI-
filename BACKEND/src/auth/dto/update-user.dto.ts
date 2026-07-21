import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { UserRole } from './register.dto';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?:
    | UserRole.ADMINISTRADOR
    | UserRole.ASESOR
    | UserRole.SECRETARIA
    | UserRole.USUARIO;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  password?: string;

@IsOptional()
@IsArray()
@IsString({ each: true })
ciudadesAsignadas?: string[];
}
