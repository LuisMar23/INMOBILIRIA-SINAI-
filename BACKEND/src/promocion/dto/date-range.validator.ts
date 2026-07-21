import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsDateRangeValid', async: false })
export class IsDateRangeValid implements ValidatorConstraintInterface {
  validate(fechaFin: string, args: ValidationArguments) {
    const fechaInicio = (args.object as any)[args.constraints[0]];
    if (!fechaInicio || !fechaFin) return true;
    
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    return inicio < fin;
  }

  defaultMessage(args: ValidationArguments) {
    return 'La fecha de fin debe ser posterior a la fecha de inicio';
  }
}