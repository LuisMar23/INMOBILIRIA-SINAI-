import { PartialType } from '@nestjs/mapped-types';
import { CreatePromocionDto } from './create-promocion.dto';
import { IsOptional, Validate, IsDateString } from 'class-validator';
import { IsDateRangeValid } from './date-range.validator';

export class UpdatePromocionDto extends PartialType(CreatePromocionDto) {
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  @Validate(IsDateRangeValid, ['fechaInicio'])
  fechaFin?: string;
}
