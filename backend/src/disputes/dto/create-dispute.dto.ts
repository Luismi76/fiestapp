import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
import { DisputeReason } from '@prisma/client';

export class CreateDisputeDto {
  @IsString()
  @IsNotEmpty()
  matchId: string;

  @IsEnum(DisputeReason)
  reason: DisputeReason;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[]; // URLs de archivos de evidencia
}

export class AddDisputeMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[]; // URLs de archivos adjuntos
}

export class ResolveDisputeDto {
  @IsEnum([
    'RESOLVED_REFUND',
    'RESOLVED_PARTIAL_REFUND',
    'RESOLVED_NO_REFUND',
    'CLOSED',
  ])
  resolution:
    | 'RESOLVED_REFUND'
    | 'RESOLVED_PARTIAL_REFUND'
    | 'RESOLVED_NO_REFUND'
    | 'CLOSED';

  @IsString()
  @IsNotEmpty()
  resolutionDescription: string;

  @IsOptional()
  refundPercentage?: number; // 0-100, solo para RESOLVED_PARTIAL_REFUND
}
