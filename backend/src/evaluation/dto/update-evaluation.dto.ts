import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EvaluationStatus {
  PENDIENTE = 'PENDIENTE',
  EN_REVISION = 'EN_REVISION',
  RESUELTO = 'RESUELTO',
  DESCARTADO = 'DESCARTADO',
}

export class UpdateEvaluationDto {
  @ApiProperty({ enum: EvaluationStatus, required: false })
  @IsOptional()
  @IsEnum(EvaluationStatus)
  status?: EvaluationStatus;

  @ApiProperty({ required: false, description: 'Notas internas del admin' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}
