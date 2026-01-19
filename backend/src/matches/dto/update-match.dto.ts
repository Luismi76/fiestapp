import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum MatchStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export class UpdateMatchDto {
  @IsOptional()
  @IsEnum(MatchStatus, { message: 'Estado inválido' })
  status?: MatchStatus;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha de inicio inválida' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha de fin inválida' })
  endDate?: string;
}

export class SendMessageDto {
  @IsString()
  content: string;
}
