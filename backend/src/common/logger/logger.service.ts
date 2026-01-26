import {
  Injectable,
  LoggerService as NestLoggerService,
  Logger,
} from '@nestjs/common';

/**
 * Servicio de logging centralizado para el backend
 * Envuelve el Logger de NestJS con funcionalidad adicional
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: Logger;
  private readonly isDevelopment: boolean;

  constructor(context?: string) {
    this.logger = new Logger(context || 'Application');
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Crea una instancia del logger con un contexto específico
   */
  static forContext(context: string): LoggerService {
    return new LoggerService(context);
  }

  log(message: string, ...optionalParams: unknown[]): void {
    this.logger.log(message, ...optionalParams);
  }

  error(message: string, trace?: string, ...optionalParams: unknown[]): void {
    this.logger.error(message, trace, ...optionalParams);
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    this.logger.warn(message, ...optionalParams);
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    if (this.isDevelopment) {
      this.logger.debug(message, ...optionalParams);
    }
  }

  verbose(message: string, ...optionalParams: unknown[]): void {
    if (this.isDevelopment) {
      this.logger.verbose(message, ...optionalParams);
    }
  }
}

/**
 * Logger global para uso en archivos sin inyección de dependencias
 * Usar LoggerService inyectado cuando sea posible
 */
export const logger = {
  log: (message: string, context?: string) => {
    const l = new Logger(context || 'Application');
    l.log(message);
  },
  error: (message: string, trace?: string, context?: string) => {
    const l = new Logger(context || 'Application');
    l.error(message, trace);
  },
  warn: (message: string, context?: string) => {
    const l = new Logger(context || 'Application');
    l.warn(message);
  },
  debug: (message: string, context?: string) => {
    if (process.env.NODE_ENV !== 'production') {
      const l = new Logger(context || 'Application');
      l.debug(message);
    }
  },
};
