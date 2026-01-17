import { IsString, IsOptional, IsInt, Min, MinLength, MaxLength } from 'class-validator';

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
}
