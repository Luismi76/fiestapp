import { PartialType } from '@nestjs/mapped-types';
import { CreateExperienceDto } from './create-experience.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateExperienceDto extends PartialType(CreateExperienceDto) {
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
