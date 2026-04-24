import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidSpanishTaxId } from './spanish-tax-id.util';

export function IsSpanishTaxId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSpanishTaxId',
      target: object.constructor,
      propertyName,
      options: {
        message: 'NIF/NIE/CIF no válido (formato o dígito de control incorrecto)',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null || value === '') {
            return true; // deja que @IsOptional gestione la ausencia
          }
          return typeof value === 'string' && isValidSpanishTaxId(value);
        },
      },
    });
  };
}
