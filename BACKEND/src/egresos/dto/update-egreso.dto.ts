import { PartialType } from '@nestjs/mapped-types';
import { CreateEgresoDto } from './create-egreso.dto';

export class UpdateEgresoDto extends PartialType(CreateEgresoDto) {}
