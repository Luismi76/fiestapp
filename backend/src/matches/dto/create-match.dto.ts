import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateMatchDto {
  @IsString()
  experienceId: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha de inicio inválida' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha de fin inválida' })
  endDate?: string;
}
