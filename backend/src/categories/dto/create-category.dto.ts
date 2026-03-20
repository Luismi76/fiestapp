import { IsString, IsOptional, IsNumber, IsBoolean, IsIn, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @IsString()
  @MinLength(2, { message: 'El slug debe tener al menos 2 caracteres' })
  slug: string;

  @IsString()
  @IsIn(['fiesta', 'local'], { message: 'El grupo debe ser "fiesta" o "local"' })
  group: string;

  @IsString()
  icon: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
