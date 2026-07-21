import { PartialType } from '@nestjs/mapped-types';
import { CreateUrbanizacionDto } from './create-urbanizacion.dto';

export class UpdateUrbanizacionDto extends PartialType(CreateUrbanizacionDto) {}
