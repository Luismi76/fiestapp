import {
  IsEmail,
  IsString,
  IsNumber,
  IsOptional,
  MinLength,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Email del usuario',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    example: 'MiContraseña123',
    description: 'Contraseña (mínimo 6 caracteres)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({
    example: 'Juan García',
    description: 'Nombre completo del usuario',
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @ApiPropertyOptional({
    example: 25,
    description: 'Edad del usuario (mínimo 18)',
    minimum: 18,
  })
  @IsOptional()
  @IsNumber()
  @Min(18, { message: 'Debes ser mayor de 18 años' })
  age?: number;

  @ApiPropertyOptional({
    example: 'Madrid',
    description: 'Ciudad de residencia',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: true, description: 'Indica si tiene pareja' })
  @IsOptional()
  @IsBoolean({ message: 'hasPartner debe ser verdadero o falso' })
  hasPartner?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Indica si tiene hijos' })
  @IsOptional()
  @IsBoolean({ message: 'hasChildren debe ser verdadero o falso' })
  hasChildren?: boolean;

  @ApiPropertyOptional({
    example: '5, 8',
    description: 'Edades de los hijos separadas por comas',
  })
  @IsOptional()
  @IsString()
  childrenAges?: string;

  @ApiPropertyOptional({ description: 'Token de CAPTCHA para verificación' })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Email del usuario',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    example: 'MiContraseña123',
    description: 'Contraseña del usuario',
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Token JWT para autenticación' })
  access_token: string;

  @ApiProperty({
    description: 'Datos del usuario autenticado',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'usuario@ejemplo.com',
      name: 'Juan García',
      avatar: 'https://cloudinary.com/avatar.jpg',
      verified: true,
      role: 'user',
    },
  })
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    verified?: boolean;
    role?: string;
    city?: string;
    age?: number;
    bio?: string;
    hasPartner?: boolean;
    hasChildren?: boolean;
    childrenAges?: string;
  };
}

export class RegisterResponseDto {
  @ApiProperty({
    example:
      'Registro exitoso. Por favor, revisa tu email para verificar tu cuenta.',
  })
  message: string;

  @ApiProperty({ example: 'usuario@ejemplo.com' })
  email: string;
}

export class ResendVerificationDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Email del usuario',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Email del usuario',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de restablecimiento recibido por email' })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NuevaContraseña123',
    description: 'Nueva contraseña (mínimo 6 caracteres)',
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  newPassword: string;
}

export class TwoFactorRequiredResponseDto {
  @ApiProperty({ example: true, description: 'Indica que se requiere 2FA' })
  requiresTwoFactor: true;

  @ApiProperty({ description: 'Token temporal para completar el 2FA' })
  tempToken: string;

  @ApiProperty({
    example: 'Se requiere código de autenticación de dos factores.',
  })
  message: string;
}

// Union type para la respuesta de login
export type LoginResponseDto = AuthResponseDto | TwoFactorRequiredResponseDto;
