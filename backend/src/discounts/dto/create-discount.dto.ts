import {
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiscountDto {
  @IsString()
  code: string;

  @IsString()
  @IsIn(['percentage', 'fixed'])
  type: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsesPerUser?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @IsString()
  description?: string;
}
