import { IsString, Length } from 'class-validator';

export class VerifyTwoFactorDto {
  @IsString()
  @Length(6, 6, { message: 'El código debe tener exactamente 6 dígitos' })
  token: string;
}

export class TwoFactorSetupResponseDto {
  secret: string;
  qrCodeDataUrl: string;
  otpAuthUrl: string;
}

export class TwoFactorStatusDto {
  enabled: boolean;
}

export class LoginWith2FADto {
  @IsString()
  tempToken: string;

  @IsString()
  @Length(6, 6, { message: 'El código debe tener exactamente 6 dígitos' })
  twoFactorCode: string;
}
