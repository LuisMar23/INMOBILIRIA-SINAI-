import { PartialType } from '@nestjs/mapped-types';
import { CreateManzanoDto } from './create-manzano.dto';

export class UpdateManzanoDto extends PartialType(CreateManzanoDto) {}