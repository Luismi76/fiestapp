import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3001/api/auth/google/callback';

    super({
      clientID: clientID || 'not-configured',
      clientSecret: clientSecret || 'not-configured',
      callbackURL,
      scope: ['email', 'profile'],
    });

    if (!clientID || !clientSecret) {
      this.logger.warn(
        'Google OAuth not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET). Google login disabled.',
      );
    }
  }

  validate(
    accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const { id, name, emails, photos } = profile;

    const user = {
      googleId: id,
      email: emails?.[0]?.value,
      name:
        `${name?.givenName || ''} ${name?.familyName || ''}`.trim() ||
        'Usuario',
      avatar: photos?.[0]?.value,
      accessToken,
    };

    done(null, user);
  }
}
