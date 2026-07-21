import { PartialType } from '@nestjs/mapped-types';
import { CreateSeguridadDto } from './create-seguridad.dto';

export class UpdateSeguridadDto extends PartialType(CreateSeguridadDto) {}
