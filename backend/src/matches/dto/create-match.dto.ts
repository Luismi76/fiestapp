import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsArray,
} from 'class-validator';

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

  @IsOptional()
  @IsInt()
  @Min(1)
  participants?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantNames?: string[];
}
