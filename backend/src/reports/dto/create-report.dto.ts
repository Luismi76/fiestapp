import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsIn(['user', 'experience', 'match'])
  reportedType: string;

  @IsString()
  reportedId: string;

  @IsIn(['spam', 'inappropriate', 'fraud', 'harassment', 'other'])
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
