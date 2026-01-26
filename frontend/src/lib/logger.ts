/**
 * Logger condicional - Solo muestra logs en desarrollo
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (message: string, ...args: unknown[]) => {
    if (isDev) console.log(`[LOG] ${message}`, ...args);
  },

  info: (message: string, ...args: unknown[]) => {
    if (isDev) console.info(`[INFO] ${message}`, ...args);
  },

  warn: (message: string, ...args: unknown[]) => {
    if (isDev) console.warn(`[WARN] ${message}`, ...args);
  },

  error: (message: string, ...args: unknown[]) => {
    // Errores siempre se muestran, pero con formato
    if (isDev) {
      console.error(`[ERROR] ${message}`, ...args);
    }
    // En producción, aquí podrías enviar a Sentry/LogRocket
  },

  debug: (message: string, ...args: unknown[]) => {
    if (isDev) console.debug(`[DEBUG] ${message}`, ...args);
  },

  // Para socket events
  socket: (event: string, ...args: unknown[]) => {
    if (isDev) console.log(`[SOCKET] ${event}`, ...args);
  },
};

export default logger;
