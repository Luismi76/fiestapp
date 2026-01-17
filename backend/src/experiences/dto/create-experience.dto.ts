import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
  MinLength,
} from 'class-validator';

export enum ExperienceType {
  PAGO = 'pago',
  INTERCAMBIO = 'intercambio',
  AMBOS = 'ambos',
}

export class CreateExperienceDto {
  @IsString()
  @MinLength(5, { message: 'El título debe tener al menos 5 caracteres' })
  title: string;

  @IsString()
  @MinLength(20, {
    message: 'La descripción debe tener al menos 20 caracteres',
  })
  description: string;

  @IsString()
  festivalId: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number;

  @IsEnum(ExperienceType, {
    message: 'Tipo debe ser: pago, intercambio o ambos',
  })
  type: ExperienceType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];
}
