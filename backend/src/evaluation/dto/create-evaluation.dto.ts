import {
  IsString,
  IsEnum,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EvaluationCategory {
  PROBLEMA = 'PROBLEMA',
  MEJORA = 'MEJORA',
  OPINION = 'OPINION',
}

export enum EvaluationPriority {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
}

export class CreateEvaluationDto {
  @ApiProperty({ example: 'Carlos López', description: 'Nombre del evaluador' })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100)
  evaluatorName: string;

  @ApiProperty({ example: '/experiences', description: 'Página donde se envía el feedback' })
  @IsString()
  @MaxLength(500)
  page: string;

  @ApiProperty({ enum: EvaluationCategory, example: EvaluationCategory.MEJORA })
  @IsEnum(EvaluationCategory, {
    message: 'La categoría debe ser: PROBLEMA, MEJORA u OPINION',
  })
  category: EvaluationCategory;

  @ApiProperty({ enum: EvaluationPriority, example: EvaluationPriority.MEDIA })
  @IsEnum(EvaluationPriority, {
    message: 'La prioridad debe ser: BAJA, MEDIA o ALTA',
  })
  priority: EvaluationPriority;

  @ApiProperty({ example: 'El botón de reservar no se ve bien en móvil' })
  @IsString()
  @MinLength(10, { message: 'El comentario debe tener al menos 10 caracteres' })
  @MaxLength(2000)
  comment: string;

  @ApiProperty({ required: false, description: 'URL de captura de pantalla' })
  @IsOptional()
  @IsString()
  screenshotUrl?: string;
}
