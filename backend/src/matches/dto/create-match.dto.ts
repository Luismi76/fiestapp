import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateMatchDto {
  @IsString()
  experienceId: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha inválida' })
  proposedDate?: string;
}
