import {
  IsString,
  IsEmail,
  IsEnum,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum FeedbackCategory {
  DESIGN = 'diseño',
  FUNCTIONALITY = 'funcionalidad',
  PERFORMANCE = 'rendimiento',
  OTHER = 'otro',
}

export class CreateFeedbackDto {
  @ApiProperty({ example: 'Juan García', description: 'Nombre del usuario' })
  @IsString({ message: 'El nombre debe ser un texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  name: string;

  @ApiProperty({
    example: 'juan@email.com',
    description: 'Email de contacto',
  })
  @IsEmail({}, { message: 'Introduce un email válido' })
  email: string;

  @ApiProperty({
    enum: FeedbackCategory,
    example: FeedbackCategory.FUNCTIONALITY,
    description: 'Categoría del feedback',
  })
  @IsEnum(FeedbackCategory, {
    message: 'La categoría debe ser: diseño, funcionalidad, rendimiento u otro',
  })
  category: FeedbackCategory;

  @ApiProperty({
    example: 'La búsqueda de experiencias funciona muy bien...',
    description: 'Mensaje de feedback',
  })
  @IsString({ message: 'El mensaje debe ser un texto' })
  @MinLength(10, { message: 'El mensaje debe tener al menos 10 caracteres' })
  @MaxLength(2000, {
    message: 'El mensaje no puede superar los 2000 caracteres',
  })
  message: string;

  @ApiProperty({
    example: 4,
    minimum: 1,
    maximum: 5,
    description: 'Valoración de 1 a 5',
  })
  @IsInt({ message: 'La valoración debe ser un número entero' })
  @Min(1, { message: 'La valoración mínima es 1' })
  @Max(5, { message: 'La valoración máxima es 5' })
  rating: number;
}
