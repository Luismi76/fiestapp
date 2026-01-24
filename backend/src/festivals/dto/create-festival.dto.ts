import { IsString, IsOptional, MinLength, IsDateString } from 'class-validator';

export class CreateFestivalDto {
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  name: string;

  @IsString()
  @MinLength(2, { message: 'La ciudad debe tener al menos 2 caracteres' })
  city: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
