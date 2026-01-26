import { AxiosError } from 'axios';

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

/**
 * Extrae el mensaje de error de una excepción de forma type-safe.
 * Maneja errores de Axios, Error estándar, y otros tipos.
 */
export function getErrorMessage(error: unknown, fallback = 'Ha ocurrido un error'): string {
  // Axios error con respuesta del servidor
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    return data?.message || data?.error || error.message || fallback;
  }

  // Error estándar de JavaScript
  if (error instanceof Error) {
    return error.message || fallback;
  }

  // String directo
  if (typeof error === 'string') {
    return error;
  }

  // Objeto con propiedad message
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }

  return fallback;
}
