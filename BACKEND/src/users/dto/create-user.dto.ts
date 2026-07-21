import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  ci: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  // create-user.dto.ts
  // @IsOptional()
  // ciudadAsignada?: string;

@IsOptional()
@IsArray()
@IsString({ each: true })
ciudadesAsignadas?: string[];

}
