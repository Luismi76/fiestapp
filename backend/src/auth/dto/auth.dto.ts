import {
  IsEmail,
  IsString,
  IsNumber,
  IsOptional,
  MinLength,
  Min,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(18, { message: 'Debes ser mayor de 18 años' })
  age?: number;

  @IsOptional()
  @IsString()
  city?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}

export class AuthResponseDto {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    verified?: boolean;
    city?: string;
    age?: number;
    bio?: string;
  };
}
