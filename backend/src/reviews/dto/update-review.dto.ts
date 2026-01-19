import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export class UpdateReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'La puntuación mínima es 1' })
  @Max(5, { message: 'La puntuación máxima es 5' })
  rating?: number;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'El comentario debe tener al menos 10 caracteres' })
  comment?: string;
}
