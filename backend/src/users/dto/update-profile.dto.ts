import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  IsBoolean,
  Matches,
  IsIn,
  IsISO31661Alpha2,
  IsDateString,
} from 'class-validator';
import { FISCAL_REGIONS } from '../../invoicing/tax.service';
import { IsSpanishTaxId } from '../../common/validators/is-spanish-tax-id.decorator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(18, { message: 'Debes ser mayor de 18 años' })
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La bio no puede tener más de 500 caracteres' })
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La ciudad no puede tener más de 100 caracteres' })
  city?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsBoolean({ message: 'hasPartner debe ser verdadero o falso' })
  hasPartner?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'hasFriends debe ser verdadero o falso' })
  hasFriends?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'hasChildren debe ser verdadero o falso' })
  hasChildren?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50, {
    message: 'Las edades de los hijos no pueden tener más de 50 caracteres',
  })
  childrenAges?: string;

  // Datos fiscales
  @IsOptional()
  @IsString()
  @IsSpanishTaxId()
  taxId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/, {
    message: 'Formato de IBAN no válido',
  })
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'La dirección no puede superar 200 caracteres' })
  fiscalAddress?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{5}$/, { message: 'El código postal debe tener 5 dígitos' })
  fiscalPostalCode?: string;

  @IsOptional()
  @IsISO31661Alpha2({ message: 'País no válido (usa código ISO-2, ej. ES)' })
  residenceCountry?: string;

  @IsOptional()
  @IsIn(FISCAL_REGIONS, {
    message: 'Región no válida. Valores: peninsula, canarias, ceuta, melilla',
  })
  residenceRegion?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha de nacimiento no válida' })
  birthDate?: string;
}
