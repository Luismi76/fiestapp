import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

@Global()
@Module({})
export class SentryModule implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    const environment = this.configService.get<string>('NODE_ENV') || 'development';

    // Solo inicializar Sentry si hay DSN configurado
    if (!dsn) {
      console.log('Sentry DSN not configured, skipping initialization');
      return;
    }

    Sentry.init({
      dsn,
      environment,
      integrations: [
        nodeProfilingIntegration(),
      ],
      // Performance monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      // Profiling
      profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
      // Send errors with source maps
      attachStacktrace: true,
      // Additional context
      beforeSend(event) {
        // Filtrar información sensible
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        return event;
      },
    });

    console.log(`Sentry initialized for environment: ${environment}`);
  }
}

// Export Sentry para uso directo
export { Sentry };
