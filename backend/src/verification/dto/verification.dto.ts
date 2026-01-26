import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum DocumentType {
  DNI = 'DNI',
  PASSPORT = 'PASSPORT',
  DRIVER_LICENSE = 'DRIVER_LICENSE',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export class CreateVerificationDto {
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsString()
  documentFront: string;

  @IsOptional()
  @IsString()
  documentBack?: string;

  @IsOptional()
  @IsString()
  selfie?: string;
}

export class AdminReviewVerificationDto {
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class VerificationResponseDto {
  id: string;
  userId: string;
  status: VerificationStatus;
  documentType: DocumentType;
  documentFront: string;
  documentBack: string | null;
  selfie: string | null;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

export class VerificationListItemDto {
  id: string;
  status: VerificationStatus;
  documentType: DocumentType;
  attempts: number;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export class AdminVerificationListResponseDto {
  verifications: VerificationListItemDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
